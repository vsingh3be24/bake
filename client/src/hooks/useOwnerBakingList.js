import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useOwnerBakingList(dateKey) {
  const [state, setState] = useState({ list: null, loading: true, error: null });

  const load = useCallback(() => {
    return api
      .get('/owner/baking-list', { params: dateKey ? { date: dateKey } : {} })
      .then(({ data }) => setState({ list: data, loading: false, error: null }))
      .catch((err) =>
        setState((s) => ({ ...s, loading: false, error: err.response?.data?.message || 'Could not load the baking list' }))
      );
  }, [dateKey]);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    load();
  }, [load]);

  return { ...state, refresh: load };
}
