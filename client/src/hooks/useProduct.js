import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useProduct(slug) {
  const [state, setState] = useState({ product: null, loading: true, error: null });

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setState({ product: null, loading: true, error: null });

    api
      .get(`/products/${slug}`)
      .then(({ data }) => {
        if (cancelled) return;
        setState({ product: data, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          product: null,
          loading: false,
          error: err.response?.data?.message || 'This item was not found',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return state;
}
