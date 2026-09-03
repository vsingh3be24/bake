import * as notificationService from '../../services/notificationService.js';

function filterFor(req) {
  return { forRole: 'customer', customer: req.customer._id };
}

export async function listNotifications(req, res) {
  res.json(await notificationService.listNotifications(filterFor(req)));
}

export async function markRead(req, res) {
  res.json(await notificationService.markRead(req.params.id, filterFor(req)));
}

export async function markAllRead(req, res) {
  await notificationService.markAllRead(filterFor(req));
  res.status(204).end();
}
