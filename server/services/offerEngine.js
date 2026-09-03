import Offer from '../models/Offer.js';
import Order from '../models/Order.js';
import { isOfferCurrentlyActive, computeOfferDiscount } from './offerService.js';

const NOT_TERMINAL = { orderStatus: { $nin: ['cancelled', 'rejected'] } };

/** Who to match an order against — the logged-in account and/or a contact phone. */
function whoClauses({ customerId, phone }) {
  const who = [];
  if (customerId) who.push({ customer: customerId });
  if (phone) who.push({ 'contact.phone': phone });
  return who;
}

async function hasNoPriorOrders({ customerId, phone }) {
  const who = whoClauses({ customerId, phone });
  if (who.length === 0) return true; // brand-new guest with no identity yet
  const count = await Order.countDocuments({ $or: who, ...NOT_TERMINAL });
  return count === 0;
}

async function customerOfferUsage(offerId, { customerId, phone }) {
  const who = whoClauses({ customerId, phone });
  if (who.length === 0) return 0;
  return Order.countDocuments({
    $and: [
      { $or: who },
      // Match both the new stacked array and the legacy single-offer field.
      { $or: [{ 'offersApplied.offerId': offerId }, { 'offerApplied.offerId': offerId }] },
      NOT_TERMINAL,
    ],
  });
}

/**
 * Can this offer apply to this cart+customer right now? Returns the computed
 * benefit when yes, or a reason when no (surfaced only for an explicit code).
 */
async function gateOffer(offer, { items, itemsTotal, firstOrder, customerId, phone, now, freeDeliveryValue }) {
  if (!isOfferCurrentlyActive(offer, now)) {
    return { ok: false, message: 'This offer is not active right now' };
  }
  if (offer.usageLimit != null && offer.usedCount >= offer.usageLimit) {
    return { ok: false, message: 'This offer has reached its usage limit' };
  }
  if (offer.firstOrderOnly && !firstOrder) {
    return { ok: false, message: 'This offer is only for your first order' };
  }
  if (offer.perCustomerLimit != null && offer.perCustomerLimit > 0) {
    const used = await customerOfferUsage(offer._id, { customerId, phone });
    if (used >= offer.perCustomerLimit) {
      return { ok: false, message: "You've already used this offer" };
    }
  }

  const result = computeOfferDiscount(offer, items, itemsTotal);
  if (!result.valid) return { ok: false, message: result.message };

  // Ranking value: rupee discount plus the delivery saved by a free-delivery offer.
  const benefitValue = result.discountAmount + (result.freeDelivery ? freeDeliveryValue : 0);
  return {
    ok: true,
    benefit: { discountAmount: result.discountAmount, freeDelivery: result.freeDelivery, benefitValue },
  };
}

/**
 * Choose the winning combination. A non-stackable offer applies alone; any
 * number of stackable offers combine. When plans compete we pick by priority
 * (Part B.2: "clash ho to zyada priority wala"), breaking ties by best value.
 * An explicitly-entered code anchors the plan — the winner must include it.
 */
function selectPlan(eligible, { codeOfferId }) {
  const stackables = eligible.filter((e) => e.offer.isStackable);
  const exclusives = eligible.filter((e) => !e.offer.isStackable);

  const plans = [];
  if (stackables.length > 0) {
    plans.push({
      members: stackables,
      priority: Math.max(...stackables.map((e) => e.offer.priority || 0)),
      benefit: stackables.reduce((s, e) => s + e.benefitValue, 0),
    });
  }
  for (const ex of exclusives) {
    plans.push({ members: [ex], priority: ex.offer.priority || 0, benefit: ex.benefitValue });
  }

  let usable = plans;
  if (codeOfferId) {
    // Honor the customer's chosen code: only plans that include it are valid.
    usable = plans.filter((p) => p.members.some((m) => String(m.offer._id) === codeOfferId));
  }

  usable.sort((a, b) => b.priority - a.priority || b.benefit - a.benefit);
  return usable[0] || { members: [] };
}

/**
 * The one entry point both checkout and the cart-preview use. Fetches all
 * auto-apply offers plus the optional code, gates each, then stacks. Returns a
 * flat, serializable breakdown — the caller never re-derives offer maths.
 */
export async function resolveCartOffers({
  items,
  itemsTotal,
  offerCode = null,
  customerId = null,
  phone = null,
  freeDeliveryValue = 0,
  now = new Date(),
}) {
  const autoOffers = await Offer.find({ isActive: true, isAutoApply: true });

  const trimmedCode = offerCode?.trim().toUpperCase() || null;
  let codeOfferId = null;
  let codeRejected = null;

  const candidates = [...autoOffers];
  if (trimmedCode) {
    const codeOffer = await Offer.findOne({ code: trimmedCode });
    if (!codeOffer || !isOfferCurrentlyActive(codeOffer, now)) {
      codeRejected = 'This offer code is not valid';
    } else {
      codeOfferId = String(codeOffer._id);
      if (!candidates.some((o) => String(o._id) === codeOfferId)) candidates.push(codeOffer);
    }
  }

  const firstOrder = await hasNoPriorOrders({ customerId, phone });

  const eligible = [];
  for (const offer of candidates) {
    const isCode = String(offer._id) === codeOfferId;
    const gate = await gateOffer(offer, {
      items,
      itemsTotal,
      firstOrder,
      customerId,
      phone,
      now,
      freeDeliveryValue,
    });
    if (!gate.ok) {
      if (isCode) codeRejected = gate.message;
      continue;
    }
    eligible.push({ offer, ...gate.benefit });
  }

  const plan = selectPlan(eligible, { codeOfferId });

  // A valid code that got out-competed (e.g. a higher-priority exclusive auto
  // offer won) should say so rather than silently vanish.
  if (codeOfferId && !codeRejected && !plan.members.some((m) => String(m.offer._id) === codeOfferId)) {
    codeRejected = 'A better offer is already applied to your cart';
  }

  const appliedOffers = plan.members.map((e) => ({
    offerId: e.offer._id,
    code: e.offer.code || null,
    title: e.offer.title,
    type: e.offer.type,
    discountAmount: e.discountAmount,
    freeDelivery: e.freeDelivery,
  }));

  // Never discount more than the goods are worth.
  const rawDiscount = appliedOffers.reduce((s, o) => s + o.discountAmount, 0);
  const totalDiscount = Math.min(rawDiscount, itemsTotal);
  const freeDelivery = appliedOffers.some((o) => o.freeDelivery);

  // Primary = biggest rupee discount (fallback to the first), for the legacy
  // single-offer field and any UI that shows just one code.
  const primary =
    [...appliedOffers].sort((a, b) => b.discountAmount - a.discountAmount)[0] || null;

  return { appliedOffers, totalDiscount, freeDelivery, primary, codeRejected };
}
