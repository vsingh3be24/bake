import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuthStore } from '../store/authStore.js';

export function useFavourites() {
  const [state, setState] = useState({ products: [], loading: true, error: null });
  const setFavourites = useAuthStore((s) => s.setFavourites);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    return api
      .get('/customer/favourites')
      .then(({ data }) => setState({ products: data, loading: false, error: null }))
      .catch((err) =>
        setState({ products: [], loading: false, error: err.response?.data?.message || 'Could not load favourites' })
      );
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const remove = useCallback(
    async (productId) => {
      const { data } = await api.delete(`/customer/favourites/${productId}`);
      setFavourites(data.favourites);
      setState((s) => ({ ...s, products: s.products.filter((p) => p._id !== productId) }));
    },
    [setFavourites]
  );

  return { ...state, reload, remove };
}
