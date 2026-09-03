import Offer from '../../models/Offer.js';
import { isOfferCurrentlyActive } from '../../services/offerService.js';
import { resolveCartOffers } from '../../services/offerEngine.js';
import { validateCartItems } from '../../services/cartService.js';
import { getSettings } from '../../services/settingsService.js';
import { AppError } from '../../utils/AppError.js';

export async function getActiveOffers(req, res) {
  const offers = await Offer.find({ isActive: true }).sort({ priority: -1, createdAt: -1 });
  res.json(offers.filter((o) => isOfferCurrentlyActive(o)));
}

/**
 * The real total the customer will be charged, offers and all. Runs the same
 * stacking engine as checkout so the cart never shows a number that changes at
 * the last step. Auth (cookie) and an optional typed phone sharpen the
 * first-order / per-customer gating; a guest just sees the un-gated result.
 */
export async function previewCartOffers(req, res) {
  const { items, code, phone, deliveryType } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.json({ appliedOffers: [], totalDiscount: 0, freeDelivery: false, codeRejected: null, itemsTotal: 0 });
  }

  const settings = await getSettings();
  const { items: validated, itemsTotal, hasIssues } = await validateCartItems(items);
  if (hasIssues) throw new AppError('Please check your cart first — something is out of stock');

  const outcome = await resolveCartOffers({
    items: validated,
    itemsTotal,
    offerCode: code || null,
    customerId: req.customer?._id || null,
    phone: phone?.trim() || null,
    freeDeliveryValue: deliveryType === 'pickup' ? 0 : settings.deliveryCharge,
  });

  res.json({ ...outcome, itemsTotal });
}

/**
 * Validate a single typed code against the cart. Runs the full engine (so the
 * answer matches what checkout will actually do), then reports the code's own
 * contribution — the discount it adds on top of whatever auto-apply offers
 * were already stacked, so the customer sees the true incremental saving.
 */
export async function validateOfferCode(req, res) {
  const { code, items, phone, deliveryType } = req.body;
  if (!code) throw new AppError('Offer code is required');
  if (!Array.isArray(items) || items.length === 0) throw new AppError('Your cart is empty');

  const settings = await getSettings();
  const { items: validated, itemsTotal, hasIssues } = await validateCartItems(items);
  if (hasIssues) throw new AppError('Please check your cart first — something is out of stock');

  const withCode = await resolveCartOffers({
    items: validated,
    itemsTotal,
    offerCode: code,
    customerId: req.customer?._id || null,
    phone: phone?.trim() || null,
    freeDeliveryValue: deliveryType === 'pickup' ? 0 : settings.deliveryCharge,
  });

  if (withCode.codeRejected) throw new AppError(withCode.codeRejected);

  const codeUpper = code.trim().toUpperCase();
  const applied = withCode.appliedOffers.find((o) => o.code === codeUpper);
  if (!applied) throw new AppError('This offer code is not valid');

  res.json({
    offerId: applied.offerId,
    code: applied.code,
    title: applied.title,
    discountAmount: withCode.totalDiscount,
    freeDelivery: withCode.freeDelivery,
    appliedOffers: withCode.appliedOffers,
  });
}
