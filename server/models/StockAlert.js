import mongoose from 'mongoose';

const stockAlertSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    phone: {
      type: String,
      required: true,
      match: [/^[6-9]\d{9}$/, 'A valid 10-digit phone number is required'],
    },
    isNotified: { type: Boolean, default: false },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockAlertSchema.index({ product: 1, phone: 1 }, { unique: true });
stockAlertSchema.index({ isNotified: 1 });

export default mongoose.model('StockAlert', stockAlertSchema);
