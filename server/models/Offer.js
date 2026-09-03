import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '' },
    code: { type: String, uppercase: true, trim: true }, // no default — sparse unique index needs it truly absent, not null
    isAutoApply: { type: Boolean, default: false },

    type: {
      type: String,
      enum: ['percent', 'flat', 'bogo', 'combo', 'free_delivery', 'free_item', 'bundle_price'],
      required: true,
    },
    value: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: null, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },

    appliesTo: {
      type: String,
      enum: ['all', 'category', 'product', 'cart_total'],
      default: 'all',
    },
    targetIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    freeItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    bundleProducts: { type: [mongoose.Schema.Types.ObjectId], ref: 'Product', default: [] },
    bundlePrice: { type: Number, default: null, min: 0 },

    // Flash control
    isFlash: { type: Boolean, default: false },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    flashBannerText: { type: String, default: '' },
    flashBannerColor: { type: String, default: '#C2185B' },
    showCountdown: { type: Boolean, default: true },

    // Recurring flash
    isRecurring: { type: Boolean, default: false },
    recurDays: { type: [Number], default: [] }, // 0=Sun..6=Sat
    recurStartTime: { type: String, default: null }, // "09:00"
    recurEndTime: { type: String, default: null },

    // Limits
    usageLimit: { type: Number, default: null, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    perCustomerLimit: { type: Number, default: 1, min: 0 },
    firstOrderOnly: { type: Boolean, default: false },

    // Display
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    isStackable: { type: Boolean, default: false },
    showOnHomepage: { type: Boolean, default: true },
    badgeText: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

offerSchema.index({ code: 1 }, { unique: true, sparse: true });
offerSchema.index({ isActive: 1, isFlash: 1, endAt: 1 });
offerSchema.index({ appliesTo: 1, targetIds: 1 });
offerSchema.index({ priority: -1 });

export default mongoose.model('Offer', offerSchema);
