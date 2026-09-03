import mongoose from 'mongoose';

// Atomic sequence source for order IDs. Counting existing orders would race:
// two simultaneous checkouts would read the same count and mint the same id.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export default mongoose.model('Counter', counterSchema);
