import Product from '../../models/Product.js';
import Category from '../../models/Category.js';
import { AppError } from '../../utils/AppError.js';

const SORT_MAP = {
  popular: { soldCount: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  newest: { createdAt: -1 },
};

export async function listProducts(req, res) {
  const { category, inStock, onSale, tags, search, sort, page } = req.query;

  const filter = { isActive: true, isVisible: true };

  if (category) {
    const cat = await Category.findOne({ slug: category });
    filter.category = cat ? cat._id : null; // null category id -> matches nothing
  }
  if (inStock === 'true') filter.inStock = true;
  if (onSale === 'true') filter.salePrice = { $ne: null };
  if (tags) filter.tags = { $in: tags.split(',').map((t) => t.trim()).filter(Boolean) };
  if (search) filter.$text = { $search: search };

  const sortBy = SORT_MAP[sort] || SORT_MAP.popular;
  const limit = 20;
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (pageNum - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter).sort(sortBy).skip(skip).limit(limit).populate('category', 'name slug'),
    Product.countDocuments(filter),
  ]);

  res.json({
    products,
    page: pageNum,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    total,
  });
}

export async function getProductBySlug(req, res) {
  const product = await Product.findOneAndUpdate(
    { slug: req.params.slug, isActive: true, isVisible: true },
    { $inc: { viewCount: 1 } },
    { new: true }
  ).populate('category', 'name slug');

  if (!product) throw new AppError('This item is no longer available', 404);
  res.json(product);
}

export async function getHotSelling(req, res) {
  const products = await Product.find({
    isHotSelling: true,
    isActive: true,
    isVisible: true,
  })
    .sort({ sortOrder: 1, soldCount: -1 })
    .limit(10)
    .populate('category', 'name slug');

  res.json(products);
}
