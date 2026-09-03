import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      match: [/^[6-9]\d{9}$/, 'A valid 10-digit phone number is required'],
    },
    passwordHash: { type: String, required: true },
    name: { type: String, default: 'Owner' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('Admin', adminSchema);
