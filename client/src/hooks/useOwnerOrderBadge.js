import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const POLL_MS = 20_000;

/** Count of orders still awaiting the owner's first action — drives the sidebar badge. */
export function useOwnerOrderBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api
        .get('/owner/orders', { params: { status: 'placed' } })
        .then(({ data }) => {
          if (!cancelled) setCount(data.length);
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return count;
}
