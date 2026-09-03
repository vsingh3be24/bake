import { useCallback } from 'react';
import confetti from 'canvas-confetti';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';

const BRAND_COLORS = ['#8C1D2F', '#C9A227', '#5C6B33', '#C2185B'];

export function useConfetti() {
  const { reduce } = useReducedMotion();

  return useCallback(
    (options = {}) => {
      if (reduce) return; // motion-sensitive users don't get the burst
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: BRAND_COLORS,
        ...options,
      });
    },
    [reduce]
  );
}
