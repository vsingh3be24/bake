import { getSettings } from '../../services/settingsService.js';

export async function getPublicSettings(req, res) {
  const settings = await getSettings();
  res.json(settings);
}
