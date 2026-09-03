import { getSettings, updateSettings } from '../../services/settingsService.js';
import { assertValidImage, uploadImageBuffer } from '../../utils/cloudinary.js';
import { AppError } from '../../utils/AppError.js';

export async function getOwnerSettings(req, res) {
  const settings = await getSettings();
  res.json(settings);
}

// Backs all 6 data tabs of Part D.11 — a single partial-update endpoint,
// validated field-by-field in the service so no tab can write an invalid value.
export async function patchSettings(req, res) {
  const settings = await updateSettings(req.body);
  res.json(settings);
}

export async function uploadImage(req, res) {
  if (!req.file) throw new AppError('An image file is required');
  assertValidImage(req.file);
  const url = await uploadImageBuffer(req.file.buffer, 'luckys-home-harvest/settings');
  res.status(201).json({ url });
}
