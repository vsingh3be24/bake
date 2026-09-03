import { getSettings } from '../../services/settingsService.js';
import { getQueueBoard } from '../../services/ownerQueueService.js';
import { getBakingList } from '../../services/bakingListService.js';

export async function getQueue(req, res) {
  const settings = await getSettings();
  const board = await getQueueBoard(req.query.date, settings);
  res.json(board);
}

export async function getBaking(req, res) {
  const list = await getBakingList(req.query.date);
  res.json(list);
}
