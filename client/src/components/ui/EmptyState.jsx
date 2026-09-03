import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';
import { Button } from './Button.jsx';

export function EmptyState({ icon: Icon, title, message, actionLabel, onAction, actionHref }) {
  const { reduce, duration } = useReducedMotion(0.5);

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration }}
      className="flex flex-col items-center gap-3 py-16 text-center"
    >
      {Icon && (
        <div className="mb-1 flex h-16 w-16 items-center justify-center rounded-pill bg-cream-deep">
          <Icon size={28} strokeWidth={1.5} className="text-brown-mute" />
        </div>
      )}
      <h3 className="font-heading text-2xl text-brown">{title}</h3>
      {message && <p className="max-w-sm text-brown-soft">{message}</p>}
      {actionLabel && (
        <Button as={actionHref ? 'a' : 'button'} href={actionHref} onClick={onAction} className="mt-3">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
