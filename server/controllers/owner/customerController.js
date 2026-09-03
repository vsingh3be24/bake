import Customer from '../../models/Customer.js';
import Order from '../../models/Order.js';
import { AppError } from '../../utils/AppError.js';
import { escapeRegex } from '../../utils/regex.js';

const SORT_MAP = {
  recent: { lastOrderAt: -1 },
  spent: { totalSpent: -1 },
  orders: { totalOrders: -1 },
  name: { name: 1 },
};

// List-view fields only — order history, favourites and addresses are
// fetched with the full document on the detail screen.
const LIST_FIELDS = 'name phone tier totalOrders totalSpent lastOrderAt isBlocked isGuest';

export async function listCustomers(req, res) {
  const { search, tier, blocked, sort } = req.query;
  const filter = {};

  if (search?.trim()) {
    const re = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: re }, { phone: re }];
  }
  if (tier) filter.tier = tier;
  if (blocked === 'true') filter.isBlocked = true;
  else if (blocked === 'false') filter.isBlocked = false;

  const customers = await Customer.find(filter)
    .select(LIST_FIELDS)
    .sort(SORT_MAP[sort] || SORT_MAP.recent)
    .limit(500);

  res.json(customers);
}

export async function getCustomer(req, res) {
  // Never let a bcrypt hash leave the database, not even to the owner.
  const customer = await Customer.findById(req.params.id)
    .select('-passwordHash')
    .populate('favourites', 'name slug images price salePrice');
  if (!customer) throw new AppError('Customer not found', 404);

  const orders = await Order.find({ customer: customer._id })
    .select('orderId orderStatus grandTotal deliveryDate deliverySlot items createdAt')
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ customer, orders });
}

export async function updateNote(req, res) {
  const customer = await Customer.findByIdAndUpdate(
    req.params.id,
    { ownerNote: req.body.note?.trim() || '' },
    { new: true }
  ).select(LIST_FIELDS + ' ownerNote');
  if (!customer) throw new AppError('Customer not found', 404);
  res.json(customer);
}

export async function toggleBlock(req, res) {
  const isBlocked = Boolean(req.body.isBlocked);
  if (isBlocked && !req.body.reason?.trim()) {
    throw new AppError('Please give a reason for blocking this customer');
  }

  const customer = await Customer.findByIdAndUpdate(
    req.params.id,
    { isBlocked, blockReason: isBlocked ? req.body.reason.trim() : '' },
    { new: true }
  ).select(LIST_FIELDS + ' ownerNote blockReason');
  if (!customer) throw new AppError('Customer not found', 404);
  res.json(customer);
}
