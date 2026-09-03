import { Children, cloneElement } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';

function withKeySuffix(children, suffix) {
  return Children.map(children, (child) =>
    cloneElement(child, { key: `${child.key ?? ''}-${suffix}` })
  );
}

export function Marquee({ children, duration = 22, className = '' }) {
  const { reduce } = useReducedMotion();

  if (reduce) {
    return <div className={`flex gap-5 overflow-x-auto ${className}`}>{children}</div>;
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <div
        className="flex w-max gap-5 animate-marquee hover:[animation-play-state:paused]"
        style={{ animationDuration: `${duration}s` }}
      >
        {withKeySuffix(children, 'a')}
        {withKeySuffix(children, 'b')}
      </div>
    </div>
  );
}
