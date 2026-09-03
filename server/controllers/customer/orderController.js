import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import { AppError } from '../../utils/AppError.js';

const ACTIVE_STATUSES = ['placed', 'confirmed', 'in_queue', 'preparing', 'ready', 'out_for_delivery'];

export async function listOrders(req, res) {
  const filter = { customer: req.customer._id };
  if (req.query.status === 'active') filter.orderStatus = { $in: ACTIVE_STATUSES };
  else if (req.query.status === 'delivered') filter.orderStatus = 'delivered';
  else if (req.query.status === 'cancelled') filter.orderStatus = { $in: ['cancelled', 'rejected'] };

  const orders = await Order.find(filter).sort({ createdAt: -1 });
  res.json(orders);
}

async function findOwnOrder(customerId, id) {
  const order = await Order.findOne({ _id: id, customer: customerId });
  if (!order) throw new AppError('Order not found', 404);
  return order;
}

export async function getOrder(req, res) {
  const order = await findOwnOrder(req.customer._id, req.params.id);
  res.json(order);
}

/**
 * Returns a *cart payload*, not a new order — reorder never creates or
 * charges anything by itself. The client merges this into the cart and
 * runs it through the same live stock/price revalidation as any other item.
 */
export async function reorder(req, res) {
  const order = await findOwnOrder(req.customer._id, req.params.id);

  const items = [];
  const skipped = [];

  for (const line of order.items) {
    const product = await Product.findById(line.product);
    const available =
      product && product.isActive && product.isVisible && product.inStock;
    if (!available) {
      skipped.push({ name: line.nameSnapshot, reason: 'No longer available' });
      continue;
    }
    // Enough for the client to build a real cart line (name, image, min/max/step)
    // without a stub object that leaves the cart drawer showing a nameless row.
    items.push({
      productId: String(product._id),
      slug: product.slug,
      name: product.name,
      image: product.images?.[0] || null,
      variantLabel: line.variantLabel,
      qty: line.qty,
      minQty: product.minQty,
      maxQty: product.maxQty,
      stepQty: product.stepQty,
      price: product.price,
      salePrice: product.salePrice,
      variants: product.variants,
    });
  }

  res.json({ items, skipped });
}

export async function addReview(req, res) {
  const order = await findOwnOrder(req.customer._id, req.params.id);

  if (order.orderStatus !== 'delivered') {
    throw new AppError('You can only review an order after it has been delivered');
  }
  if (order.rating != null) {
    throw new AppError('This order has already been reviewed');
  }

  const { rating, review } = req.body;
  const num = Number(rating);
  if (!Number.isInteger(num) || num < 1 || num > 5) {
    throw new AppError('Rating must be between 1 and 5');
  }

  order.rating = num;
  order.review = review?.trim() || '';
  await order.save();
  res.json(order);
}
