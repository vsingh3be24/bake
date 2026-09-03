import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';

export function Card({ hoverable = false, className = '', children, ...props }) {
  const { reduce } = useReducedMotion();

  return (
    <motion.div
      whileHover={hoverable && !reduce ? { y: -8 } : undefined}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={[
        'bg-paper rounded-md border border-[rgba(201,162,39,0.2)] shadow-sm',
        hoverable ? 'hover:shadow-md' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </motion.div>
  );
}
