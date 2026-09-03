import { AnimatePresence, motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useOffers } from '../../hooks/useOffers.js';
import { useCountdown } from '../../hooks/useCountdown.js';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';

function pad(n) {
  return String(n).padStart(2, '0');
}

const URGENT_THRESHOLD_MS = 10 * 60 * 1000;

export function FlashBar() {
  const { offers } = useOffers();
  const { reduce } = useReducedMotion();
  const flash = offers.find((o) => o.isFlash && o.endAt && o.showCountdown);
  const countdown = useCountdown(flash?.endAt);
  const urgent = countdown && !countdown.expired && countdown.totalMs <= URGENT_THRESHOLD_MS;
  const baseColor = flash?.flashBannerColor || 'var(--crimson)';

  return (
    <AnimatePresence>
      {flash && (!countdown || !countdown.expired) && (
        <motion.div
          key={flash._id}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.3 }}
          className="overflow-hidden"
        >
          {/* Separate layer for the last-10-min pulse, so its keyframe
              animation never has to reconcile with the parent's enter/exit tween. */}
          <motion.div
            className="flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium text-cream"
            style={!urgent || reduce ? { backgroundColor: baseColor } : undefined}
            animate={urgent && !reduce ? { backgroundColor: ['#C62828', baseColor] } : undefined}
            transition={urgent && !reduce ? { duration: 1, repeat: Infinity, repeatType: 'reverse' } : undefined}
          >
            <motion.span animate={reduce ? {} : { scale: [1, 1.15, 1] }} transition={{ duration: 1, repeat: Infinity }}>
              <Zap size={16} strokeWidth={2} />
            </motion.span>
            <span>{flash.flashBannerText || flash.title}</span>
            {countdown && !countdown.expired && (
              <span className="tabular-nums font-semibold">
                — {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
              </span>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
