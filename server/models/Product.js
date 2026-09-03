import mongoose from 'mongoose';
import Notification from './Notification.js';

const variantSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // "500g"
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, default: null, min: 0 },
    stockCount: { type: Number, default: 0, min: 0 },
    sku: { type: String, default: '' },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    // Identity
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    shortDesc: { type: String, maxlength: 90, default: '' },
    longDesc: { type: String, default: '' },
    images: { type: [String], default: [] },

    // Variants
    variants: { type: [variantSchema], default: [] },
    hasVariants: { type: Boolean, default: false },

    // Simple pricing
    price: { type: Number, min: 0 },
    salePrice: { type: Number, default: null, min: 0 },
    unit: { type: String, default: 'per piece' },

    // Stock control
    stockMode: {
      type: String,
      enum: ['unlimited', 'counted', 'daily_capacity'],
      default: 'unlimited',
    },
    stockCount: { type: Number, default: 0, min: 0 },
    dailyCapacity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    inStock: { type: Boolean, default: true },
    autoOutOfStock: { type: Boolean, default: true },
    restockDate: { type: Date, default: null },

    // Quantity rules
    minQty: { type: Number, default: 4, min: 1 },
    maxQty: { type: Number, default: 50, min: 1 },
    stepQty: { type: Number, default: 1, min: 1 },

    // Prep time / queue
    prepTimeHours: { type: Number, default: 24, min: 0 },
    isRushAvailable: { type: Boolean, default: false },
    rushCharge: { type: Number, default: 0, min: 0 },
    availableDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] }, // 0=Sun..6=Sat

    // Marketing flags
    isHotSelling: { type: Boolean, default: false },
    hotSellingLocked: { type: Boolean, default: false },
    isNew: { type: Boolean, default: true },
    isChefSpecial: { type: Boolean, default: false },
    soldCount: { type: Number, default: 0, min: 0 },
    viewCount: { type: Number, default: 0, min: 0 },

    // Meta
    tags: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    nutritionNote: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    isVisible: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);
// Note: `isNew` (marketing flag) shadows Mongoose's own doc.isNew — never use
// doc.isNew for insert-vs-update detection on Product; use createdAt instead.

productSchema.index({ category: 1, isActive: 1, isVisible: 1 });
productSchema.index({ isHotSelling: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ name: 'text', shortDesc: 'text', tags: 'text' });

productSchema.pre('validate', function (next) {
  if (!this.hasVariants && this.price == null) {
    return next(new Error('Simple product requires a price'));
  }
  next();
});

async function handleAutoOutOfStock(doc) {
  if (
    doc &&
    doc.autoOutOfStock &&
    doc.stockMode === 'counted' &&
    doc.stockCount <= 0 &&
    doc.inStock
  ) {
    await mongoose.model('Product').updateOne({ _id: doc._id }, { inStock: false });
    await Notification.create({
      forRole: 'owner',
      type: 'low_stock',
      title: `${doc.name} is out of stock`,
      body: 'Update the stock',
      link: `/owner/stock`,
      product: doc._id,
    });
  }
}

/** True when this update deliberately writes `inStock` (top-level or via $set). */
function updateTouchesInStock(update = {}) {
  if (update.inStock !== undefined) return true;
  if (update.$set && update.$set.inStock !== undefined) return true;
  return false;
}

productSchema.post('findOneAndUpdate', async function (doc) {
  // Honor a manual status toggle: if the owner explicitly set `inStock` in
  // this very update (Part D.4 "Status toggle → auto rule override"), don't
  // let the auto-rule immediately flip their deliberate choice back.
  if (updateTouchesInStock(this.getUpdate())) return;
  await handleAutoOutOfStock(doc);
});

productSchema.post('save', async function (doc) {
  await handleAutoOutOfStock(doc);
});

export default mongoose.model('Product', productSchema);
