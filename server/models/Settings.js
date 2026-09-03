import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // "Morning"
    timeRange: { type: String, required: true }, // "9 AM - 1 PM"
    capacity: { type: Number, default: 8, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const deliveryAreaSchema = new mongoose.Schema(
  {
    area: { type: String, required: true },
    pincode: { type: String, required: true },
    charge: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    // Shop control
    shopOpen: { type: Boolean, default: true },
    closedMessage: { type: String, default: "We're closed today — orders open again tomorrow" },
    autoCloseTime: { type: String, default: '21:00' },
    autoOpenTime: { type: String, default: '08:00' },
    holidays: { type: [Date], default: [] },

    // Capacity / queue
    dailyOrderCapacity: { type: Number, default: 15, min: 0 },
    slots: {
      type: [slotSchema],
      default: [
        { name: 'Morning', timeRange: '9 AM - 1 PM', capacity: 8, isActive: true },
        { name: 'Evening', timeRange: '4 PM - 8 PM', capacity: 8, isActive: true },
      ],
    },
    minPrepHours: { type: Number, default: 24, min: 0 },
    maxAdvanceDays: { type: Number, default: 15, min: 1 },

    // Payment
    upiId: { type: String, default: '' },
    upiQrImage: { type: String, default: '' },
    payeeName: { type: String, default: "Lucky's Home Harvest" },
    acceptCOD: { type: Boolean, default: true },
    acceptUPI: { type: Boolean, default: true },

    // Delivery
    deliveryCharge: { type: Number, default: 40, min: 0 },
    freeDeliveryAbove: { type: Number, default: 499, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    packagingCharge: { type: Number, default: 20, min: 0 },
    deliveryAreas: { type: [deliveryAreaSchema], default: [] },
    allowPickup: { type: Boolean, default: true },
    pickupAddress: { type: String, default: '' },

    // Rules
    globalMinQty: { type: Number, default: 4, min: 1 },

    // Loyalty
    loyaltyEnabled: { type: Boolean, default: true },
    pointsPerHundred: { type: Number, default: 1, min: 0 },
    pointValue: { type: Number, default: 0.5, min: 0 },
    minPointsToRedeem: { type: Number, default: 100, min: 0 },

    // Content
    announcementBar: { type: String, default: '' },
    announcementActive: { type: Boolean, default: false },
    whatsappNumber: { type: String, default: '918017853043' },
    instagramUrl: { type: String, default: '' },
    aboutText: { type: String, default: '' },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export default mongoose.model('Settings', settingsSchema);
