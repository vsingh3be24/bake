import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useOwnerSettings() {
  const [state, setState] = useState({ settings: null, loading: true, error: null });

  const load = useCallback(() => {
    return api
      .get('/owner/settings')
      .then(({ data }) => setState({ settings: data, loading: false, error: null }))
      .catch((err) =>
        setState((s) => ({ ...s, loading: false, error: err.response?.data?.message || 'Could not load settings' }))
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}
