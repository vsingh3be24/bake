import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useOwnerCustomer(id) {
  const [state, setState] = useState({ customer: null, orders: [], loading: true, error: null });

  const load = useCallback(() => {
    if (!id) return;
    return api
      .get(`/owner/customers/${id}`)
      .then(({ data }) => setState({ customer: data.customer, orders: data.orders, loading: false, error: null }))
      .catch((err) =>
        setState({ customer: null, orders: [], loading: false, error: err.response?.data?.message || 'Customer not found' })
      );
  }, [id]);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    load();
  }, [load]);

  return { ...state, refresh: load };
}
