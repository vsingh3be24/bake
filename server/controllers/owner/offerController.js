import Offer from '../../models/Offer.js';
import Product from '../../models/Product.js';
import { AppError } from '../../utils/AppError.js';
import { isOfferCurrentlyActive } from '../../services/offerService.js';

const OFFER_TYPES = ['percent', 'flat', 'bogo', 'combo', 'free_delivery', 'free_item', 'bundle_price'];

/** A single label the offers screen can tab on (Part D.7: Live/Scheduled/Expired/Draft). */
function offerStatus(offer, now = new Date()) {
  if (!offer.isActive) return 'draft';
  if (offer.isFlash && !offer.isRecurring) {
    if (offer.endAt && now > offer.endAt) return 'expired';
    if (offer.startAt && now < offer.startAt) return 'scheduled';
  }
  return isOfferCurrentlyActive(offer, now) ? 'live' : 'scheduled';
}

function withStatus(offer) {
  const o = offer.toObject ? offer.toObject() : offer;
  return { ...o, status: offerStatus(offer) };
}

export async function listOffers(req, res) {
  const offers = await Offer.find().sort({ createdAt: -1 });
  res.json(offers.map(withStatus));
}

export async function getOffer(req, res) {
  const offer = await Offer.findById(req.params.id);
  if (!offer) throw new AppError('Offer not found', 404);
  res.json(withStatus(offer));
}

// Empty-string code from a form means "no code" — must be undefined so the
// sparse unique index doesn't collide every codeless offer on `null`/`""`.
// Server-owned fields are stripped rather than trusted from the request body.
// `usedCount` is the redemption counter `usageLimit` is checked against, so a
// writable one would let a stray (or crafted) payload silently reset a
// spent offer back to unlimited.
const SERVER_OWNED = ['_id', '__v', 'createdAt', 'usedCount', 'status'];

function normalizeBody(body) {
  const data = { ...body };
  for (const field of SERVER_OWNED) delete data[field];
  if (data.code != null && String(data.code).trim() === '') delete data.code;
  else if (data.code != null) data.code = String(data.code).trim().toUpperCase();
  return data;
}

export async function createOffer(req, res) {
  const data = normalizeBody(req.body);
  if (!data.title?.trim()) throw new AppError('Please give the offer a title');
  if (!OFFER_TYPES.includes(data.type)) throw new AppError('Please choose a valid offer type');

  try {
    const offer = await Offer.create(data);
    res.status(201).json(withStatus(offer));
  } catch (err) {
    if (err.code === 11000) throw new AppError('That offer code is already in use');
    throw err;
  }
}

export async function updateOffer(req, res) {
  const data = normalizeBody(req.body);
  if (data.type && !OFFER_TYPES.includes(data.type)) throw new AppError('Please choose a valid offer type');

  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!offer) throw new AppError('Offer not found', 404);
    res.json(withStatus(offer));
  } catch (err) {
    if (err.code === 11000) throw new AppError('That offer code is already in use');
    throw err;
  }
}

export async function deleteOffer(req, res) {
  const offer = await Offer.findByIdAndDelete(req.params.id);
  if (!offer) throw new AppError('Offer not found', 404);
  res.status(204).end();
}

export async function toggleOffer(req, res) {
  const offer = await Offer.findById(req.params.id);
  if (!offer) throw new AppError('Offer not found', 404);
  offer.isActive = !offer.isActive;
  await offer.save();
  res.json(withStatus(offer));
}

/** "Extend +2hrs" on a live flash offer — pushes endAt out and revives it if it had lapsed. */
export async function extendOffer(req, res) {
  const hours = Number(req.body.hours);
  if (!Number.isFinite(hours) || hours <= 0) throw new AppError('Please enter how many hours to extend');

  const offer = await Offer.findById(req.params.id);
  if (!offer) throw new AppError('Offer not found', 404);
  if (!offer.isFlash) throw new AppError('Only flash offers have an end time to extend');

  const base = offer.endAt && offer.endAt > new Date() ? offer.endAt : new Date();
  offer.endAt = new Date(base.getTime() + hours * 3_600_000);
  offer.isActive = true; // extending a lapsed offer brings it back
  await offer.save();
  res.json(withStatus(offer));
}

/**
 * One-tap "clear stock" flash (Part D.4/D.7): a percent-off flash on a single
 * product, live now for `hours`. This is what the Stock screen's ⚡ button hits.
 */
export async function quickFlash(req, res) {
  const { productId, percent, hours } = req.body;
  const pct = Number(percent);
  const hrs = Number(hours) || 6;
  if (!Number.isFinite(pct) || pct <= 0 || pct > 90) throw new AppError('Discount must be between 1% and 90%');

  const product = await Product.findById(productId).select('name');
  if (!product) throw new AppError('Product not found', 404);

  const now = new Date();
  const offer = await Offer.create({
    title: `Flash — ${pct}% off ${product.name}`,
    subtitle: 'Limited-time flash offer',
    type: 'percent',
    value: pct,
    appliesTo: 'product',
    targetIds: [product._id],
    isAutoApply: true,
    isFlash: true,
    startAt: now,
    endAt: new Date(now.getTime() + hrs * 3_600_000),
    showCountdown: true,
    flashBannerText: `⚡ ${pct}% OFF ${product.name} — limited time!`,
    isActive: true,
    // Stackable so a clear-stock flash ADDS to the shop's standing offers
    // (welcome discount, free delivery, BOGO) instead of suppressing them —
    // the point is to move the extra stock, not to give a worse deal.
    isStackable: true,
    priority: 6,
    badgeText: `${pct}% OFF`,
  });
  res.status(201).json(withStatus(offer));
}
