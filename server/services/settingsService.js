import Settings from '../models/Settings.js';
import { AppError } from '../utils/AppError.js';
import { parseHHMM } from '../utils/shopTime.js';

export async function getSettings() {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  return settings;
}

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}
function num(v, { min, max, integer = false } = {}) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (integer && !Number.isInteger(n)) return null;
  if (min != null && n < min) return null;
  if (max != null && n > max) return null;
  return n;
}
function bool(v) {
  return Boolean(v);
}
function time(v, field) {
  if (parseHHMM(v) == null) throw new AppError(`${field} must be a valid time (HH:MM)`);
  return v;
}

function sanitizeSlots(slots) {
  if (!Array.isArray(slots)) throw new AppError('Slots must be a list');
  return slots.map((s, i) => {
    const name = str(s.name);
    const timeRange = str(s.timeRange);
    if (!name) throw new AppError(`Slot ${i + 1} needs a name`);
    if (!timeRange) throw new AppError(`Slot ${i + 1} needs a time range`);
    const capacity = num(s.capacity, { min: 0, integer: true });
    if (capacity == null) throw new AppError(`Slot ${i + 1} needs a valid capacity`);
    return { name, timeRange, capacity, isActive: bool(s.isActive) };
  });
}

function sanitizeDeliveryAreas(areas) {
  if (!Array.isArray(areas)) throw new AppError('Delivery areas must be a list');
  return areas.map((a, i) => {
    const area = str(a.area);
    const pincode = str(a.pincode);
    if (!area) throw new AppError(`Delivery area ${i + 1} needs a name`);
    if (!/^\d{6}$/.test(pincode)) throw new AppError(`Delivery area ${i + 1} needs a valid 6-digit pincode`);
    const charge = num(a.charge, { min: 0 });
    if (charge == null) throw new AppError(`Delivery area ${i + 1} needs a valid charge`);
    return { area, pincode, charge, isActive: bool(a.isActive) };
  });
}

function sanitizeHolidays(holidays) {
  if (!Array.isArray(holidays)) throw new AppError('Holidays must be a list of dates');
  return holidays.map((h, i) => {
    const d = new Date(h);
    if (Number.isNaN(d.getTime())) throw new AppError(`Holiday ${i + 1} is not a valid date`);
    return d;
  });
}

// Field-by-field allowlist — every value is coerced/validated, never trusted
// as-is, since this single PATCH backs all 6 data tabs of Part D.11.
const FIELD_SANITIZERS = {
  // Shop
  shopOpen: bool,
  closedMessage: str,
  autoCloseTime: (v) => time(v, 'Auto-close time'),
  autoOpenTime: (v) => time(v, 'Auto-open time'),
  holidays: sanitizeHolidays,
  // Capacity
  dailyOrderCapacity: (v) => {
    const n = num(v, { min: 0, integer: true });
    if (n == null) throw new AppError('Daily order capacity must be a whole number of 0 or more');
    return n;
  },
  slots: sanitizeSlots,
  minPrepHours: (v) => {
    const n = num(v, { min: 0 });
    if (n == null) throw new AppError('Minimum prep hours must be 0 or more');
    return n;
  },
  maxAdvanceDays: (v) => {
    const n = num(v, { min: 1, integer: true });
    if (n == null) throw new AppError('Max advance days must be a whole number of 1 or more');
    return n;
  },
  // Payment
  upiId: str,
  upiQrImage: str,
  payeeName: str,
  acceptCOD: bool,
  acceptUPI: bool,
  // Delivery
  deliveryCharge: (v) => {
    const n = num(v, { min: 0 });
    if (n == null) throw new AppError('Delivery charge must be 0 or more');
    return n;
  },
  freeDeliveryAbove: (v) => {
    const n = num(v, { min: 0 });
    if (n == null) throw new AppError('Free-delivery threshold must be 0 or more');
    return n;
  },
  minOrderValue: (v) => {
    const n = num(v, { min: 0 });
    if (n == null) throw new AppError('Minimum order value must be 0 or more');
    return n;
  },
  packagingCharge: (v) => {
    const n = num(v, { min: 0 });
    if (n == null) throw new AppError('Packaging charge must be 0 or more');
    return n;
  },
  deliveryAreas: sanitizeDeliveryAreas,
  allowPickup: bool,
  pickupAddress: str,
  // Rules
  globalMinQty: (v) => {
    const n = num(v, { min: 1, integer: true });
    if (n == null) throw new AppError('Global minimum quantity must be a whole number of 1 or more');
    return n;
  },
  // Loyalty
  loyaltyEnabled: bool,
  pointsPerHundred: (v) => {
    const n = num(v, { min: 0 });
    if (n == null) throw new AppError('Points per ₹100 must be 0 or more');
    return n;
  },
  pointValue: (v) => {
    const n = num(v, { min: 0 });
    if (n == null) throw new AppError('Point value must be 0 or more');
    return n;
  },
  minPointsToRedeem: (v) => {
    const n = num(v, { min: 0, integer: true });
    if (n == null) throw new AppError('Minimum points to redeem must be a whole number of 0 or more');
    return n;
  },
  // Content
  announcementBar: str,
  announcementActive: bool,
  whatsappNumber: str,
  instagramUrl: str,
  aboutText: str,
};

export async function updateSettings(patch) {
  const update = {};
  for (const [key, value] of Object.entries(patch || {})) {
    const sanitize = FIELD_SANITIZERS[key];
    if (!sanitize) continue; // silently ignore unknown fields rather than erroring on extra keys
    update[key] = sanitize(value);
  }
  if (Object.keys(update).length === 0) throw new AppError('Nothing to update');

  const settings = await getSettings();
  Object.assign(settings, update);
  await settings.save();
  return settings;
}
