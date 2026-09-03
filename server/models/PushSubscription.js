import mongoose from 'mongoose';

// One row per browser/device that opted in. `customer` is set only when
// they subscribed while logged in — guest checkout is the normal path here,
// so a subscription must stand on its own without one.
const pushSubscriptionSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('PushSubscription', pushSubscriptionSchema);
