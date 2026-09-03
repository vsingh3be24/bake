import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const POLL_MS = 20_000;

export function useOwnerQueue(dateKey) {
  const [state, setState] = useState({ board: null, loading: true, error: null });

  const load = useCallback(() => {
    return api
      .get('/owner/queue', { params: dateKey ? { date: dateKey } : {} })
      .then(({ data }) => setState({ board: data, loading: false, error: null }))
      .catch((err) =>
        setState((s) => ({ ...s, loading: false, error: err.response?.data?.message || 'Could not load the queue' }))
      );
  }, [dateKey]);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return { ...state, refresh: load };
}
