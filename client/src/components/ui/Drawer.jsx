import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';

export function Drawer({ open, onClose, title, side = 'right', children, footer }) {
  const { reduce } = useReducedMotion();
  const fromX = side === 'right' ? '100%' : '-100%';

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            className="absolute inset-0 bg-[rgba(0,0,0,0.45)] backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: reduce ? 0 : fromX, opacity: reduce ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduce ? 0 : fromX, opacity: reduce ? 0 : 1 }}
            transition={{ duration: reduce ? 0.15 : 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={[
              'relative flex h-full w-full max-w-md flex-col bg-paper shadow-lg',
              side === 'right' ? 'ml-auto' : 'mr-auto',
            ].join(' ')}
          >
            <div className="flex items-center justify-between border-b border-[rgba(169,141,116,0.2)] px-6 py-4">
              <h2 className="font-heading text-xl text-brown">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-pill p-1.5 text-brown-soft transition-colors hover:bg-[rgba(74,44,26,0.06)]"
              >
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <div className="border-t border-[rgba(169,141,116,0.2)] px-6 py-4">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
