export function SlotPicker({ slots = [], selected, onSelect }) {
  if (slots.length === 0) {
    return <p className="text-sm text-brown-soft">Please choose a delivery date first.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {slots.map((slot) => {
        const isSelected = slot.name === selected;
        return (
          <button
            key={slot.name}
            type="button"
            disabled={slot.isFull}
            aria-pressed={isSelected}
            onClick={() => onSelect(slot.name)}
            className={[
              'flex flex-col items-start gap-0.5 rounded-md border px-4 py-3 text-left transition-colors',
              slot.isFull
                ? 'cursor-not-allowed border-[rgba(169,141,116,0.25)] bg-cream-deep text-brown-mute'
                : isSelected
                ? 'border-maroon bg-maroon text-cream'
                : 'border-[rgba(169,141,116,0.35)] bg-paper text-brown-soft hover:border-maroon',
            ].join(' ')}
          >
            <span className="font-medium">
              {slot.name} <span className="font-normal">({slot.timeRange})</span>
            </span>
            <span className={`text-sm ${slot.isFull ? '' : isSelected ? 'text-cream' : 'text-brown-mute'}`}>
              {slot.isFull ? 'FULL' : `${slot.left} ${slot.left === 1 ? 'slot' : 'slots'} left`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
