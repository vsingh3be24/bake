import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useProducts(filters = {}) {
  const [state, setState] = useState({ products: [], page: 1, totalPages: 1, total: 0, loading: true, error: null });
  const key = JSON.stringify(filters);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    api
      .get('/products', { params: filters, signal: controller.signal })
      .then(({ data }) => {
        setState({ ...data, loading: false, error: null });
      })
      .catch((err) => {
        if (err.code === 'ERR_CANCELED') return;
        setState((s) => ({ ...s, loading: false, error: err.response?.data?.message || 'Could not load the menu' }));
      });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
