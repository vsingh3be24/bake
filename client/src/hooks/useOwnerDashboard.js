import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const POLL_MS = 20_000;

export function useOwnerDashboard() {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  const load = useCallback(() => {
    return api
      .get('/owner/dashboard')
      .then(({ data }) => setState({ data, loading: false, error: null }))
      .catch((err) =>
        setState((s) => ({ ...s, loading: false, error: err.response?.data?.message || 'Could not load the dashboard' }))
      );
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return { ...state, refresh: load };
}
