import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useOwnerCustomers(filters = {}) {
  const [state, setState] = useState({ customers: [], loading: true, error: null });
  const key = JSON.stringify(filters);

  const load = useCallback(() => {
    return api
      .get('/owner/customers', { params: filters })
      .then(({ data }) => setState({ customers: data, loading: false, error: null }))
      .catch((err) =>
        setState((s) => ({ ...s, loading: false, error: err.response?.data?.message || 'Could not load customers' }))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    load();
  }, [load]);

  return { ...state, refresh: load };
}
