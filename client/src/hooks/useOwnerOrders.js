import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const POLL_MS = 20_000;

export function useOwnerOrders(filters = {}) {
  const [state, setState] = useState({ orders: [], loading: true, error: null });
  const key = JSON.stringify(filters);

  const load = useCallback(() => {
    return api
      .get('/owner/orders', { params: filters })
      .then(({ data }) => setState({ orders: data, loading: false, error: null }))
      .catch((err) =>
        setState((s) => ({ ...s, loading: false, error: err.response?.data?.message || 'Could not load orders' }))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return { ...state, refresh: load };
}
