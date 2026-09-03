import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { isTerminalStatus } from '../lib/orderStatus.js';

const POLL_MS = 30_000;

/**
 * Public order-ID lookup (Part C.8) — no login required. Mirrors
 * useCustomerOrder's polling/change-detection shape but hits the public,
 * limited-projection tracking endpoint instead of the customer's own orders.
 */
export function useOrderTracking(orderId, onStatusChange) {
  const [state, setState] = useState({ order: null, loading: false, error: null });
  const prevStatus = useRef(null);
  const callbackRef = useRef(onStatusChange);
  callbackRef.current = onStatusChange;

  useEffect(() => {
    if (!orderId) {
      setState({ order: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    let timer = null;
    prevStatus.current = null;
    setState({ order: null, loading: true, error: null });

    const load = () => {
      api
        .get(`/orders/track/${orderId}`)
        .then(({ data }) => {
          if (cancelled) return;
          if (prevStatus.current && prevStatus.current !== data.orderStatus) {
            callbackRef.current?.(data);
          }
          prevStatus.current = data.orderStatus;
          setState({ order: data, loading: false, error: null });
          if (!isTerminalStatus(data.orderStatus)) {
            timer = setTimeout(load, POLL_MS);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setState({ order: null, loading: false, error: err.response?.data?.message || 'Order not found — please check the order ID' });
          }
        });
    };
    load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId]);

  return state;
}
