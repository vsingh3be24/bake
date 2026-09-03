import bcrypt from 'bcryptjs';
import Customer from '../models/Customer.js';
import { AppError } from '../utils/AppError.js';

const PHONE_RE = /^[6-9]\d{9}$/;

function assertPhone(phone) {
  if (!PHONE_RE.test(phone || '')) throw new AppError('Please enter a valid 10-digit phone number');
}

function assertPassword(password) {
  if (!password || password.length < 6) throw new AppError('Password must be at least 6 characters');
}

/**
 * Handles both "brand new phone" and "this phone already has a guest order"
 * — checkout (Phase 10) creates a guest Customer record by phone before any
 * account exists, so signup has to *claim* that record rather than collide
 * with it on the unique phone index.
 */
export async function signup({ name, phone, password }) {
  assertPhone(phone);
  assertPassword(password);
  if (!name?.trim()) throw new AppError('Please enter your name');

  const existing = await Customer.findOne({ phone: phone.trim() });

  if (existing?.passwordHash) {
    throw new AppError('An account already exists for this number — please log in');
  }
  if (existing?.isBlocked) {
    throw new AppError(existing.blockReason || 'This number cannot create an account');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const customer = existing
    ? await Customer.findByIdAndUpdate(
        existing._id,
        { name: name.trim(), passwordHash, isGuest: false },
        { new: true }
      )
    : await Customer.create({ name: name.trim(), phone: phone.trim(), passwordHash, isGuest: false });

  return customer;
}

export async function login({ phone, password }) {
  assertPhone(phone);
  if (!password) throw new AppError('Please enter your password');

  const customer = await Customer.findOne({ phone: phone.trim() });
  if (!customer?.passwordHash) {
    throw new AppError('Incorrect phone number or password');
  }
  if (customer.isBlocked) {
    throw new AppError(customer.blockReason || 'Your account has been blocked');
  }

  const valid = await bcrypt.compare(password, customer.passwordHash);
  if (!valid) throw new AppError('Incorrect phone number or password');

  return customer;
}

/** Lets a guest who already has an order set a password without re-entering everything. */
export async function claimAccount({ phone, password }) {
  assertPhone(phone);
  assertPassword(password);

  const existing = await Customer.findOne({ phone: phone.trim() });
  if (!existing) throw new AppError('This number is not linked to any order');
  if (existing.passwordHash) throw new AppError('An account already exists for this number — please log in');
  if (existing.isBlocked) throw new AppError(existing.blockReason || 'This number cannot create an account');

  const passwordHash = await bcrypt.hash(password, 12);
  existing.passwordHash = passwordHash;
  existing.isGuest = false;
  await existing.save();
  return existing;
}

export async function changePassword(customer, { currentPassword, newPassword }) {
  const valid = await bcrypt.compare(currentPassword || '', customer.passwordHash || '');
  if (!valid) throw new AppError('Current password is incorrect');
  assertPassword(newPassword);

  customer.passwordHash = await bcrypt.hash(newPassword, 12);
  await customer.save();
}

export { assertPhone, assertPassword };
