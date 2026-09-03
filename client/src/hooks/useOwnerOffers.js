import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { invalidateOffersCache } from './useOffers.js';

export function useOwnerOffers() {
  const [state, setState] = useState({ offers: [], loading: true, error: null });

  const load = useCallback(() => {
    return api
      .get('/owner/offers')
      .then(({ data }) => setState({ offers: data, loading: false, error: null }))
      .catch((err) =>
        setState((s) => ({ ...s, loading: false, error: err.response?.data?.message || 'Could not load offers' }))
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Any owner mutation changes what the public /offers/active list should
  // show next — drop the shared cache so customer-facing screens catch up.
  const refresh = useCallback(() => {
    invalidateOffersCache();
    return load();
  }, [load]);

  return { ...state, refresh };
}
