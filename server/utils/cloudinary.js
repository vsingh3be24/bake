import { v2 as cloudinary } from 'cloudinary';
import { AppError } from './AppError.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB, per Part K checklist

export function assertValidImage(file) {
  if (!file) throw new AppError('An image file is required');
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new AppError('Only JPG, PNG or WEBP images are allowed');
  }
  if (file.size > MAX_BYTES) {
    throw new AppError('Image must be smaller than 5MB');
  }
}

export function uploadImageBuffer(buffer, folder = 'luckys-home-harvest') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) return reject(err);
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });
}

export default cloudinary;
