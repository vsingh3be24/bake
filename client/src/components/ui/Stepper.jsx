import { Minus, Plus } from 'lucide-react';

export function Stepper({ value, onChange, min = 1, max = 99, step = 1, disabled = false }) {
  const atMin = value <= min;
  const atMax = value >= max;

  const decrement = () => {
    const next = value - step;
    onChange(Math.max(next, min));
  };

  const increment = () => {
    const next = value + step;
    onChange(Math.min(next, max));
  };

  return (
    <div className="inline-flex items-center gap-3 rounded-pill border border-[rgba(169,141,116,0.35)] bg-paper px-1 py-1">
      <button
        type="button"
        onClick={decrement}
        disabled={disabled || atMin}
        aria-label="Decrease quantity"
        className="flex h-8 w-8 items-center justify-center rounded-pill text-brown-soft transition-colors hover:bg-[rgba(74,44,26,0.06)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Minus size={16} strokeWidth={1.75} />
      </button>
      <span className="min-w-[1.5rem] text-center font-semibold tabular-nums text-brown">{value}</span>
      <button
        type="button"
        onClick={increment}
        disabled={disabled || atMax}
        aria-label="Increase quantity"
        className="flex h-8 w-8 items-center justify-center rounded-pill text-brown-soft transition-colors hover:bg-[rgba(74,44,26,0.06)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={16} strokeWidth={1.75} />
      </button>
    </div>
  );
}
