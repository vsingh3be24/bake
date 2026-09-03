import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home' },
    line1: { type: String, required: true },
    landmark: { type: String, default: '' },
    area: { type: String, required: true },
    pincode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: false }
);

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      unique: true,
      match: [/^[6-9]\d{9}$/, 'A valid 10-digit phone number is required'],
    },
    passwordHash: { type: String, default: null },
    isGuest: { type: Boolean, default: true },
    email: { type: String, default: '' },

    addresses: { type: [addressSchema], default: [] },
    favourites: { type: [mongoose.Schema.Types.ObjectId], ref: 'Product', default: [] },

    // Loyalty
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    tier: { type: String, enum: ['regular', 'silver', 'gold'], default: 'regular' },

    // Stats
    totalOrders: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    lastOrderAt: { type: Date, default: null },
    avgOrderValue: { type: Number, default: 0, min: 0 },

    // Owner controls
    ownerNote: { type: String, default: '' },
    isBlocked: { type: Boolean, default: false },
    blockReason: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

customerSchema.index({ name: 'text' });
customerSchema.index({ tier: 1 });

export default mongoose.model('Customer', customerSchema);
