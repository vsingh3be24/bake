import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

/**
 * The authoritative cart total, offers and all. Calls the same engine checkout
 * uses, so the number the customer sees never changes at the last step.
 * `phone` (once entered at checkout) sharpens first-order / per-customer gating.
 */
export function useOfferPreview({ items, code = null, phone = null, deliveryType = 'delivery' }) {
  const [state, setState] = useState({
    appliedOffers: [],
    totalDiscount: 0,
    freeDelivery: false,
    codeRejected: null,
    loading: false,
    error: null,
  });

  const key = JSON.stringify({
    items: items.map((i) => [i.productId, i.variantLabel, i.qty]),
    code,
    phone,
    deliveryType,
  });

  useEffect(() => {
    if (items.length === 0) {
      setState({
        appliedOffers: [],
        totalDiscount: 0,
        freeDelivery: false,
        codeRejected: null,
        loading: false,
        error: null,
      });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    api
      .post('/offers/preview', {
        items: items.map((i) => ({ productId: i.productId, variantLabel: i.variantLabel, qty: i.qty })),
        code,
        phone,
        deliveryType,
      })
      .then(({ data }) => {
        if (!cancelled) setState({ ...data, loading: false, error: null });
      })
      .catch((err) => {
        // Money-affecting: if pricing can't be verified, don't silently show
        // full-price-minus-nothing as if that were the confirmed total.
        if (!cancelled)
          setState({
            appliedOffers: [],
            totalDiscount: 0,
            freeDelivery: false,
            codeRejected: null,
            loading: false,
            error: err.response?.data?.message || 'Could not check offers — pricing shown may not include discounts',
          });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
