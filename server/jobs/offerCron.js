import cron from 'node-cron';
import Offer from '../models/Offer.js';

/**
 * Deactivate flash offers whose window has closed (Part G.4). Recurring offers
 * are left alone — they switch on and off by wall-clock at read time via
 * isOfferCurrentlyActive, so flipping isActive would wrongly kill them for good.
 * Idempotent: only matches still-active, expired, one-shot flash offers.
 */
export async function expireFlashOffers(now = new Date()) {
  const res = await Offer.updateMany(
    { isActive: true, isFlash: true, isRecurring: false, endAt: { $ne: null, $lt: now } },
    { $set: { isActive: false } }
  );
  return res.modifiedCount ?? res.nModified ?? 0;
}

/** Runs the sweep every minute. Call once, from the server entrypoint. */
export function startOfferCron() {
  return cron.schedule('* * * * *', async () => {
    try {
      const n = await expireFlashOffers();
      if (n > 0) console.log(`Offer cron: expired ${n} flash offer(s)`);
    } catch (err) {
      console.error('Offer auto-expire cron failed:', err.message);
    }
  });
}
