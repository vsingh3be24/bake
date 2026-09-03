import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import { timeAgo } from '../../lib/format.js';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';

export function NotificationBell({ notifications, unreadCount, onMarkRead, onMarkAllRead, align = 'right', iconClassName = '' }) {
  const navigate = useNavigate();
  const { reduce } = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const openItem = (n) => {
    onMarkRead(n._id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        className={`relative flex h-10 w-10 items-center justify-center rounded-pill text-brown-soft transition-colors hover:bg-[rgba(74,44,26,0.06)] ${iconClassName}`}
      >
        <Bell size={20} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-pill bg-maroon px-1 text-xs font-semibold text-cream">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -8 }}
            transition={{ duration: reduce ? 0 : 0.15 }}
            className={`absolute top-full z-50 mt-2 w-80 max-w-[90vw] rounded-md border border-[rgba(169,141,116,0.25)] bg-paper shadow-lg ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            <div className="flex items-center justify-between border-b border-[rgba(169,141,116,0.2)] px-4 py-3">
              <p className="font-medium text-brown">Notifications</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="flex items-center gap-1 text-xs font-medium text-maroon hover:underline"
                >
                  <CheckCheck size={13} strokeWidth={1.75} /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-brown-mute">No notifications yet</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n._id}
                    type="button"
                    onClick={() => openItem(n)}
                    className={[
                      'flex w-full flex-col items-start gap-0.5 border-b border-[rgba(169,141,116,0.12)] px-4 py-3 text-left last:border-0 hover:bg-cream-deep',
                      n.isRead ? '' : 'bg-[rgba(140,29,47,0.04)]',
                    ].join(' ')}
                  >
                    <div className="flex w-full items-center gap-2">
                      {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-pill bg-maroon" />}
                      <span className={`text-sm ${n.isRead ? 'text-brown-soft' : 'font-medium text-brown'}`}>{n.title}</span>
                    </div>
                    {n.body && <p className="text-xs text-brown-mute">{n.body}</p>}
                    <span className="text-[11px] text-brown-mute">{timeAgo(n.createdAt)}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
