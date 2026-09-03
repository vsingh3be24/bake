import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useRewards() {
  const [state, setState] = useState({ rewards: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    api
      .get('/customer/rewards')
      .then(({ data }) => {
        if (!cancelled) setState({ rewards: data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ rewards: null, loading: false, error: err.response?.data?.message || 'Could not load rewards' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
