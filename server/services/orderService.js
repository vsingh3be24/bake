import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Offer from '../models/Offer.js';
import Notification from '../models/Notification.js';
import { AppError } from '../utils/AppError.js';
import { generateOrderId } from '../utils/orderId.js';
import { getSettings } from './settingsService.js';
import { validateCartItems } from './cartService.js';
import { getDateAvailability, loadCartLines } from './availabilityService.js';
import { resolveCartOffers } from './offerEngine.js';

const PHONE_RE = /^[6-9]\d{9}$/;

const UNAVAILABLE_MESSAGES = {
  holiday: "We're closed that day — please pick another date",
  day_full: 'That date just got fully booked — please pick another date',
  slots_full: 'All slots for that day just got full — please pick another date',
  past_date: 'That date has already passed',
  too_far_ahead: "We can't take bookings that far in advance",
};

/**
 * Transactions need a replica set. Atlas always is one; a bare local `mongod`
 * is not. Detected once so we can pick the safe path instead of silently
 * writing non-atomically.
 */
let transactionSupport = null;
export async function supportsTransactions() {
  if (transactionSupport !== null) return transactionSupport;
  try {
    const admin = mongoose.connection.db.admin();
    const info = await admin.command({ hello: 1 });
    transactionSupport = Boolean(info.setName || info.msg === 'isdbgrid');
  } catch {
    transactionSupport = false;
  }
  return transactionSupport;
}

function assertContact(payload) {
  const name = payload.contact?.name?.trim();
  const phone = payload.contact?.phone?.trim();
  if (!name) throw new AppError('Please enter your name');
  if (!PHONE_RE.test(phone || '')) throw new AppError('Please enter a valid 10-digit phone number');
}

function assertAddress(payload, settings) {
  if (payload.deliveryType === 'pickup') {
    if (!settings.allowPickup) throw new AppError('Pickup is not available right now');
    return;
  }
  const a = payload.address || {};
  if (!a.line1?.trim()) throw new AppError('Please enter your address');
  if (!a.area?.trim()) throw new AppError('Please enter your area');
  if (!/^\d{6}$/.test(a.pincode || '')) throw new AppError('Please enter a valid 6-digit pincode');
}

function assertPayment(payload, settings) {
  const method = payload.paymentMethod;
  if (!['UPI', 'COD'].includes(method)) throw new AppError('Please choose a payment method');
  if (method === 'COD' && !settings.acceptCOD) throw new AppError('Cash on Delivery is currently unavailable');
  if (method === 'UPI' && !settings.acceptUPI) throw new AppError('UPI is currently unavailable');
  if (method === 'UPI' && payload.upiRefNumber && !/^\d{12}$/.test(payload.upiRefNumber.trim())) {
    throw new AppError('The UTR should be 12 digits — please check and try again');
  }
}

/** Every rupee is recomputed here from server data; nothing is trusted from the client. */
function computeTotals({ itemsTotal, offerDiscount, freeByOffer, settings, rushCharge, deliveryType }) {
  const afterDiscount = Math.max(itemsTotal - offerDiscount, 0);

  let deliveryCharge = 0;
  if (deliveryType !== 'pickup') {
    const freeByThreshold = itemsTotal >= settings.freeDeliveryAbove;
    deliveryCharge = freeByOffer || freeByThreshold ? 0 : settings.deliveryCharge;
  }

  const packagingCharge = settings.packagingCharge || 0;
  const grandTotal = afterDiscount + deliveryCharge + packagingCharge + (rushCharge || 0);

  return { deliveryCharge, packagingCharge, grandTotal };
}

/**
 * Decrement stock with a guarded conditional update. The `stockCount >= qty`
 * filter is what actually prevents overselling under concurrency — two racing
 * checkouts for the last unit can't both match. The transaction gives
 * all-or-nothing across documents; this guard gives correctness per document.
 */
async function decrementStock(lines, session) {
  for (const line of lines) {
    if (line.stockMode === 'counted') {
      const res = await Product.updateOne(
        { _id: line.productId, stockCount: { $gte: line.qty } },
        { $inc: { stockCount: -line.qty, soldCount: line.qty } },
        session ? { session } : {}
      );
      if (res.modifiedCount === 0) {
        throw new AppError(`${line.name} just sold out — please update your cart`);
      }
    } else {
      await Product.updateOne(
        { _id: line.productId },
        { $inc: { soldCount: line.qty } },
        session ? { session } : {}
      );
    }
  }
}

/**
 * After a sale commits, flip any counted item that has now hit zero to
 * out-of-stock. The order decrement uses `updateOne` (for the concurrency
 * guard), which by design does NOT fire the model's findOneAndUpdate
 * auto-out-of-stock hook — so the flag would otherwise stay `inStock: true`
 * on a shelf-empty item. Runs post-commit and is idempotent: the guarded
 * filter only matches on the true→false transition, so no duplicate
 * notifications even if called twice.
 */
async function syncSoldOutFlags(lines) {
  for (const line of lines) {
    if (line.stockMode !== 'counted') continue;
    const flipped = await Product.findOneAndUpdate(
      { _id: line.productId, stockMode: 'counted', autoOutOfStock: true, inStock: true, stockCount: { $lte: 0 } },
      { $set: { inStock: false } }
    );
    if (flipped) {
      await Notification.create({
        forRole: 'owner',
        type: 'low_stock',
        title: `${flipped.name} is out of stock`,
        body: 'Update the stock',
        link: `/owner/stock`,
        product: flipped._id,
      });
    }
  }
}

/** Undo stock movement when a non-transactional run fails partway. */
async function restoreStock(lines) {
  for (const line of lines) {
    if (line.stockMode === 'counted') {
      await Product.updateOne(
        { _id: line.productId },
        { $inc: { stockCount: line.qty, soldCount: -line.qty } }
      );
    } else {
      await Product.updateOne({ _id: line.productId }, { $inc: { soldCount: -line.qty } });
    }
  }
}

/**
 * Links the order to a Customer record for history/stats.
 *
 * A logged-in customer's order always belongs to THEIR account — the
 * `contact` block on an order is the delivery recipient, which may
 * legitimately differ (ordering as a gift, a different number for the
 * delivery guy to call). Only guest checkout falls back to matching/creating
 * a Customer by the phone typed into that contact field.
 */
async function upsertCustomer(payload, grandTotal, session, authCustomerId) {
  const opts = session
    ? { session, new: true, upsert: true, setDefaultsOnInsert: true }
    : { new: true, upsert: true, setDefaultsOnInsert: true };

  if (authCustomerId) {
    const existing = await Customer.findById(authCustomerId).session(session || null);
    if (!existing) throw new AppError('Account not found — please log in again');
    if (existing.isBlocked) {
      throw new AppError(existing.blockReason || 'Your account has been blocked');
    }
    const totalOrders = existing.totalOrders + 1;
    const totalSpent = existing.totalSpent + grandTotal;
    return Customer.findByIdAndUpdate(
      authCustomerId,
      {
        $set: {
          lastOrderAt: new Date(),
          totalOrders,
          totalSpent,
          avgOrderValue: Math.round(totalSpent / totalOrders),
        },
      },
      opts
    );
  }

  const phone = payload.contact.phone.trim();
  const existing = await Customer.findOne({ phone }).session(session || null);

  if (existing?.isBlocked) {
    throw new AppError(existing.blockReason || "We can't accept orders from this number — please call us");
  }
  // A guest checkout should never silently overwrite a real account's name.
  if (existing?.passwordHash) {
    throw new AppError('An account already exists for this number — please log in to order');
  }

  const totalOrders = (existing?.totalOrders || 0) + 1;
  const totalSpent = (existing?.totalSpent || 0) + grandTotal;

  return Customer.findOneAndUpdate(
    { phone },
    {
      $set: {
        name: payload.contact.name.trim(),
        lastOrderAt: new Date(),
        totalOrders,
        totalSpent,
        avgOrderValue: Math.round(totalSpent / totalOrders),
      },
      $setOnInsert: { isGuest: true },
    },
    opts
  );
}

export async function placeOrder(payload, authCustomerId = null, opts = {}) {
  const { source = 'web', skipShopOpenCheck = false } = opts;
  const settings = await getSettings();

  // Manual phone/WhatsApp entry (Part D.3) still goes through this whole
  // pipeline — same validation, same atomic stock decrement — it just isn't
  // blocked by the customer-facing "shop closed" gate.
  if (!skipShopOpenCheck && !settings.shopOpen) {
    throw new AppError(settings.closedMessage || 'We are not accepting orders right now');
  }

  assertContact(payload);
  assertAddress(payload, settings);
  assertPayment(payload, settings);

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new AppError('Your cart is empty');
  }

  // Re-validate against live product data. If anything drifted since the cart
  // page we stop rather than silently charging a different amount.
  const validation = await validateCartItems(payload.items);
  if (validation.hasIssues) {
    const unavailable = validation.items.find((i) => !i.valid);
    const adjusted = validation.items.find((i) => i.qtyAdjusted);
    throw new AppError(
      unavailable?.message ||
        (adjusted?.adjustMessage && `${adjusted.adjustMessage} — please update your cart`) ||
        'Something in your cart has changed — please check and try again'
    );
  }
  const lines = validation.items;
  const itemsTotal = validation.itemsTotal;

  if (settings.minOrderValue && itemsTotal < settings.minOrderValue) {
    throw new AppError(`Minimum order must be ₹${settings.minOrderValue}`);
  }

  // Capacity re-check at the moment of purchase, not just when browsing.
  const cartLines = await loadCartLines(payload.items);
  const availability = await getDateAvailability(payload.deliveryDate, settings, cartLines);
  if (!availability.available) {
    // Name the actual blocking item when we know it, rather than blaming the date.
    const blocked = availability.blockedItems?.[0]?.message;
    throw new AppError(
      blocked ||
        UNAVAILABLE_MESSAGES[availability.reason] ||
        'That date just got fully booked — please pick another date'
    );
  }
  const slot = availability.slots.find((s) => s.name === payload.deliverySlot);
  if (!slot) throw new AppError('Please choose a delivery slot');
  if (slot.isFull) throw new AppError('That slot just got full — please pick another slot');

  // Full stacking engine — auto-apply offers plus the optional code, gated by
  // usage/first-order/per-customer limits, all recomputed server-side.
  const offerOutcome = await resolveCartOffers({
    items: lines,
    itemsTotal,
    offerCode: payload.offerCode,
    customerId: authCustomerId,
    phone: payload.contact.phone.trim(),
    freeDeliveryValue: payload.deliveryType === 'pickup' ? 0 : settings.deliveryCharge,
  });
  // A code the customer explicitly typed that couldn't apply is worth failing
  // loudly on — they expect it to work. Auto-apply offers just silently don't.
  if (payload.offerCode && offerOutcome.codeRejected) {
    throw new AppError(offerOutcome.codeRejected);
  }

  const rushCharge = 0; // rush ordering is a later feature; never trusted from client
  const { deliveryCharge, packagingCharge, grandTotal } = computeTotals({
    itemsTotal,
    offerDiscount: offerOutcome.totalDiscount,
    freeByOffer: offerOutcome.freeDelivery,
    settings,
    rushCharge,
    deliveryType: payload.deliveryType,
  });

  const maxPrep = cartLines.length
    ? Math.max(...cartLines.map((l) => l.product.prepTimeHours ?? settings.minPrepHours))
    : settings.minPrepHours;

  const orderId = await generateOrderId();

  const orderDoc = {
    orderId,
    contact: {
      name: payload.contact.name.trim(),
      phone: payload.contact.phone.trim(),
      altPhone: payload.contact.altPhone?.trim() || '',
    },
    address:
      payload.deliveryType === 'pickup'
        ? { line1: 'Pickup', area: 'Pickup', pincode: '000000' }
        : {
            line1: payload.address.line1.trim(),
            landmark: payload.address.landmark?.trim() || '',
            area: payload.address.area.trim(),
            pincode: payload.address.pincode.trim(),
          },
    items: lines.map((l) => ({
      product: l.productId,
      nameSnapshot: l.name,
      variantLabel: l.variantLabel,
      priceSnapshot: l.effectivePrice,
      qty: l.qty,
      subtotal: l.subtotal,
      itemNote: payload.items.find((i) => String(i.productId) === String(l.productId))?.itemNote || '',
    })),
    itemsTotal,
    offerApplied: offerOutcome.primary
      ? {
          offerId: offerOutcome.primary.offerId,
          code: offerOutcome.primary.code,
          title: offerOutcome.primary.title,
          discountAmount: offerOutcome.totalDiscount,
        }
      : undefined,
    offersApplied: offerOutcome.appliedOffers,
    loyaltyPointsUsed: 0,
    loyaltyDiscount: 0,
    deliveryCharge,
    rushCharge,
    packagingCharge,
    grandTotal,
    paymentMethod: payload.paymentMethod,
    paymentStatus: 'pending',
    upiRefNumber: payload.upiRefNumber?.trim() || '',
    // Screenshot is uploaded via its own endpoint first; this order only ever
    // stores the resulting Cloudinary URL, never a raw file.
    paymentScreenshot: /^https:\/\//.test(payload.paymentScreenshot || '') ? payload.paymentScreenshot : '',
    orderStatus: 'placed',
    statusHistory: [{ status: 'placed', at: new Date(), by: source === 'phone' ? 'owner' : 'customer', note: '' }],
    estimatedReadyAt: new Date(Date.now() + maxPrep * 3_600_000),
    deliveryDate: payload.deliveryDate,
    deliverySlot: payload.deliverySlot,
    deliveryType: payload.deliveryType || 'delivery',
    specialNote: payload.specialNote?.trim() || '',
    isGift: Boolean(payload.isGift),
    giftMessage: payload.giftMessage?.trim() || '',
    cakeMessage: payload.cakeMessage?.trim() || '',
    source,
  };

  const notification = {
    forRole: 'owner',
    type: 'new_order',
    title: `New order — ${orderId}`,
    body: `${orderDoc.contact.name} • ₹${grandTotal} • ${payload.paymentMethod}`,
    link: `/owner/orders`,
  };

  const canUseTransaction = await supportsTransactions();

  if (canUseTransaction) {
    const session = await mongoose.startSession();
    try {
      let created;
      await session.withTransaction(async () => {
        await decrementStock(lines, session);
        const customer = await upsertCustomer(payload, grandTotal, session, authCustomerId);
        const [order] = await Order.create([{ ...orderDoc, customer: customer?._id || null }], { session });
        await Notification.create([{ ...notification, link: `/owner/orders/${order._id}` }], { session });
        // Every applied offer's global counter ticks — inside the transaction
        // so a rolled-back order never leaks a phantom redemption.
        for (const applied of offerOutcome.appliedOffers) {
          await Offer.updateOne({ _id: applied.offerId }, { $inc: { usedCount: 1 } }, { session });
        }
        created = order;
      });
      // Post-commit and non-fatal: the order is already safely placed, so a
      // hiccup flipping a display flag must never surface as an order failure.
      try {
        await syncSoldOutFlags(lines);
      } catch (err) {
        console.error('syncSoldOutFlags failed after order', created?.orderId, err);
      }
      return created;
    } finally {
      await session.endSession();
    }
  }

  // No replica set (bare local mongod): stock is still protected from oversell
  // by the guarded update above, and we compensate by hand if a later step fails.
  await decrementStock(lines, null);
  try {
    const customer = await upsertCustomer(payload, grandTotal, null, authCustomerId);
    const order = await Order.create({ ...orderDoc, customer: customer?._id || null });
    await Notification.create({ ...notification, link: `/owner/orders/${order._id}` });
    for (const applied of offerOutcome.appliedOffers) {
      await Offer.updateOne({ _id: applied.offerId }, { $inc: { usedCount: 1 } });
    }
    try {
      await syncSoldOutFlags(lines);
    } catch (err) {
      console.error('syncSoldOutFlags failed after order', order.orderId, err);
    }
    return order;
  } catch (err) {
    await restoreStock(lines);
    throw err;
  }
}

/** Public tracking — deliberately returns only what a link-holder should see. */
export async function getOrderForTracking(orderId) {
  const order = await Order.findOne({ orderId: orderId.trim().toUpperCase() }).select(
    'orderId orderStatus statusHistory deliveryDate deliverySlot deliveryType grandTotal paymentMethod paymentStatus items contact.name estimatedReadyAt createdAt'
  );
  if (!order) throw new AppError('Order not found — please check the order ID and try again', 404);
  return order;
}

const FORWARD_STATUSES = ['placed', 'confirmed', 'in_queue', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
const TERMINAL_STATUSES = ['delivered', 'cancelled', 'rejected'];

export async function updateOrderStatus(orderId, status, by = 'owner', note = '') {
  if (!FORWARD_STATUSES.includes(status)) throw new AppError('That is not a valid order status');

  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);
  if (TERMINAL_STATUSES.includes(order.orderStatus)) {
    throw new AppError(`This order is already ${order.orderStatus} and can't be moved`);
  }

  order.orderStatus = status;
  if (status === 'ready') order.actualReadyAt = new Date();
  order.statusHistory.push({ status, at: new Date(), by, note: note?.trim() || '' });
  await order.save();

  if (order.customer) {
    await Notification.create({
      forRole: 'customer',
      customer: order.customer,
      type: 'status_change',
      title: `Order ${order.orderId} is now ${status.replace(/_/g, ' ')}`,
      link: `/me/orders/${order._id}`,
    });
  }

  return order;
}

export async function updateOrderPayment(orderId, { paymentStatus, verifiedBy }) {
  if (!['pending', 'paid', 'failed', 'refunded'].includes(paymentStatus)) {
    throw new AppError('That is not a valid payment status');
  }

  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);

  order.paymentStatus = paymentStatus;
  if (paymentStatus === 'paid') {
    order.paidAt = new Date();
    order.verifiedBy = verifiedBy?.trim() || 'owner';
  }
  await order.save();
  return order;
}

export async function updateOrderNote(orderId, note) {
  const order = await Order.findByIdAndUpdate(
    orderId,
    { ownerNotes: note?.trim() || '' },
    { new: true }
  );
  if (!order) throw new AppError('Order not found', 404);
  return order;
}

/** Manual drag-reorder within a kanban column — a bare position number, nothing else changes. */
export async function updateOrderPriority(orderId, queuePriority) {
  const priority = Number(queuePriority);
  if (!Number.isFinite(priority)) throw new AppError('Priority must be a number');

  const order = await Order.findByIdAndUpdate(orderId, { queuePriority: priority }, { new: true });
  if (!order) throw new AppError('Order not found', 404);
  return order;
}

/**
 * Restores stock by the product's *current* stockMode rather than whatever
 * it was at order time — stock mode changes are a rare admin action, and
 * re-deriving the original mode isn't worth the snapshot.
 */
async function restoreOrderStock(order) {
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product) continue;
    if (product.stockMode === 'counted') {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { stockCount: item.qty, soldCount: -item.qty } }
      );
    } else {
      await Product.updateOne({ _id: item.product }, { $inc: { soldCount: -item.qty } });
    }
  }
}

export async function cancelOrder(orderId, { reason, by = 'owner' } = {}) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);
  if (TERMINAL_STATUSES.includes(order.orderStatus)) {
    throw new AppError(`This order is already ${order.orderStatus}`);
  }

  await restoreOrderStock(order);

  order.orderStatus = 'cancelled';
  order.cancelReason = reason?.trim() || '';
  order.cancelledBy = by;
  order.statusHistory.push({ status: 'cancelled', at: new Date(), by, note: reason?.trim() || '' });
  await order.save();

  if (order.customer) {
    await Notification.create({
      forRole: 'customer',
      customer: order.customer,
      type: 'status_change',
      title: `Order ${order.orderId} was cancelled`,
      body: order.cancelReason,
      link: `/me/orders/${order._id}`,
    });
  }

  return order;
}

/**
 * "Reject" is distinct from "Cancel": it's the [Accept]/[Reject] choice on a
 * brand-new order the owner hasn't confirmed yet, not a mid-fulfillment
 * cancellation. Kept as its own status so the two show up differently in
 * reporting later, even though the stock-restore mechanics are identical.
 */
export async function rejectOrder(orderId, { reason, by = 'owner' } = {}) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);
  if (order.orderStatus !== 'placed') {
    throw new AppError('Only a brand-new order can be rejected — use Cancel instead');
  }

  await restoreOrderStock(order);

  order.orderStatus = 'rejected';
  order.cancelReason = reason?.trim() || '';
  order.cancelledBy = by;
  order.statusHistory.push({ status: 'rejected', at: new Date(), by, note: reason?.trim() || '' });
  await order.save();

  if (order.customer) {
    await Notification.create({
      forRole: 'customer',
      customer: order.customer,
      type: 'status_change',
      title: `Order ${order.orderId} was declined`,
      body: order.cancelReason,
      link: `/me/orders/${order._id}`,
    });
  }

  return order;
}
