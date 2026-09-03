import Order from '../models/Order.js';
import Notification from '../models/Notification.js';
import { AppError } from '../utils/AppError.js';
import { SHOP_TZ, shopDayKey, shopDayStartFromKey, normalizeDay, addDays } from '../utils/shopTime.js';

const NOT_COUNTED = ['cancelled', 'rejected'];
const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };
const MAX_RANGE_DAYS = 366;

/**
 * Every chart buckets by the SHOP's calendar day, not the server's. Orders
 * store `createdAt` as a real UTC instant, so an order placed 1am IST is
 * still the previous day in UTC — bucketing without the timezone would quietly
 * shift a slice of every day's revenue onto the day before.
 */
function dayKeyExpr(field) {
  return { $dateToString: { format: '%Y-%m-%d', date: field, timezone: SHOP_TZ } };
}

/** Resolve ?range=30d or ?from=&to= into shop-local day keys plus real UTC bounds. */
function resolveRange({ range, from, to }, now = new Date()) {
  const todayKey = shopDayKey(now);

  let fromKey;
  let toKey = todayKey;

  if (from || to) {
    fromKey = from || from === '' ? String(from) : todayKey;
    if (to) toKey = String(to);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromKey) || !/^\d{4}-\d{2}-\d{2}$/.test(toKey)) {
      throw new AppError('Dates must be in YYYY-MM-DD format');
    }
  } else {
    const days = RANGE_DAYS[range] || RANGE_DAYS['30d'];
    // Inclusive window: today counts as day 1.
    const startDay = addDays(normalizeDay(todayKey), -(days - 1));
    fromKey = startDay.toISOString().slice(0, 10);
  }

  if (fromKey > toKey) throw new AppError('The start date must be before the end date');

  const start = shopDayStartFromKey(fromKey);
  const end = new Date(shopDayStartFromKey(toKey).getTime() + 86_400_000); // exclusive
  const dayCount = Math.round((end - start) / 86_400_000);
  if (dayCount > MAX_RANGE_DAYS) throw new AppError('That date range is too large — pick a year or less');

  return { fromKey, toKey, start, end, dayCount };
}

/** Every day in the window, so a quiet day plots as zero instead of vanishing. */
function zeroFillSeries(rows, fromKey, dayCount) {
  const byKey = new Map(rows.map((r) => [r._id, r]));
  const series = [];
  let cursor = normalizeDay(fromKey);
  for (let i = 0; i < dayCount; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    const row = byKey.get(key);
    const revenue = row?.revenue || 0;
    const orders = row?.orders || 0;
    series.push({ date: key, revenue, orders, aov: orders ? Math.round(revenue / orders) : 0 });
    cursor = addDays(cursor, 1);
  }
  return series;
}

export async function getAnalytics(query = {}, now = new Date()) {
  const { fromKey, toKey, start, end, dayCount } = resolveRange(query, now);

  const match = { createdAt: { $gte: start, $lt: end }, orderStatus: { $nin: NOT_COUNTED } };

  const [
    seriesRows,
    totalsRows,
    topItems,
    categoryRows,
    paymentRows,
    slotRows,
    repeatRows,
    offerRows,
    stockOutRows,
    heatmapRows,
  ] = await Promise.all([
    Order.aggregate([
      { $match: match },
      { $group: { _id: dayKeyExpr('$createdAt'), revenue: { $sum: '$grandTotal' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$grandTotal' },
          orders: { $sum: 1 },
          itemsTotal: { $sum: '$itemsTotal' },
          discount: { $sum: '$offerApplied.discountAmount' },
        },
      },
    ]),

    Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          // The name as actually sold — avoids a lookup, and is the honest
          // label for what left the kitchen under that name.
          name: { $first: '$items.nameSnapshot' },
          qty: { $sum: '$items.qty' },
          revenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { qty: -1 } },
      { $limit: 10 },
    ]),

    Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', revenue: { $sum: '$items.subtotal' } } },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'categories', localField: 'product.category', foreignField: '_id', as: 'category' } },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      { $group: { _id: { $ifNull: ['$category.name', 'Other'] }, revenue: { $sum: '$revenue' } } },
      { $sort: { revenue: -1 } },
    ]),

    Order.aggregate([
      { $match: match },
      { $group: { _id: '$paymentMethod', orders: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
    ]),

    Order.aggregate([
      { $match: match },
      { $group: { _id: '$deliverySlot', orders: { $sum: 1 } } },
      { $sort: { orders: -1 } },
    ]),

    Order.aggregate([
      { $match: { ...match, customer: { $ne: null } } },
      { $group: { _id: '$customer', orders: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          customers: { $sum: 1 },
          repeatCustomers: { $sum: { $cond: [{ $gt: ['$orders', 1] }, 1, 0] } },
        },
      },
    ]),

    Order.aggregate([
      { $match: match },
      { $unwind: '$offersApplied' },
      {
        $group: {
          _id: '$offersApplied.offerId',
          title: { $first: '$offersApplied.title' },
          code: { $first: '$offersApplied.code' },
          orders: { $sum: 1 },
          discount: { $sum: '$offersApplied.discountAmount' },
          // Full order value of every order this offer took part in. Stacked
          // offers each get credited the same order, so this column can sum
          // past total revenue — it reads "revenue influenced", not "split".
          revenue: { $sum: '$grandTotal' },
        },
      },
      { $sort: { discount: -1 } },
    ]),

    Notification.aggregate([
      { $match: { type: 'low_stock', createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: { $ifNull: ['$product', '$title'] }, title: { $first: '$title' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),

    // Same order population as every other panel (filtered on when the order
    // was placed), grouped by the delivery weekday/slot the customer chose —
    // so the cells always sum to the headline order count rather than
    // describing a quietly different set of orders.
    Order.aggregate([
      { $match: match },
      {
        $group: {
          // deliveryDate is a UTC-midnight sentinel standing for a shop-local
          // day, so its weekday must be read in UTC — applying the shop zone
          // here would shift it back a day.
          _id: { dow: { $dayOfWeek: { date: '$deliveryDate', timezone: 'UTC' } }, slot: '$deliverySlot' },
          orders: { $sum: 1 },
        },
      },
    ]),
  ]);

  const totals = totalsRows[0] || { revenue: 0, orders: 0, itemsTotal: 0, discount: 0 };
  const repeat = repeatRows[0] || { customers: 0, repeatCustomers: 0 };

  return {
    range: { from: fromKey, to: toKey, days: dayCount },
    totals: {
      revenue: totals.revenue,
      orders: totals.orders,
      avgOrderValue: totals.orders ? Math.round(totals.revenue / totals.orders) : 0,
      discount: totals.discount || 0,
      customers: repeat.customers,
      repeatCustomers: repeat.repeatCustomers,
      repeatRate: repeat.customers ? Math.round((repeat.repeatCustomers / repeat.customers) * 100) : 0,
    },
    series: zeroFillSeries(seriesRows, fromKey, dayCount),
    topItems: topItems.map((r) => ({ productId: r._id, name: r.name, qty: r.qty, revenue: r.revenue })),
    categorySplit: categoryRows.map((r) => ({ name: r._id, revenue: r.revenue })),
    paymentSplit: paymentRows.map((r) => ({ name: r._id, orders: r.orders, revenue: r.revenue })),
    slotSplit: slotRows.map((r) => ({ name: r._id, orders: r.orders })),
    offerPerformance: offerRows.map((r) => ({
      offerId: r._id,
      title: r.title,
      code: r.code,
      orders: r.orders,
      discount: r.discount,
      revenue: r.revenue,
    })),
    stockOuts: stockOutRows.map((r) => ({
      name: (r.title || '').replace(/ is out of stock$/, '') || 'Unknown item',
      count: r.count,
    })),
    heatmap: heatmapRows.map((r) => ({ dow: r._id.dow - 1, slot: r._id.slot, orders: r.orders })), // 0=Sun
  };
}
