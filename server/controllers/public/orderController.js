import { placeOrder, getOrderForTracking } from '../../services/orderService.js';

export async function createOrder(req, res) {
  const order = await placeOrder(req.body, req.customer?._id || null);
  const offerDiscount = (order.offersApplied || []).reduce((s, o) => s + o.discountAmount, 0);
  res.status(201).json({
    orderId: order.orderId,
    itemsTotal: order.itemsTotal,
    offerDiscount,
    offersApplied: (order.offersApplied || []).map((o) => ({ title: o.title, discountAmount: o.discountAmount })),
    deliveryCharge: order.deliveryCharge,
    packagingCharge: order.packagingCharge,
    grandTotal: order.grandTotal,
    deliveryDate: order.deliveryDate,
    deliverySlot: order.deliverySlot,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    items: order.items.map((i) => ({ name: i.nameSnapshot, qty: i.qty, variantLabel: i.variantLabel })),
    // Only present for a guest checkout — lets the success page offer to
    // turn this into an account without asking for the phone number again.
    guestPhone: req.customer ? null : order.contact.phone,
  });
}

export async function trackOrder(req, res) {
  const order = await getOrderForTracking(req.params.orderId);
  res.json(order);
}
