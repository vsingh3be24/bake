import * as notificationService from '../../services/notificationService.js';

const filter = { forRole: 'owner' };

export async function listNotifications(req, res) {
  res.json(await notificationService.listNotifications(filter));
}

export async function markRead(req, res) {
  res.json(await notificationService.markRead(req.params.id, filter));
}

export async function markAllRead(req, res) {
  await notificationService.markAllRead(filter);
  res.status(204).end();
}
