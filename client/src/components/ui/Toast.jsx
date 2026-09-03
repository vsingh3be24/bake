import { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { ToastContext } from '../../hooks/useToast.js';

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const COLORS = {
  success: 'text-in-stock',
  error: 'text-out-stock',
  info: 'text-info',
};

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (message, { type = 'info', duration = 3500 } = {}) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      show: addToast,
      success: (msg, opts) => addToast(msg, { ...opts, type: 'success' }),
      error: (msg, opts) => addToast(msg, { ...opts, type: 'error' }),
      info: (msg, opts) => addToast(msg, { ...opts, type: 'info' }),
      dismiss,
    }),
    [addToast, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto">
          <AnimatePresence>
            {toasts.map((toast) => {
              const Icon = ICONS[toast.type];
              return (
                <motion.div
                  key={toast.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-md bg-paper px-4 py-3 shadow-lg border border-[rgba(169,141,116,0.2)]"
                >
                  <Icon size={20} strokeWidth={1.75} className={`mt-0.5 shrink-0 ${COLORS[toast.type]}`} />
                  <p className="flex-1 text-sm text-brown">{toast.message}</p>
                  <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    aria-label="Close"
                    className="shrink-0 rounded-pill p-1 text-brown-mute hover:bg-[rgba(74,44,26,0.06)]"
                  >
                    <X size={16} strokeWidth={1.75} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
