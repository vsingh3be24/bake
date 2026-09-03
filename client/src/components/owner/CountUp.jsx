import { useEffect, useRef } from 'react';
import { useMotionValue, useTransform, animate } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';

/** Animates a number counting up from 0 on mount/change (E.8: "Dashboard stats — count-up numbers on mount"). */
export function CountUp({ value, prefix = '', duration = 0.8 }) {
  const { reduce } = useReducedMotion();
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => `${prefix}${Math.round(v).toLocaleString('en-IN')}`);
  const ref = useRef(null);

  useEffect(() => {
    if (reduce) {
      motionValue.set(value);
      if (ref.current) ref.current.textContent = `${prefix}${Number(value).toLocaleString('en-IN')}`;
      return;
    }
    const controls = animate(motionValue, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    return rounded.on('change', (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <span ref={ref}>{prefix}0</span>;
}
