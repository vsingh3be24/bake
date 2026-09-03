import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { AppError } from '../utils/AppError.js';
import { shopToday, normalizeDay } from '../utils/shopTime.js';

const NOT_COUNTED = ['cancelled', 'rejected'];
const UNCATEGORIZED = 'Other';

/**
 * The morning baking list (Part D.6): every item across the day's orders,
 * summed and grouped by category, plus anything the baker needs to read by
 * hand (cake messages, dietary notes) before they start.
 *
 * A plain find() + in-memory reduce rather than an aggregation pipeline — the
 * order volume for one bakery's one day is a few dozen documents at most, and
 * grouping in JS avoids a $lookup/$unwind chain just to re-derive data (live
 * product name, category) that's cheaper to batch-fetch directly.
 */
export async function getBakingList(dateInput, now = new Date()) {
  const day = dateInput ? normalizeDay(dateInput) : shopToday(now);
  if (!day) throw new AppError('Date is not in a valid format');

  const orders = await Order.find({ deliveryDate: day, orderStatus: { $nin: NOT_COUNTED } }).select(
    'orderId contact.name items grandTotal specialNote cakeMessage giftMessage isGift'
  );

  const productIds = [...new Set(orders.flatMap((o) => o.items.map((i) => String(i.product))))];
  const products = await Product.find({ _id: { $in: productIds } })
    .select('name category')
    .populate('category', 'name sortOrder');
  const productById = new Map(products.map((p) => [String(p._id), p]));

  // productId -> { name, categoryName, categorySort, qty, orderIds: Set }
  const totals = new Map();
  const specialInstructions = [];
  let itemCount = 0;
  let revenue = 0;

  for (const order of orders) {
    revenue += order.grandTotal;

    for (const item of order.items) {
      itemCount += item.qty;
      const pid = String(item.product);
      const product = productById.get(pid);
      const name = product?.name || item.nameSnapshot;
      const categoryName = product?.category?.name || UNCATEGORIZED;
      const categorySort = product?.category?.sortOrder ?? 999;

      if (!totals.has(pid)) {
        totals.set(pid, { productId: pid, name, categoryName, categorySort, qty: 0, orderIds: new Set() });
      }
      const row = totals.get(pid);
      row.qty += item.qty;
      row.orderIds.add(order._id.toString());
    }

    const notes = [];
    if (order.cakeMessage) notes.push(`🎂 "${order.cakeMessage}"`);
    if (order.specialNote) notes.push(order.specialNote);
    if (order.isGift && order.giftMessage) notes.push(`Gift: "${order.giftMessage}"`);
    if (notes.length > 0) {
      specialInstructions.push({
        orderId: order.orderId,
        customerName: order.contact.name,
        notes,
      });
    }
  }

  // Group into category sections, sorted by the category's own sortOrder,
  // items within a section by quantity (biggest baking job first).
  const byCategory = new Map();
  for (const row of totals.values()) {
    if (!byCategory.has(row.categoryName)) {
      byCategory.set(row.categoryName, { name: row.categoryName, sortOrder: row.categorySort, items: [] });
    }
    byCategory.get(row.categoryName).items.push({
      productId: row.productId,
      name: row.name,
      qty: row.qty,
      orderCount: row.orderIds.size,
    });
  }

  const categories = [...byCategory.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ sortOrder, ...rest }) => rest);
  for (const cat of categories) {
    cat.items.sort((a, b) => b.qty - a.qty);
  }

  return {
    date: day,
    categories,
    specialInstructions,
    totals: { orders: orders.length, items: itemCount, revenue },
  };
}
