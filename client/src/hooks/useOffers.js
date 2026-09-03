import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

// Shared across every caller (Home, Cart, FlashBar, and now every product
// card's flash ribbon) so mounting many components never fires N+1 requests
// for the same active-offers list.
let cached = null;
let inFlight = null;
const subscribers = new Set();

function notify(state) {
  cached = state;
  subscribers.forEach((fn) => fn(state));
}

function load() {
  if (cached || inFlight) return inFlight;
  inFlight = api
    .get('/offers/active')
    .then(({ data }) => {
      notify({ offers: data, loading: false, error: null });
      inFlight = null;
    })
    .catch((err) => {
      notify({ offers: [], loading: false, error: err.response?.data?.message || 'Could not load offers' });
      inFlight = null;
    });
  return inFlight;
}

export function useOffers() {
  const [state, setState] = useState(cached || { offers: [], loading: true, error: null });

  useEffect(() => {
    if (cached) setState(cached);
    subscribers.add(setState);
    load();
    return () => subscribers.delete(setState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

/** Call after an owner mutation (create/toggle/extend/quick-flash) so the next mount refetches. */
export function invalidateOffersCache() {
  cached = null;
  inFlight = null;
}
