import Order from '../models/Order.js';
import { AppError } from '../utils/AppError.js';
import { shopToday, normalizeDay, addDays } from '../utils/shopTime.js';

const NOT_COUNTED = ['cancelled', 'rejected'];
// The kitchen's working set — once an order leaves for delivery/pickup it's
// off the owner's daily prep board, whatever its delivery status becomes next.
const QUEUE_STATUSES = ['placed', 'confirmed', 'in_queue', 'preparing', 'ready'];

const KITCHEN_STAGE = {
  placed: 'queued',
  confirmed: 'queued',
  in_queue: 'queued',
  preparing: 'prep',
  ready: 'ready',
};

function summarizeItems(items) {
  return items.map((i) => `${i.qty}× ${i.nameSnapshot}`).join(', ');
}

function toBoardOrder(order) {
  return {
    _id: order._id,
    orderId: order.orderId,
    contact: { name: order.contact.name, phone: order.contact.phone },
    itemsSummary: summarizeItems(order.items),
    orderStatus: order.orderStatus,
    kitchenStage: KITCHEN_STAGE[order.orderStatus] || 'queued',
    estimatedReadyAt: order.estimatedReadyAt,
    queuePriority: order.queuePriority,
    deliveryType: order.deliveryType,
    isGift: order.isGift,
    cakeMessage: order.cakeMessage,
    specialNote: order.specialNote,
    createdAt: order.createdAt,
  };
}

/** Lightweight {date, booked, capacity} rows for the multi-day load strip. */
async function loadStrip(fromDay, count, dailyOrderCapacity) {
  const to = addDays(fromDay, count - 1);
  const rows = await Order.aggregate([
    { $match: { deliveryDate: { $gte: fromDay, $lte: to }, orderStatus: { $nin: NOT_COUNTED } } },
    { $group: { _id: '$deliveryDate', booked: { $sum: 1 } } },
  ]);
  const byDay = new Map(rows.map((r) => [r._id.getTime(), r.booked]));

  const strip = [];
  for (let i = 0; i < count; i += 1) {
    const day = addDays(fromDay, i);
    strip.push({ date: day, booked: byDay.get(day.getTime()) || 0, capacity: dailyOrderCapacity });
  }
  return strip;
}

/**
 * The Kitchen Queue Board (Part D.5): one day's orders split into delivery
 * slots, sorted for the owner's actual working order, plus a short look-ahead
 * so tomorrow's load is visible without a second screen.
 */
export async function getQueueBoard(dateInput, settings, now = new Date()) {
  const day = dateInput ? normalizeDay(dateInput) : shopToday(now);
  if (!day) throw new AppError('Date is not in a valid format');

  // Load bar counts every order that consumed a slot that day (matches the
  // day_full definition used everywhere else) — a wider set than the cards
  // actually shown below, which are just the ones still needing kitchen action.
  const [totalBooked, slotCounts, orders] = await Promise.all([
    Order.countDocuments({ deliveryDate: day, orderStatus: { $nin: NOT_COUNTED } }),
    Order.aggregate([
      { $match: { deliveryDate: day, orderStatus: { $nin: NOT_COUNTED } } },
      { $group: { _id: '$deliverySlot', count: { $sum: 1 } } },
    ]),
    Order.find({ deliveryDate: day, orderStatus: { $in: QUEUE_STATUSES } }).sort({
      queuePriority: 1,
      estimatedReadyAt: 1,
      createdAt: 1,
    }),
  ]);
  const bookedBySlot = new Map(slotCounts.map((r) => [r._id, r.count]));

  const activeSlots = (settings.slots || []).filter((s) => s.isActive);
  const bySlotName = new Map(activeSlots.map((s) => [s.name, []]));
  for (const order of orders) {
    const bucket = bySlotName.get(order.deliverySlot);
    if (bucket) bucket.push(toBoardOrder(order));
    // An order whose slot was later deactivated in Settings still shows
    // nowhere silently lost — fall back to its own slot as a one-off bucket.
    else bySlotName.set(order.deliverySlot, [toBoardOrder(order)]);
  }

  const slots = [...bySlotName.entries()].map(([name, slotOrders]) => {
    const known = activeSlots.find((s) => s.name === name);
    return {
      name,
      timeRange: known?.timeRange || '',
      capacity: known?.capacity ?? null,
      // Every order that consumed this slot today, not just the ones still
      // on the board — a delivered order still counted against capacity.
      booked: bookedBySlot.get(name) || slotOrders.length,
      orders: slotOrders,
    };
  });

  const lookahead = await loadStrip(addDays(day, 1), 3, settings.dailyOrderCapacity);

  return {
    date: day,
    dailyOrderCapacity: settings.dailyOrderCapacity,
    totalBooked,
    slots,
    lookahead,
  };
}
