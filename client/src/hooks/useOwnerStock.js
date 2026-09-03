import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useOwnerStock() {
  const [state, setState] = useState({ products: [], loading: true, error: null });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    return api
      .get('/owner/products/stock')
      .then(({ data }) => setState({ products: data, loading: false, error: null }))
      .catch((err) =>
        setState((s) => ({ ...s, loading: false, error: err.response?.data?.message || 'Could not load stock' }))
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, setProducts: (updater) => setState((s) => ({ ...s, products: typeof updater === 'function' ? updater(s.products) : updater })), refresh: load };
}
