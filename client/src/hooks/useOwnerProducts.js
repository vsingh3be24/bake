import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useOwnerProducts(filters = {}) {
  const [state, setState] = useState({ products: [], loading: true, error: null });
  const key = JSON.stringify(filters);

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    return api
      .get('/owner/products', { params: filters })
      .then(({ data }) => setState({ products: data, loading: false, error: null }))
      .catch((err) =>
        setState((s) => ({ ...s, loading: false, error: err.response?.data?.message || 'Could not load products' }))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}
