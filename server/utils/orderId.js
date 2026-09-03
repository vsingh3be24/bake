import Counter from '../models/Counter.js';
import { shopDayKey } from './shopTime.js';

/**
 * "LHH-0109-0042" — DDMM of the shop-local day plus a per-day sequence.
 *
 * Deliberately minted OUTSIDE the order transaction: an aborted order burns a
 * number, but a gap in order numbers is harmless, whereas a duplicate id would
 * collide on the unique index and fail a real customer's checkout.
 */
export async function generateOrderId(now = new Date()) {
  const [year, month, day] = shopDayKey(now).split('-');
  const counterId = `order-${year}${month}${day}`;

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );

  return `LHH-${day}${month}-${String(counter.seq).padStart(4, '0')}`;
}
