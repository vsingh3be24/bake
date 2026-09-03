import { assertValidImage, uploadImageBuffer } from '../../utils/cloudinary.js';
import { AppError } from '../../utils/AppError.js';

export async function uploadPaymentScreenshot(req, res) {
  if (!req.file) throw new AppError('A screenshot file is required');
  assertValidImage(req.file);

  const url = await uploadImageBuffer(req.file.buffer, 'luckys-home-harvest/payments');
  res.status(201).json({ url });
}
