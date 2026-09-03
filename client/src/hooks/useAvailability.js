import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { serializeItemsParam } from '../lib/availability.js';

/**
 * Loads the bookable calendar for the current cart. Re-fetches when the cart's
 * product/qty mix changes, since that changes which days are reachable.
 */
export function useAvailability(items = []) {
  const [state, setState] = useState({
    days: [],
    earliest: null,
    maxAdvanceDays: 15,
    loading: true,
    error: null,
  });

  const itemsParam = serializeItemsParam(items);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    api
      .get('/availability/calendar', {
        params: itemsParam ? { items: itemsParam } : {},
        signal: controller.signal,
      })
      .then(({ data }) => {
        setState({
          days: data.days || [],
          earliest: data.earliest || null,
          maxAdvanceDays: data.maxAdvanceDays,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (err.code === 'ERR_CANCELED') return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err.response?.data?.message || 'Could not load delivery dates',
        }));
      });

    return () => controller.abort();
  }, [itemsParam]);

  return state;
}
