import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    forRole: { type: String, enum: ['owner', 'customer'], required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    type: {
      type: String,
      enum: ['new_order', 'status_change', 'low_stock', 'payment_received', 'offer_started'],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    link: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
    // Set on low_stock notifications so the analytics stock-out report can
    // group by a real id instead of parsing the product name out of `title`.
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ forRole: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ customer: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
