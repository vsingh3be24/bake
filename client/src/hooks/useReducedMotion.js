import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';

// Wraps framer-motion's reduced-motion detection and hands back a ready-to-use
// duration so callers don't have to branch on the boolean themselves.
export function useReducedMotion(fullDuration = 0.6) {
  const reduce = useFramerReducedMotion();
  return { reduce, duration: reduce ? 0 : fullDuration };
}
