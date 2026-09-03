import { CalendarX } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { formatDayParts, reasonLabel } from '../../lib/availability.js';

export function DatePicker({ days, loading, error, selected, onSelect }) {
  if (loading) {
    return (
      <div className="flex gap-2.5 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-16 shrink-0" />
        ))}
      </div>
    );
  }

  if (error) return <p className="text-sm text-out-stock">{error}</p>;

  const bookable = days.filter((d) => d.available);
  if (bookable.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-md bg-cream-deep p-4 text-brown-soft">
        <CalendarX size={18} strokeWidth={1.75} className="shrink-0" />
        <p className="text-sm">
          All slots for the next few days are full. Please try again later, or ask us on WhatsApp.
        </p>
      </div>
    );
  }

  const selectedKey = selected ? formatDayParts(selected).key : null;

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2">
      {days.map((day) => {
        const { key, weekday, dayNum, month } = formatDayParts(day.date);
        const isSelected = key === selectedKey;

        const button = (
          <button
            type="button"
            disabled={!day.available}
            aria-pressed={isSelected}
            onClick={() => onSelect(key)}
            className={[
              'flex w-16 shrink-0 flex-col items-center gap-0.5 rounded-md border px-2 py-2.5 transition-colors',
              // pointer-events-none so the Tooltip wrapper still gets hover —
              // browsers swallow mouse events over a disabled button.
              !day.available
                ? 'pointer-events-none border-[rgba(169,141,116,0.25)] bg-cream-deep text-brown-mute line-through'
                : isSelected
                ? 'border-maroon bg-maroon text-cream'
                : 'border-[rgba(169,141,116,0.35)] bg-paper text-brown-soft hover:border-maroon',
            ].join(' ')}
          >
            <span className="text-xs font-medium">{weekday}</span>
            <span className="text-lg font-semibold tabular-nums leading-tight">{dayNum}</span>
            <span className="text-[11px]">{month}</span>
          </button>
        );

        // Disabled buttons don't fire hover events, so the tooltip wraps them.
        return day.available ? (
          <div key={key}>{button}</div>
        ) : (
          <Tooltip key={key} content={reasonLabel(day.reason)}>
            <span className="cursor-not-allowed">{button}</span>
          </Tooltip>
        );
      })}
    </div>
  );
}
