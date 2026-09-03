import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useSettings() {
  const [state, setState] = useState({ settings: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    api
      .get('/settings/public')
      .then(({ data }) => {
        if (!cancelled) setState({ settings: data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ settings: null, loading: false, error: err.response?.data?.message || 'Could not load settings' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
