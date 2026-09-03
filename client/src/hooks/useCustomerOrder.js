import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { isTerminalStatus } from '../lib/orderStatus.js';

const POLL_MS = 30_000;

/**
 * Polls every 30s (Part C.8) while the order is still moving, and stops once
 * it lands on a terminal status. `onStatusChange` fires only when the status
 * actually differs from the previous poll — never on the initial load, so a
 * page visit doesn't itself trigger a toast.
 */
export function useCustomerOrder(id, onStatusChange) {
  const [state, setState] = useState({ order: null, loading: true, error: null });
  const prevStatus = useRef(null);
  const callbackRef = useRef(onStatusChange);
  callbackRef.current = onStatusChange;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer = null;
    prevStatus.current = null;
    setState({ order: null, loading: true, error: null });

    const load = () => {
      api
        .get(`/customer/orders/${id}`)
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
          if (!cancelled) setState({ order: null, loading: false, error: err.response?.data?.message || 'Order not found' });
        });
    };
    load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  return state;
}
