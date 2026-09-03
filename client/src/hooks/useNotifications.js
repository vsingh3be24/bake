import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const POLL_MS = 30_000;

/** Shared by both the customer bell and the owner bell — same shape, different base path. */
export function useNotifications(role, enabled = true) {
  const base = `/${role}/notifications`;
  const [state, setState] = useState({ notifications: [], unreadCount: 0, loading: true });

  const load = useCallback(() => {
    if (!enabled) return;
    return api
      .get(base)
      .then(({ data }) => {
        setState({ notifications: data, unreadCount: data.filter((n) => !n.isRead).length, loading: false });
      })
      .catch(() => setState((s) => ({ ...s, loading: false })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, enabled]);

  useEffect(() => {
    if (!enabled) return;
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load, enabled]);

  const markRead = async (id) => {
    setState((s) => {
      const target = s.notifications.find((n) => n._id === id);
      if (!target || target.isRead) return s;
      return {
        ...s,
        notifications: s.notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
        unreadCount: Math.max(0, s.unreadCount - 1),
      };
    });
    try {
      await api.patch(`${base}/${id}/read`);
    } catch {
      load();
    }
  };

  const markAllRead = async () => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, isRead: true })), unreadCount: 0 }));
    try {
      await api.patch(`${base}/read-all`);
    } catch {
      load();
    }
  };

  return { ...state, refresh: load, markRead, markAllRead };
}
