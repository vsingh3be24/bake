import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';
import { AppError } from './AppError.js';

function configured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configure() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:owner@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Broadcasts to every stored subscription. A subscription the push service
 * reports as gone (410) or not-found (404) is dead — the browser dropped it
 * (uninstalled, cleared data, revoked permission) — so it's removed rather
 * than retried forever. Any other per-subscription failure is swallowed so
 * one bad row can't sink the whole broadcast.
 */
export async function broadcastPush({ title, body, link }) {
  if (!configured()) {
    throw new AppError('Push notifications are not set up yet — add VAPID keys to the server .env');
  }
  configure();

  const subscriptions = await PushSubscription.find();
  const payload = JSON.stringify({ title, body, link: link || '/' });

  const deadIds = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          payload
        );
        sent += 1;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          deadIds.push(sub._id);
        }
        // Other errors (rate limit, transient network) are left alone —
        // the subscription may still be good next time.
      }
    })
  );

  if (deadIds.length) await PushSubscription.deleteMany({ _id: { $in: deadIds } });

  return { sent, total: subscriptions.length, removed: deadIds.length };
}

export { configured as pushConfigured };
