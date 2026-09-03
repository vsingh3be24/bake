import { getAnalytics } from '../../services/analyticsService.js';

export async function getOwnerAnalytics(req, res) {
  res.json(await getAnalytics(req.query));
}
