import { shopMinutesNow, shopDayKey } from '../utils/shopTime.js';

/**
 * Is the offer live *right now*? Recurring windows and flash start/end are
 * evaluated in the SHOP's timezone, not the server's — Render runs UTC while
 * the bakery runs IST, so a naive getDay()/getHours() would open a "Sunday
 * 9am" flash at the wrong wall-clock time for customers.
 */
export function isOfferCurrentlyActive(offer, now = new Date()) {
  if (!offer.isActive) return false;

  if (offer.isRecurring) {
    // Shop-local day-of-week + minutes-since-midnight.
    const shopDow = new Date(`${shopDayKey(now)}T00:00:00Z`).getUTCDay();
    if (!(offer.recurDays || []).includes(shopDow)) return false;
    const [startH, startM] = (offer.recurStartTime || '00:00').split(':').map(Number);
    const [endH, endM] = (offer.recurEndTime || '23:59').split(':').map(Number);
    const mins = shopMinutesNow(now);
    return mins >= startH * 60 + startM && mins <= endH * 60 + endM;
  }

  if (offer.isFlash) {
    if (offer.startAt && now < offer.startAt) return false;
    if (offer.endAt && now > offer.endAt) return false;
    return true;
  }

  return true;
}

/** Sum of the subtotals of cart lines this offer's appliesTo targets. */
function eligibleSubtotal(offer, items) {
  if (offer.appliesTo === 'all' || offer.appliesTo === 'cart_total') {
    return items.reduce((sum, it) => sum + it.subtotal, 0);
  }
  const targetIds = new Set((offer.targetIds || []).map(String));
  return items.reduce((sum, it) => {
    const matches =
      offer.appliesTo === 'product'
        ? targetIds.has(String(it.productId))
        : targetIds.has(String(it.category?._id));
    return matches ? sum + it.subtotal : sum;
  }, 0);
}

/** Cart lines matching this offer's targets (for per-unit maths like bogo). */
function eligibleLines(offer, items) {
  if (offer.appliesTo === 'all' || offer.appliesTo === 'cart_total') return items;
  const targetIds = new Set((offer.targetIds || []).map(String));
  return items.filter((it) =>
    offer.appliesTo === 'product'
      ? targetIds.has(String(it.productId))
      : targetIds.has(String(it.category?._id))
  );
}

/**
 * Discount for ONE offer against already-validated cart lines. Pure and
 * side-effect-free — the stacking engine calls this per candidate. Returns
 * `{ valid, discountAmount, freeDelivery }` or `{ valid:false, message }`.
 *
 * Type semantics (Part B.2):
 *  - percent      : value% of eligible subtotal, capped at maxDiscount
 *  - flat         : ₹value off, never more than the eligible subtotal
 *  - free_delivery: no rupee discount, delivery becomes free
 *  - bogo         : within eligible items, the cheapest unit of every
 *                   `groupSize` (= smallest eligible minQty, default 4) is free
 *  - free_item    : freeItemId is free — but only if it's already in the cart
 *  - bundle_price : if every bundleProduct is present, the bundle costs
 *                   bundlePrice (discount = their combined price − bundlePrice)
 *  - combo        : value% off the eligible items, but ONLY when the cart has
 *                   at least one item from EACH target
 */
export function computeOfferDiscount(offer, items, itemsTotal) {
  if (itemsTotal < (offer.minOrderValue || 0)) {
    return { valid: false, message: `Minimum order must be ₹${offer.minOrderValue}` };
  }

  const eligible = eligibleSubtotal(offer, items);
  const needsEligible = ['percent', 'flat', 'bogo', 'combo'].includes(offer.type);
  if (needsEligible && offer.appliesTo !== 'all' && offer.appliesTo !== 'cart_total' && eligible === 0) {
    return { valid: false, message: 'This offer does not apply to the items in your cart' };
  }

  switch (offer.type) {
    case 'percent': {
      let discountAmount = Math.round((eligible * offer.value) / 100);
      if (offer.maxDiscount) discountAmount = Math.min(discountAmount, offer.maxDiscount);
      return { valid: true, discountAmount, freeDelivery: false };
    }

    case 'flat':
      return { valid: true, discountAmount: Math.min(offer.value, eligible), freeDelivery: false };

    case 'free_delivery':
      return { valid: true, discountAmount: 0, freeDelivery: true };

    case 'bogo': {
      const lines = eligibleLines(offer, items);
      const totalQty = lines.reduce((sum, l) => sum + l.qty, 0);
      if (totalQty === 0) {
        return { valid: false, message: 'Add the eligible items to use this offer' };
      }
      // groupSize = "buy N"; smallest minQty among eligible lines, min 2.
      const groupSize = Math.max(2, Math.min(...lines.map((l) => l.minQty || 4)));
      const freePerGroup = Math.max(1, offer.value || 1);
      const freeUnits = Math.floor(totalQty / groupSize) * freePerGroup;
      if (freeUnits <= 0) {
        return { valid: false, message: `Buy ${groupSize} to get ${freePerGroup} free` };
      }
      // Make the cheapest units free: build a sorted unit-price list.
      const unitPrices = [];
      for (const l of lines) for (let i = 0; i < l.qty; i++) unitPrices.push(l.effectivePrice);
      unitPrices.sort((a, b) => a - b);
      const discountAmount = unitPrices.slice(0, freeUnits).reduce((s, p) => s + p, 0);
      return { valid: true, discountAmount, freeDelivery: false };
    }

    case 'free_item': {
      const line = items.find((it) => String(it.productId) === String(offer.freeItemId));
      if (!line) {
        return { valid: false, message: 'Add the free item to your cart to claim it' };
      }
      return { valid: true, discountAmount: line.effectivePrice, freeDelivery: false };
    }

    case 'bundle_price': {
      const bundleIds = (offer.bundleProducts || []).map(String);
      if (bundleIds.length === 0 || offer.bundlePrice == null) {
        return { valid: false, message: 'This bundle is not configured correctly' };
      }
      let bundleCost = 0;
      for (const id of bundleIds) {
        const line = items.find((it) => String(it.productId) === id);
        if (!line) {
          return { valid: false, message: 'Add every bundle item to unlock this price' };
        }
        bundleCost += line.effectivePrice; // one unit of each
      }
      const discountAmount = Math.max(0, bundleCost - offer.bundlePrice);
      return { valid: true, discountAmount, freeDelivery: false };
    }

    case 'combo': {
      // Require at least one cart item from EACH target.
      const targetIds = (offer.targetIds || []).map(String);
      const hasAll = targetIds.every((tid) =>
        items.some((it) =>
          offer.appliesTo === 'product'
            ? String(it.productId) === tid
            : String(it.category?._id) === tid
        )
      );
      if (!hasAll) {
        return { valid: false, message: 'Add all the combo items to get this deal' };
      }
      const discountAmount = Math.round((eligible * (offer.value || 0)) / 100);
      return { valid: true, discountAmount, freeDelivery: false };
    }

    default:
      return { valid: false, message: 'This offer can only be verified at checkout' };
  }
}
