import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useCartStore, lineKey } from '../store/cartStore.js';

export function useCartValidation() {
  const items = useCartStore((s) => s.items);
  const syncItem = useCartStore((s) => s.syncItem);
  const [state, setState] = useState({ result: null, loading: true, error: null, priceChanged: false });

  // Only re-run when the *shape* of the cart changes (add/remove/qty edit),
  // not on every store update — syncItem below would otherwise retrigger this.
  const key = JSON.stringify(items.map((i) => [i.productId, i.variantLabel, i.qty]));

  useEffect(() => {
    if (items.length === 0) {
      setState({ result: { items: [], itemsTotal: 0, hasIssues: false, deliveryCharge: 0 }, loading: false, error: null, priceChanged: false });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    api
      .post('/cart/validate', {
        items: items.map((i) => ({ productId: i.productId, variantLabel: i.variantLabel, qty: i.qty })),
      })
      .then(({ data }) => {
        if (cancelled) return;

        let priceChanged = false;
        for (const line of data.items) {
          if (!line.valid) continue;
          const key = lineKey(line.productId, line.variantLabel);
          const stored = items.find((i) => i.key === key);
          if (!stored) continue;

          const updates = {};
          if (stored.price !== line.effectivePrice) {
            updates.price = line.effectivePrice;
            priceChanged = true;
          }
          if (line.qtyAdjusted && stored.qty !== line.qty) {
            updates.qty = line.qty;
          }
          if (Object.keys(updates).length > 0) syncItem(key, updates);
        }

        setState({ result: data, loading: false, error: null, priceChanged });
      })
      .catch((err) => {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: err.response?.data?.message || 'Could not check your cart' }));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
