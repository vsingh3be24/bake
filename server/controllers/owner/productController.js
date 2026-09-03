import Product from '../../models/Product.js';
import Category from '../../models/Category.js';
import { AppError } from '../../utils/AppError.js';
import { escapeRegex } from '../../utils/regex.js';
import { assertValidImage, uploadImageBuffer } from '../../utils/cloudinary.js';

const STOCK_MODES = ['unlimited', 'counted', 'daily_capacity'];

// Only the stock-relevant slice of a product — the full Products screen
// (edit name/price/images) is a later phase.
const STOCK_FIELDS =
  'name slug images category stockMode stockCount dailyCapacity lowStockThreshold ' +
  'inStock autoOutOfStock restockDate isHotSelling hotSellingLocked soldCount sortOrder';

/** Owner view: every live product (visible or not), filtered by stock state. */
export async function listStock(req, res) {
  const { filter, search } = req.query;
  const query = { isActive: true };

  if (search?.trim()) {
    query.name = new RegExp(escapeRegex(search.trim()), 'i');
  }

  switch (filter) {
    case 'in_stock':
      query.inStock = true;
      break;
    case 'out':
      // Flagged out, or a counted item with nothing left.
      query.$or = [
        { inStock: false },
        { stockMode: 'counted', stockCount: { $lte: 0 } },
      ];
      break;
    case 'low':
      query.stockMode = 'counted';
      query.inStock = true;
      query.$expr = {
        $and: [{ $gt: ['$stockCount', 0] }, { $lte: ['$stockCount', '$lowStockThreshold'] }],
      };
      break;
    case 'unlimited':
      query.stockMode = 'unlimited';
      break;
    default:
      break; // 'all'
  }

  const products = await Product.find(query)
    .select(STOCK_FIELDS)
    .populate('category', 'name slug')
    .sort({ sortOrder: 1, name: 1 });

  res.json(products);
}

function sanitizeStockUpdate(body) {
  const update = {};

  if (body.stockMode !== undefined) {
    if (!STOCK_MODES.includes(body.stockMode)) throw new AppError('That is not a valid stock mode');
    update.stockMode = body.stockMode;
  }
  if (body.stockCount !== undefined) {
    const n = Number(body.stockCount);
    if (!Number.isInteger(n) || n < 0) throw new AppError('Stock must be a whole number of 0 or more');
    update.stockCount = n;
  }
  if (body.dailyCapacity !== undefined) {
    const n = Number(body.dailyCapacity);
    if (!Number.isInteger(n) || n < 0) throw new AppError('Capacity must be a whole number of 0 or more');
    update.dailyCapacity = n;
  }
  if (body.lowStockThreshold !== undefined) {
    const n = Number(body.lowStockThreshold);
    if (!Number.isInteger(n) || n < 0) throw new AppError('The low-stock threshold must be 0 or more');
    update.lowStockThreshold = n;
  }
  if (body.inStock !== undefined) update.inStock = Boolean(body.inStock);
  if (body.autoOutOfStock !== undefined) update.autoOutOfStock = Boolean(body.autoOutOfStock);
  if (body.restockDate !== undefined) {
    if (body.restockDate === null || body.restockDate === '') {
      update.restockDate = null;
    } else {
      const d = new Date(body.restockDate);
      if (Number.isNaN(d.getTime())) throw new AppError('That restock date is not valid');
      update.restockDate = d;
    }
  }

  return update;
}

/** Quick inline edit from the stock table — one or more fields at a time. */
export async function updateStock(req, res) {
  const update = sanitizeStockUpdate(req.body);
  if (Object.keys(update).length === 0) throw new AppError('Nothing to update');

  const updated = await Product.findByIdAndUpdate(req.params.id, { $set: update }, {
    new: true,
    runValidators: true,
  });
  if (!updated) throw new AppError('Product not found', 404);

  // The auto-out-of-stock hook may have flipped `inStock` via its own separate
  // write AFTER Mongoose built the doc above — so that returned doc can be
  // stale on inStock. Re-read to hand the client the true post-hook state.
  const product = await Product.findById(req.params.id)
    .select(STOCK_FIELDS)
    .populate('category', 'name slug');

  res.json(product);
}

/**
 * Bulk morning-routine actions (Part D.4). Each returns the count touched so
 * the client can toast "12 items updated" rather than silently.
 */
export async function bulkStock(req, res) {
  const { ids, action, value } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw new AppError('Please select at least one item');

  const match = { _id: { $in: ids }, isActive: true };
  let update;

  switch (action) {
    case 'markInStock':
      // Clear any restock date too — it's back now.
      update = { $set: { inStock: true, restockDate: null } };
      break;
    case 'markOutOfStock':
      update = { $set: { inStock: false } };
      break;
    case 'setCapacity': {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0) throw new AppError('Capacity must be a whole number of 0 or more');
      // Only meaningful for daily-capacity items; scope the write to them.
      match.stockMode = 'daily_capacity';
      update = { $set: { dailyCapacity: n } };
      break;
    }
    case 'setStock': {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0) throw new AppError('Stock must be a whole number of 0 or more');
      match.stockMode = 'counted';
      update = { $set: { stockCount: n, inStock: n > 0 } };
      break;
    }
    default:
      throw new AppError('That is not a valid bulk action');
  }

  const result = await Product.updateMany(match, update);
  res.json({ modified: result.modifiedCount ?? result.nModified ?? 0 });
}

/**
 * Manual hot-selling override (Part G.5). Setting it locks the flag so the
 * daily auto-ranking cron won't overwrite the owner's deliberate choice.
 */
export async function toggleHotSelling(req, res) {
  const current = await Product.findById(req.params.id).select('isHotSelling');
  if (!current) throw new AppError('Product not found', 404);

  // updateOne (not save/findByIdAndUpdate) so the auto-out-of-stock hook stays
  // out of it — toggling a marketing flag must never disturb the stock state,
  // e.g. undoing a manual in-stock override on a counted 0-stock item.
  await Product.updateOne(
    { _id: req.params.id },
    { $set: { isHotSelling: !current.isHotSelling, hotSellingLocked: true } }
  );

  const product = await Product.findById(req.params.id)
    .select(STOCK_FIELDS)
    .populate('category', 'name slug');
  res.json(product);
}

// --- Full product CRUD (create/edit/archive) ---------------------------

function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Appends -2, -3, ... until the slug is free (excluding the doc being edited). */
async function uniqueSlug(base, excludeId = null) {
  let slug = base || 'item';
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    // eslint-disable-next-line no-await-in-loop
    const clash = await Product.findOne(query).select('_id');
    if (!clash) return slug;
    slug = `${base}-${n++}`;
  }
}

/** Every field an owner can set from the Products screen. Everything else
 * (soldCount, viewCount, hotSellingLocked, timestamps, _id) is server-owned —
 * hotSellingLocked in particular is set only by the dedicated toggle endpoint,
 * so a product-edit save can never silently override that decision. */
const EDITABLE_FIELDS = [
  'name', 'category', 'shortDesc', 'longDesc', 'images',
  'variants', 'hasVariants', 'price', 'salePrice', 'unit',
  'stockMode', 'stockCount', 'dailyCapacity', 'lowStockThreshold',
  'inStock', 'autoOutOfStock', 'restockDate',
  'minQty', 'maxQty', 'stepQty',
  'prepTimeHours', 'isRushAvailable', 'rushCharge', 'availableDays',
  'isHotSelling', 'isNew', 'isChefSpecial',
  'tags', 'allergens', 'nutritionNote', 'isVisible', 'sortOrder',
];

function normalizeBody(body) {
  const data = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  return data;
}

async function assertValidCategory(categoryId) {
  if (!categoryId) throw new AppError('Please choose a category');
  const category = await Category.findById(categoryId).select('_id');
  if (!category) throw new AppError('That category does not exist');
}

/** Full product list for the Products screen — every field, including
 * archived (isActive:false) items so the owner can restore one. */
export async function listProducts(req, res) {
  const { search, category, includeArchived } = req.query;
  const query = includeArchived === 'true' ? {} : { isActive: true };

  if (search?.trim()) query.name = new RegExp(escapeRegex(search.trim()), 'i');
  if (category) query.category = category;

  const products = await Product.find(query)
    .populate('category', 'name slug')
    .sort({ sortOrder: 1, name: 1 });
  res.json(products);
}

export async function getProduct(req, res) {
  const product = await Product.findById(req.params.id).populate('category', 'name slug');
  if (!product) throw new AppError('Product not found', 404);
  res.json(product);
}

export async function createProduct(req, res) {
  const data = normalizeBody(req.body);
  if (!data.name?.trim()) throw new AppError('Please give the product a name');
  await assertValidCategory(data.category);
  if (!data.hasVariants && (data.price == null || data.price === '')) {
    throw new AppError('Please set a price (or add variants)');
  }

  data.slug = await uniqueSlug(slugify(data.name));

  try {
    const product = await Product.create(data);
    const populated = await product.populate('category', 'name slug');
    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) throw new AppError('A product with that name already exists');
    throw err;
  }
}

export async function updateProduct(req, res) {
  const data = normalizeBody(req.body);
  if (data.category) await assertValidCategory(data.category);

  const existing = await Product.findById(req.params.id).select('name slug');
  if (!existing) throw new AppError('Product not found', 404);

  // Renaming re-slugs (so the customer-facing URL stays readable), but only
  // when the name actually changed — never disturb an unrelated edit's URL.
  if (data.name && data.name.trim() !== existing.name) {
    data.slug = await uniqueSlug(slugify(data.name), existing._id);
  }

  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { $set: data }, {
      new: true,
      runValidators: true,
    }).populate('category', 'name slug');
    res.json(product);
  } catch (err) {
    if (err.code === 11000) throw new AppError('A product with that name already exists');
    throw err;
  }
}

/** Soft delete — orders already placed still reference this product by id, so
 * a hard delete would leave those with a dangling reference. isActive:false
 * drops it from every customer- and owner-facing list (Menu, Stock, Offers'
 * product picker) while keeping order history intact. */
export async function archiveProduct(req, res) {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: false, isVisible: false } },
    { new: true }
  );
  if (!product) throw new AppError('Product not found', 404);
  res.status(204).end();
}

export async function restoreProduct(req, res) {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: true } },
    { new: true }
  ).populate('category', 'name slug');
  if (!product) throw new AppError('Product not found', 404);
  res.json(product);
}

export async function uploadProductImage(req, res) {
  if (!req.file) throw new AppError('An image file is required');
  assertValidImage(req.file);
  const url = await uploadImageBuffer(req.file.buffer, 'luckys-home-harvest/products');
  res.status(201).json({ url });
}
