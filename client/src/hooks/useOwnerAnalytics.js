import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useOwnerAnalytics(params) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const key = JSON.stringify(params);

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    return api
      .get('/owner/analytics', { params })
      .then(({ data }) => setState({ data, loading: false, error: null }))
      .catch((err) =>
        setState((s) => ({ ...s, loading: false, error: err.response?.data?.message || 'Could not load analytics' }))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}
