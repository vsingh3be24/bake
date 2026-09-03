import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useOwnerOrder(id) {
  const [state, setState] = useState({ order: null, loading: true, error: null });

  const load = useCallback(() => {
    if (!id) return;
    return api
      .get(`/owner/orders/${id}`)
      .then(({ data }) => setState({ order: data, loading: false, error: null }))
      .catch((err) => setState({ order: null, loading: false, error: err.response?.data?.message || 'Order not found' }));
  }, [id]);

  useEffect(() => {
    setState({ order: null, loading: true, error: null });
    load();
  }, [load]);

  return { ...state, refresh: load };
}
