import { useEffect } from 'react';
import Lenis from 'lenis';
import { useReducedMotion } from './useReducedMotion.js';

export function useLenis() {
  const { reduce } = useReducedMotion();

  useEffect(() => {
    if (reduce) return; // respect prefers-reduced-motion — no forced smooth scroll

    const lenis = new Lenis({ duration: 1.2, smoothWheel: true });
    let rafId;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [reduce]);
}
