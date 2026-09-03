import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import { AppError } from '../utils/AppError.js';

const PHONE_RE = /^[6-9]\d{9}$/;

// No signup path — the owner account is provisioned once via the seed
// script (OWNER_PHONE / OWNER_PASSWORD_HASH env vars), not self-service.
export async function login({ phone, password }) {
  if (!PHONE_RE.test(phone || '')) throw new AppError('Please enter a valid 10-digit phone number');
  if (!password) throw new AppError('Please enter your password');

  const admin = await Admin.findOne({ phone: phone.trim() });
  if (!admin) throw new AppError('Incorrect phone number or password');

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) throw new AppError('Incorrect phone number or password');

  return admin;
}

export async function changePassword(admin, { currentPassword, newPassword }) {
  const valid = await bcrypt.compare(currentPassword || '', admin.passwordHash);
  if (!valid) throw new AppError('Current password is incorrect');
  if (!newPassword || newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters');
  }

  admin.passwordHash = await bcrypt.hash(newPassword, 12);
  await admin.save();
}
