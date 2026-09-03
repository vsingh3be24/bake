import Order from '../../models/Order.js';
import { AppError } from '../../utils/AppError.js';
import { escapeRegex } from '../../utils/regex.js';
import * as orderService from '../../services/orderService.js';

function buildFilter(query) {
  const filter = {};

  if (query.status) {
    filter.orderStatus = query.status === 'cancelled' ? { $in: ['cancelled', 'rejected'] } : query.status;
  }
  if (query.payment) filter.paymentMethod = query.payment;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.from || query.to) {
    filter.deliveryDate = {};
    if (query.from) filter.deliveryDate.$gte = new Date(query.from);
    if (query.to) filter.deliveryDate.$lte = new Date(query.to);
  }
  if (query.slot) filter.deliverySlot = query.slot;
  if (query.q?.trim()) {
    const re = new RegExp(escapeRegex(query.q.trim()), 'i');
    filter.$or = [{ orderId: re }, { 'contact.name': re }, { 'contact.phone': re }];
  }

  return filter;
}

export async function listOrders(req, res) {
  const filter = buildFilter(req.query);
  const orders = await Order.find(filter).sort({ queuePriority: 1, createdAt: -1 }).limit(300);
  res.json(orders);
}

export async function getOrder(req, res) {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'totalOrders totalSpent')
    .populate('items.product', 'images');
  if (!order) throw new AppError('Order not found', 404);
  res.json(order);
}

export async function updateStatus(req, res) {
  const order = await orderService.updateOrderStatus(req.params.id, req.body.status, 'owner', req.body.note);
  res.json(order);
}

export async function updatePayment(req, res) {
  const order = await orderService.updateOrderPayment(req.params.id, req.body);
  res.json(order);
}

export async function updatePriority(req, res) {
  const order = await orderService.updateOrderPriority(req.params.id, req.body.queuePriority);
  res.json(order);
}

export async function updateNote(req, res) {
  const order = await orderService.updateOrderNote(req.params.id, req.body.note);
  res.json(order);
}

export async function cancelOrder(req, res) {
  const order = await orderService.cancelOrder(req.params.id, { reason: req.body.reason, by: 'owner' });
  res.json(order);
}

export async function rejectOrder(req, res) {
  const order = await orderService.rejectOrder(req.params.id, { reason: req.body.reason, by: 'owner' });
  res.json(order);
}

export async function manualOrder(req, res) {
  const order = await orderService.placeOrder(req.body, req.body.customerId || null, {
    source: 'phone',
    skipShopOpenCheck: true,
  });
  res.status(201).json(order);
}
