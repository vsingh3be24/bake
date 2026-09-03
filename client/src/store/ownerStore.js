import { create } from 'zustand';
import { api } from '../lib/api.js';

// Same no-persist pattern as authStore — the real session lives in the
// httpOnly owner cookie, so every load re-asks the server via fetchMe().
export const useOwnerStore = create((set) => ({
  owner: null,
  status: 'idle', // 'idle' | 'loading' | 'ready'

  fetchMe: async () => {
    set({ status: 'loading' });
    try {
      const { data } = await api.get('/owner/me');
      set({ owner: data, status: 'ready' });
    } catch {
      set({ owner: null, status: 'ready' });
    }
  },

  login: async (phone, password) => {
    const { data } = await api.post('/owner/login', { phone, password });
    set({ owner: data, status: 'ready' });
    return data;
  },

  logout: async () => {
    await api.post('/owner/logout');
    set({ owner: null, status: 'ready' });
  },
}));
