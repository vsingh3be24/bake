import { getSettings } from '../../services/settingsService.js';
import {
  getDateAvailability,
  getAvailabilityRange,
  getEarliestDeliveryDate,
  loadCartLines,
} from '../../services/availabilityService.js';
import { AppError } from '../../utils/AppError.js';

/**
 * Cart is passed on a GET as `items=<productId>:<qty>,<productId>:<qty>`.
 * Keeps the endpoint cacheable/linkable per the spec's `?date=&items[]=`.
 */
function parseItemsParam(raw) {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((pair) => {
      const [productId, qty] = pair.split(':');
      if (!productId) return null;
      return { productId: productId.trim(), qty: Number(qty) || 1 };
    })
    .filter(Boolean);
}

export async function getAvailability(req, res) {
  const settings = await getSettings();
  const cartLines = await loadCartLines(parseItemsParam(req.query.items));

  if (!req.query.date) throw new AppError('Date is required');

  const result = await getDateAvailability(req.query.date, settings, cartLines);
  res.json(result);
}

export async function getAvailabilityCalendar(req, res) {
  const settings = await getSettings();
  const cartLines = await loadCartLines(parseItemsParam(req.query.items));
  const result = await getAvailabilityRange(settings, cartLines);

  res.json({
    earliest: result.earliest,
    maxAdvanceDays: settings.maxAdvanceDays,
    days: result.days,
  });
}

export async function getEarliestDate(req, res) {
  const settings = await getSettings();
  const cartLines = await loadCartLines(parseItemsParam(req.query.items));
  const earliest = await getEarliestDeliveryDate(cartLines, settings);

  res.json({
    earliest,
    message: earliest ? null : 'All slots for the next few days are full — please try again later',
  });
}
