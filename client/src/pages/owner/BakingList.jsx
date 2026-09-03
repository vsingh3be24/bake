import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Printer, Share2, Check } from 'lucide-react';
import { useOwnerBakingList } from '../../hooks/useOwnerBakingList.js';
import { formatDayParts, shiftDateKey, todayKey } from '../../lib/availability.js';
import { formatRupees } from '../../lib/format.js';
import { printBakingList, bakingListShareText } from '../../lib/printBakingList.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';

function storageKey(dateKey) {
  return `lhh-baking-checked-${dateKey}`;
}

function loadChecked(dateKey) {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey(dateKey)) || '[]'));
  } catch {
    return new Set();
  }
}

export function OwnerBakingList() {
  const [dateKey, setDateKey] = useState(todayKey());
  const { list, loading, error } = useOwnerBakingList(dateKey);
  const [checked, setChecked] = useState(() => loadChecked(dateKey));

  // Each date keeps its own checklist — a fresh day always starts unticked.
  useEffect(() => {
    setChecked(loadChecked(dateKey));
  }, [dateKey]);

  const toggle = (productId) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      try {
        localStorage.setItem(storageKey(dateKey), JSON.stringify([...next]));
      } catch {
        // Best-effort — a full/blocked localStorage shouldn't break the checklist itself.
      }
      return next;
    });
  };

  const dayLabel = formatDayParts(dateKey);
  const isToday = dateKey === todayKey();

  const totalItems = list?.categories.reduce((sum, c) => sum + c.items.length, 0) || 0;
  const checkedCount = list?.categories.reduce(
    (sum, c) => sum + c.items.filter((i) => checked.has(i.productId)).length,
    0
  ) || 0;
  const progressPct = totalItems ? Math.round((checkedCount / totalItems) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDateKey((k) => shiftDateKey(k, -1))}
            aria-label="Previous day"
            className="rounded-pill p-1.5 text-brown-soft hover:bg-[rgba(74,44,26,0.06)]"
          >
            <ChevronLeft size={18} strokeWidth={1.75} />
          </button>
          <h1 className="font-heading text-2xl text-brown">
            Baking List — {isToday ? 'Today, ' : ''}
            {dayLabel.dayNum} {dayLabel.month}
          </h1>
          <button
            type="button"
            onClick={() => setDateKey((k) => shiftDateKey(k, 1))}
            aria-label="Next day"
            className="rounded-pill p-1.5 text-brown-soft hover:bg-[rgba(74,44,26,0.06)]"
          >
            <ChevronRight size={18} strokeWidth={1.75} />
          </button>
        </div>
        {list && (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => printBakingList(list)}>
              <Printer size={14} strokeWidth={1.75} /> Print
            </Button>
            <Button
              size="sm"
              variant="secondary"
              as="a"
              href={`https://wa.me/?text=${encodeURIComponent(bakingListShareText(list))}`}
              target="_blank"
              rel="noreferrer"
            >
              <Share2 size={14} strokeWidth={1.75} /> Share
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-out-stock">{error}</p>
      ) : totalItems === 0 ? (
        <EmptyState title="Nothing to bake" message="No orders are scheduled for this day yet." />
      ) : (
        <>
          <div>
            <div className="flex items-center justify-between text-sm text-brown-soft">
              <span>
                {checkedCount} / {totalItems} done
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-pill bg-cream-deep">
              <div className="h-full rounded-pill bg-in-stock transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {list.categories.map((cat) => (
              <Card key={cat.name} className="p-4">
                <h2 className="mb-2 font-heading text-lg text-brown">{cat.name}</h2>
                <div className="flex flex-col gap-1">
                  {cat.items.map((item) => {
                    const isChecked = checked.has(item.productId);
                    return (
                      <label
                        key={item.productId}
                        className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 hover:bg-cream-deep"
                      >
                        <span
                          className={[
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-colors',
                            isChecked ? 'border-in-stock bg-in-stock text-cream' : 'border-[rgba(169,141,116,0.4)]',
                          ].join(' ')}
                        >
                          {isChecked && <Check size={13} strokeWidth={3} />}
                        </span>
                        <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => toggle(item.productId)} />
                        <span className={`flex-1 text-sm ${isChecked ? 'text-brown-mute line-through' : 'text-brown'}`}>
                          {item.name}
                        </span>
                        <span className="text-sm font-medium tabular-nums text-brown">
                          {item.qty} pc{item.qty === 1 ? '' : 's'}
                        </span>
                        <span className="w-20 text-right text-xs text-brown-mute">
                          ({item.orderCount} order{item.orderCount === 1 ? '' : 's'})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>

          {list.specialInstructions.length > 0 && (
            <Card className="border-[rgba(229,142,38,0.4)] bg-[rgba(229,142,38,0.08)] p-4">
              <h2 className="mb-2 font-heading text-lg text-brown">⚠️ Special Instructions</h2>
              <div className="flex flex-col gap-1.5">
                {list.specialInstructions.map((n) => (
                  <p key={n.orderId} className="text-sm text-brown-soft">
                    <span className="font-semibold text-brown">#{n.orderId}</span> — {n.notes.join(', ')}{' '}
                    <span className="text-brown-mute">({n.customerName})</span>
                  </p>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-4 text-sm font-medium text-brown">
            Total: {list.totals.orders} order{list.totals.orders === 1 ? '' : 's'} • {list.totals.items} item
            {list.totals.items === 1 ? '' : 's'} • {formatRupees(list.totals.revenue)}
          </Card>
        </>
      )}
    </div>
  );
}
