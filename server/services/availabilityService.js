import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { AppError } from '../utils/AppError.js';
import {
  shopToday,
  normalizeDay,
  addDays,
  dayOfWeek,
  daysBetween,
  shopMinutesNow,
  parseHHMM,
} from '../utils/shopTime.js';

// Orders in these states free up their capacity again.
const NOT_COUNTED = ['cancelled', 'rejected'];

export function isAfterCutoff(settings, now = new Date()) {
  const cutoff = parseHHMM(settings.autoCloseTime);
  if (cutoff == null) return false;
  return shopMinutesNow(now) >= cutoff;
}

export function isHoliday(day, settings) {
  return (settings.holidays || []).some((h) => {
    const normalized = normalizeDay(h);
    return normalized && normalized.getTime() === day.getTime();
  });
}

/** Products that simply aren't made on this weekday. */
function productsUnavailableOnDay(day, products) {
  const dow = dayOfWeek(day);
  return products.filter((p) => {
    const days = p.availableDays;
    // Empty/missing means "every day" rather than "never".
    if (!Array.isArray(days) || days.length === 0) return false;
    return !days.includes(dow);
  });
}

/** Booked units per product for one delivery day. */
async function getBookedQtyByProduct(day) {
  const rows = await Order.aggregate([
    { $match: { deliveryDate: day, orderStatus: { $nin: NOT_COUNTED } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.product', qty: { $sum: '$items.qty' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.qty]));
}

/**
 * Check 3 from the spec — per-product daily capacity. A product in
 * `daily_capacity` mode can only be baked N times a day no matter how many
 * separate orders ask for it, so this has to look across ALL orders for that
 * day, not just the current cart.
 */
function findCapacityBlockers(cartLines, bookedByProduct) {
  const blockers = [];
  for (const { product, qty } of cartLines) {
    if (product.stockMode !== 'daily_capacity') continue;
    const capacity = product.dailyCapacity || 0;
    const booked = bookedByProduct.get(String(product._id)) || 0;
    const left = capacity - booked;
    if (qty > left) {
      blockers.push({
        productId: String(product._id),
        name: product.name,
        requested: qty,
        left: Math.max(left, 0),
        message:
          left <= 0
            ? `${product.name} is fully booked for that day`
            : `Only ${left} more of ${product.name} can be made that day`,
      });
    }
  }
  return blockers;
}

/** Resolve [{ productId, qty }] into loaded products, ignoring unknown ids. */
export async function loadCartLines(items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const ids = [...new Set(items.map((i) => i.productId).filter(Boolean))];
  if (ids.length === 0) return [];

  const products = await Product.find({ _id: { $in: ids } });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = [];
  for (const item of items) {
    const product = byId.get(String(item.productId));
    if (!product) continue;
    lines.push({ product, qty: Number(item.qty) || product.minQty || 1 });
  }
  return lines;
}

/**
 * Availability for a single delivery day, in the order the spec lays out:
 * holiday -> bookable window -> product weekday -> whole-day cap ->
 * slot caps -> per-product daily capacity.
 */
export async function getDateAvailability(dateInput, settings, cartLines = [], now = new Date()) {
  const day = normalizeDay(dateInput);
  if (!day) throw new AppError('Date is not in a valid format');

  const today = shopToday(now);
  const offset = daysBetween(today, day);

  if (offset < 0) return { date: day, available: false, reason: 'past_date', slots: [] };
  if (offset > settings.maxAdvanceDays) {
    return { date: day, available: false, reason: 'too_far_ahead', slots: [] };
  }
  if (isHoliday(day, settings)) return { date: day, available: false, reason: 'holiday', slots: [] };

  const unavailableProducts = productsUnavailableOnDay(day, cartLines.map((l) => l.product));
  if (unavailableProducts.length > 0) {
    return {
      date: day,
      available: false,
      reason: 'product_unavailable_on_day',
      slots: [],
      blockedItems: unavailableProducts.map((p) => ({
        productId: String(p._id),
        name: p.name,
        message: `${p.name} is not made on that day`,
      })),
    };
  }

  const dayOrders = await Order.countDocuments({
    deliveryDate: day,
    orderStatus: { $nin: NOT_COUNTED },
  });
  if (dayOrders >= settings.dailyOrderCapacity) {
    return { date: day, available: false, reason: 'day_full', slots: [] };
  }

  const activeSlots = (settings.slots || []).filter((s) => s.isActive);
  const slotCounts = await Order.aggregate([
    { $match: { deliveryDate: day, orderStatus: { $nin: NOT_COUNTED } } },
    { $group: { _id: '$deliverySlot', count: { $sum: 1 } } },
  ]);
  const usedBySlot = new Map(slotCounts.map((r) => [r._id, r.count]));

  const slots = activeSlots.map((s) => {
    const used = usedBySlot.get(s.name) || 0;
    return {
      name: s.name,
      timeRange: s.timeRange,
      capacity: s.capacity,
      used,
      left: Math.max(s.capacity - used, 0),
      isFull: used >= s.capacity,
    };
  });

  if (slots.length === 0 || slots.every((s) => s.isFull)) {
    return { date: day, available: false, reason: 'slots_full', slots };
  }

  if (cartLines.length > 0) {
    const bookedByProduct = await getBookedQtyByProduct(day);
    const blockers = findCapacityBlockers(cartLines, bookedByProduct);
    if (blockers.length > 0) {
      return { date: day, available: false, reason: 'product_capacity_full', slots, blockedItems: blockers };
    }
  }

  return { date: day, available: true, reason: null, slots };
}

/**
 * Earliest date the cart can actually be delivered (spec D.5): longest prep
 * time in the cart, pushed a day if ordered after cutoff, then forward past
 * any day that is a holiday, closed to one of these products, or full.
 */
export async function getEarliestDeliveryDate(cartLines, settings, now = new Date()) {
  const prepHours = cartLines.length
    ? Math.max(...cartLines.map((l) => l.product.prepTimeHours ?? settings.minPrepHours))
    : settings.minPrepHours;

  const readyAt = new Date(now.getTime() + prepHours * 3_600_000);
  let candidate = shopToday(readyAt);

  if (isAfterCutoff(settings, now)) candidate = addDays(candidate, 1);

  // Bounded walk forward — never spin past the booking window.
  const today = shopToday(now);
  for (let i = 0; i <= settings.maxAdvanceDays; i += 1) {
    if (daysBetween(today, candidate) > settings.maxAdvanceDays) return null;
    const result = await getDateAvailability(candidate, settings, cartLines, now);
    if (result.available) return candidate;
    candidate = addDays(candidate, 1);
  }
  return null;
}

/**
 * Availability across a date range, for the checkout date picker. Uses three
 * grouped aggregations for the whole window rather than per-day queries.
 */
export async function getAvailabilityRange(settings, cartLines = [], now = new Date()) {
  const today = shopToday(now);
  const earliest = await getEarliestDeliveryDate(cartLines, settings, now);
  const from = earliest || today;
  const to = addDays(today, settings.maxAdvanceDays);

  if (from.getTime() > to.getTime()) return { earliest: null, days: [] };

  const match = {
    deliveryDate: { $gte: from, $lte: to },
    orderStatus: { $nin: NOT_COUNTED },
  };

  const [dayRows, slotRows, productRows] = await Promise.all([
    Order.aggregate([{ $match: match }, { $group: { _id: '$deliveryDate', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: match },
      { $group: { _id: { date: '$deliveryDate', slot: '$deliverySlot' }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $group: { _id: { date: '$deliveryDate', product: '$items.product' }, qty: { $sum: '$items.qty' } } },
    ]),
  ]);

  const keyOf = (d) => new Date(d).getTime();
  const ordersByDay = new Map(dayRows.map((r) => [keyOf(r._id), r.count]));
  const slotsByDay = new Map();
  for (const r of slotRows) {
    const k = keyOf(r._id.date);
    if (!slotsByDay.has(k)) slotsByDay.set(k, new Map());
    slotsByDay.get(k).set(r._id.slot, r.count);
  }
  const productsByDay = new Map();
  for (const r of productRows) {
    const k = keyOf(r._id.date);
    if (!productsByDay.has(k)) productsByDay.set(k, new Map());
    productsByDay.get(k).set(String(r._id.product), r.qty);
  }

  const activeSlots = (settings.slots || []).filter((s) => s.isActive);
  const products = cartLines.map((l) => l.product);
  const days = [];

  for (let cursor = new Date(from); cursor.getTime() <= to.getTime(); cursor = addDays(cursor, 1)) {
    const k = cursor.getTime();
    const entry = { date: new Date(cursor), available: true, reason: null, slots: [] };

    if (isHoliday(cursor, settings)) {
      days.push({ ...entry, available: false, reason: 'holiday' });
      continue;
    }
    if (productsUnavailableOnDay(cursor, products).length > 0) {
      days.push({ ...entry, available: false, reason: 'product_unavailable_on_day' });
      continue;
    }
    if ((ordersByDay.get(k) || 0) >= settings.dailyOrderCapacity) {
      days.push({ ...entry, available: false, reason: 'day_full' });
      continue;
    }

    const used = slotsByDay.get(k) || new Map();
    entry.slots = activeSlots.map((s) => {
      const u = used.get(s.name) || 0;
      return {
        name: s.name,
        timeRange: s.timeRange,
        capacity: s.capacity,
        used: u,
        left: Math.max(s.capacity - u, 0),
        isFull: u >= s.capacity,
      };
    });

    if (entry.slots.length === 0 || entry.slots.every((s) => s.isFull)) {
      days.push({ ...entry, available: false, reason: 'slots_full' });
      continue;
    }

    const booked = productsByDay.get(k) || new Map();
    const blockers = findCapacityBlockers(cartLines, booked);
    if (blockers.length > 0) {
      days.push({ ...entry, available: false, reason: 'product_capacity_full', blockedItems: blockers });
      continue;
    }

    days.push(entry);
  }

  return { earliest, days };
}
