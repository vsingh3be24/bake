import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import { getSettings } from '../../services/settingsService.js';
import { shopToday, shopDayRange } from '../../utils/shopTime.js';

const ACTIVE = { $nin: ['cancelled', 'rejected'] };

export async function getDashboard(req, res) {
  const settings = await getSettings();
  const today = shopToday();
  const { start, end } = shopDayRange();

  const [ordersToday, salesAgg, pendingPayment, lowStockItems, outOfStockItems, paymentsToVerify, newOrders] =
    await Promise.all([
      // Today's capacity bar — orders booked FOR today's delivery, not orders placed today.
      Order.countDocuments({ deliveryDate: today, orderStatus: ACTIVE }),
      // Today's sale — revenue booked today, regardless of delivery date.
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lt: end }, orderStatus: ACTIVE } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      Order.countDocuments({ paymentMethod: 'UPI', paymentStatus: 'pending', orderStatus: ACTIVE }),
      Product.find({
        isActive: true,
        stockMode: 'counted',
        inStock: true,
        $expr: { $and: [{ $gt: ['$stockCount', 0] }, { $lte: ['$stockCount', '$lowStockThreshold'] }] },
      })
        .select('name stockCount lowStockThreshold')
        .sort('stockCount')
        .limit(10),
      Product.find({ isActive: true, inStock: false }).select('name').limit(10),
      Order.find({ paymentMethod: 'UPI', paymentStatus: 'pending', upiRefNumber: { $ne: '' }, orderStatus: ACTIVE })
        .select('orderId contact.name grandTotal upiRefNumber createdAt')
        .sort('-createdAt')
        .limit(10),
      Order.find({ orderStatus: 'placed' }).sort('-createdAt').limit(10),
    ]);

  res.json({
    shopOpen: settings.shopOpen,
    dailyOrderCapacity: settings.dailyOrderCapacity,
    stats: {
      ordersToday,
      salesToday: salesAgg[0]?.total || 0,
      pendingPayment,
      lowStockCount: lowStockItems.length,
    },
    alerts: {
      lowStock: lowStockItems,
      outOfStock: outOfStockItems,
      paymentsToVerify,
    },
    newOrders,
  });
}
