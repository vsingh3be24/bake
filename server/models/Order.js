import mongoose from 'mongoose';
import { normalizeDay } from '../utils/shopTime.js';

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    nameSnapshot: { type: String, required: true },
    variantLabel: { type: String, default: null },
    priceSnapshot: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    itemNote: { type: String, default: '' },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    by: { type: String, default: 'system' },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },

    contact: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      altPhone: { type: String, default: '' },
    },
    address: {
      line1: { type: String, required: true },
      landmark: { type: String, default: '' },
      area: { type: String, required: true },
      pincode: { type: String, required: true },
    },

    items: { type: [orderItemSchema], required: true, validate: (v) => v.length > 0 },

    // Money
    itemsTotal: { type: Number, required: true, min: 0 },
    // Primary offer — the single largest-discount one. Kept for backward
    // compatibility with screens that show one code; `offersApplied` is the
    // authoritative record once stacking (Phase 16) can apply several at once.
    offerApplied: {
      offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', default: null },
      code: { type: String, default: null },
      title: { type: String, default: null },
      discountAmount: { type: Number, default: 0 },
    },
    offersApplied: {
      type: [
        {
          offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
          code: { type: String, default: null },
          title: { type: String, default: null },
          type: { type: String },
          discountAmount: { type: Number, default: 0 },
          freeDelivery: { type: Boolean, default: false },
        },
      ],
      default: [],
      _id: false,
    },
    loyaltyPointsUsed: { type: Number, default: 0, min: 0 },
    loyaltyDiscount: { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    rushCharge: { type: Number, default: 0, min: 0 },
    packagingCharge: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },

    // Payment
    paymentMethod: { type: String, enum: ['UPI', 'COD'], required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    upiRefNumber: { type: String, default: '' },
    // Either this or upiRefNumber is enough to identify a payment on the
    // owner's own UPI app statement — most customers only remember one or
    // the other, so both are optional and neither is required alone.
    payerName: { type: String, default: '' },
    paymentScreenshot: { type: String, default: '' },
    paidAt: { type: Date, default: null },
    verifiedBy: { type: String, default: '' },

    // Lifecycle + queue
    orderStatus: {
      type: String,
      enum: [
        'placed',
        'confirmed',
        'in_queue',
        'preparing',
        'ready',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'rejected',
      ],
      default: 'placed',
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    queuePriority: { type: Number, default: 0 },
    estimatedReadyAt: { type: Date, default: null },
    actualReadyAt: { type: Date, default: null },

    // Setter pins every write to the canonical UTC-midnight shop day, so
    // capacity counting can rely on exact equality no matter who writes it.
    deliveryDate: { type: Date, required: true, set: normalizeDay },
    deliverySlot: { type: String, required: true },
    deliveryType: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' },

    // Extras
    specialNote: { type: String, default: '' },
    isGift: { type: Boolean, default: false },
    giftMessage: { type: String, default: '' },
    cakeMessage: { type: String, default: '' },

    // Post-delivery
    rating: { type: Number, min: 1, max: 5, default: null },
    review: { type: String, default: '' },
    reviewImages: { type: [String], default: [] },

    cancelReason: { type: String, default: '' },
    cancelledBy: { type: String, enum: ['customer', 'owner', null], default: null },

    // Owner-only scratchpad — never rendered on any customer-facing screen.
    ownerNotes: { type: String, default: '' },

    source: { type: String, enum: ['web', 'whatsapp', 'phone'], default: 'web' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ deliveryDate: 1, deliverySlot: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ 'contact.phone': 1 });

export default mongoose.model('Order', orderSchema);
