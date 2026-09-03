import PushSubscription from '../../models/PushSubscription.js';
import { AppError } from '../../utils/AppError.js';

export async function getVapidPublicKey(req, res) {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
}

export async function subscribe(req, res) {
  const { endpoint, keys } = req.body?.subscription || req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new AppError('That subscription is missing required fields');
  }

  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, customer: req.customer?._id || null },
    { upsert: true, new: true, runValidators: true }
  );
  res.status(201).json({ ok: true });
}

export async function unsubscribe(req, res) {
  const { endpoint } = req.body || {};
  if (!endpoint) throw new AppError('Endpoint is required');
  await PushSubscription.deleteOne({ endpoint });
  res.status(204).end();
}
