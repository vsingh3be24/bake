import PushSubscription from '../../models/PushSubscription.js';
import { AppError } from '../../utils/AppError.js';
import { broadcastPush } from '../../utils/webPush.js';

export async function getSubscriberCount(req, res) {
  const count = await PushSubscription.countDocuments();
  res.json({ count, configured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) });
}

export async function broadcast(req, res) {
  const title = req.body.title?.trim();
  const body = req.body.body?.trim();
  const link = req.body.link?.trim();
  if (!title) throw new AppError('Please write a title');
  if (!body) throw new AppError('Please write a message');
  if (title.length > 80) throw new AppError('Title is too long — keep it under 80 characters');
  if (body.length > 200) throw new AppError('Message is too long — keep it under 200 characters');
  if (link && !link.startsWith('/')) throw new AppError('Link must be a path on this site, e.g. /offers');

  const result = await broadcastPush({ title, body, link });
  res.json(result);
}
