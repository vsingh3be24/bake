import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useCustomerOrders(status = 'all') {
  const [state, setState] = useState({ orders: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    api
      .get('/customer/orders', { params: status !== 'all' ? { status } : {} })
      .then(({ data }) => {
        if (!cancelled) setState({ orders: data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ orders: [], loading: false, error: err.response?.data?.message || 'Could not load orders' });
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  return state;
}
