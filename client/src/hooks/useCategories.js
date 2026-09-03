import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useCategories() {
  const [state, setState] = useState({ categories: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    api
      .get('/categories')
      .then(({ data }) => {
        if (!cancelled) setState({ categories: data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ categories: [], loading: false, error: err.response?.data?.message || 'Could not load categories' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
