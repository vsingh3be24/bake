import { create } from 'zustand';
import { api } from '../lib/api.js';

// No persist middleware here on purpose — the real session lives in the
// httpOnly cookie, invisible to JS. Caching a stale customer object client-
// side could show "logged in" after the cookie expired elsewhere; every load
// re-asks the server via fetchMe() instead of trusting local state.
export const useAuthStore = create((set) => ({
  customer: null,
  status: 'idle', // 'idle' | 'loading' | 'ready'

  fetchMe: async () => {
    set({ status: 'loading' });
    try {
      const { data } = await api.get('/customer/me');
      set({ customer: data, status: 'ready' });
    } catch {
      set({ customer: null, status: 'ready' });
    }
  },

  login: async (phone, password) => {
    const { data } = await api.post('/customer/login', { phone, password });
    set({ customer: data, status: 'ready' });
    return data;
  },

  signup: async (name, phone, password) => {
    const { data } = await api.post('/customer/signup', { name, phone, password });
    set({ customer: data, status: 'ready' });
    return data;
  },

  claim: async (phone, password) => {
    const { data } = await api.post('/customer/claim', { phone, password });
    set({ customer: data, status: 'ready' });
    return data;
  },

  logout: async () => {
    await api.post('/customer/logout');
    set({ customer: null, status: 'ready' });
  },

  updateProfile: async (updates) => {
    const { data } = await api.patch('/customer/me', updates);
    set({ customer: data });
    return data;
  },

  setFavourites: (favourites) =>
    set((s) => ({ customer: s.customer ? { ...s.customer, favourites } : s.customer })),
}));
