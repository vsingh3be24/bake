import { useEffect, useState } from 'react';

function diffParts(targetMs) {
  const totalMs = Math.max(targetMs - Date.now(), 0);
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    totalMs,
    expired: totalMs <= 0,
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function useCountdown(target) {
  const targetMs = target ? new Date(target).getTime() : null;
  const [parts, setParts] = useState(() => (targetMs ? diffParts(targetMs) : null));

  useEffect(() => {
    if (!targetMs) {
      setParts(null);
      return;
    }
    setParts(diffParts(targetMs));
    const interval = setInterval(() => {
      setParts(diffParts(targetMs));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetMs]);

  return parts;
}
