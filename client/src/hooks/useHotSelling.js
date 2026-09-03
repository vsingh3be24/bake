import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useHotSelling() {
  const [state, setState] = useState({ products: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    api
      .get('/products/hot-selling')
      .then(({ data }) => {
        if (!cancelled) setState({ products: data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ products: [], loading: false, error: err.response?.data?.message || 'Could not load' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
