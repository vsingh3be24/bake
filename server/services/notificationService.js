import Notification from '../models/Notification.js';
import { AppError } from '../utils/AppError.js';

/**
 * Both owner and customer notification screens share this — the only
 * difference is the scoping filter (`forRole: 'owner'` alone, vs
 * `forRole: 'customer'` + a specific customer id).
 */
export async function listNotifications(filter, limit = 30) {
  return Notification.find(filter).sort({ createdAt: -1 }).limit(limit);
}

export async function markRead(id, filter) {
  const notification = await Notification.findOneAndUpdate(
    { _id: id, ...filter },
    { isRead: true },
    { new: true }
  );
  if (!notification) throw new AppError('Notification not found', 404);
  return notification;
}

export async function markAllRead(filter) {
  const res = await Notification.updateMany({ ...filter, isRead: false }, { isRead: true });
  return res.modifiedCount ?? res.nModified ?? 0;
}
