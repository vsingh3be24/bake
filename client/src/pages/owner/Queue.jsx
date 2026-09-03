import { useEffect, useState } from 'react';
import { Reorder } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOwnerQueue } from '../../hooks/useOwnerQueue.js';
import { useToast } from '../../hooks/useToast.js';
import { api } from '../../lib/api.js';
import { formatDayParts, shiftDateKey, todayKey } from '../../lib/availability.js';
import { Card } from '../../components/ui/Card.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { QueueOrderCard } from '../../components/owner/QueueOrderCard.jsx';

function LoadBar({ booked, capacity }) {
  const pct = capacity ? Math.min(Math.round((booked / capacity) * 100), 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-pill bg-cream-deep">
        <div className="h-full rounded-pill bg-maroon transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-brown-mute">
        {booked}/{capacity ?? '—'}
      </span>
    </div>
  );
}

export function OwnerQueue() {
  const toast = useToast();
  const [dateKey, setDateKey] = useState(todayKey());
  const { board, loading, error, refresh } = useOwnerQueue(dateKey);
  const [slots, setSlots] = useState([]);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (board) setSlots(board.slots.map((s) => ({ ...s, orders: [...s.orders] })));
  }, [board]);

  const persistOrder = async (slotName, newOrders) => {
    setSlots((prev) => prev.map((s) => (s.name === slotName ? { ...s, orders: newOrders } : s)));
    try {
      await Promise.all(
        newOrders.map((o, i) => api.patch(`/owner/orders/${o._id}/priority`, { queuePriority: i }))
      );
    } catch {
      toast.error('Could not save the new order — refreshing');
      refresh();
    }
  };

  const advance = async (order, status) => {
    setBusyId(order._id);
    try {
      await api.patch(`/owner/orders/${order._id}/status`, { status });
      toast.success(status === 'ready' ? 'Marked ready' : 'Started preparing');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update the order');
    } finally {
      setBusyId(null);
    }
  };

  const dayLabel = formatDayParts(dateKey);
  const isToday = dateKey === todayKey();

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
            {isToday ? 'Today' : dayLabel.weekday} — {dayLabel.dayNum} {dayLabel.month}
          </h1>
          <button
            type="button"
            onClick={() => setDateKey((k) => shiftDateKey(k, 1))}
            aria-label="Next day"
            className="rounded-pill p-1.5 text-brown-soft hover:bg-[rgba(74,44,26,0.06)]"
          >
            <ChevronRight size={18} strokeWidth={1.75} />
          </button>
          {!isToday && (
            <button type="button" onClick={() => setDateKey(todayKey())} className="text-sm font-medium text-maroon underline">
              Jump to today
            </button>
          )}
        </div>
        {board && <LoadBar booked={board.totalBooked} capacity={board.dailyOrderCapacity} />}
      </div>

      {loading && !board ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-out-stock">{error}</p>
      ) : slots.every((s) => s.orders.length === 0) ? (
        <EmptyState title="Nothing queued" message="No orders need kitchen attention for this day." />
      ) : (
        <div className="flex flex-col gap-5">
          {slots.map((slot) => (
            <Card key={slot.name} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-heading text-lg text-brown">
                  {slot.name.toUpperCase()} {slot.timeRange && `(${slot.timeRange})`}
                </h2>
                <span className="text-sm text-brown-mute">{slot.booked} booked</span>
              </div>
              {slot.orders.length === 0 ? (
                <p className="py-3 text-center text-sm text-brown-mute">Nothing in this slot</p>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={slot.orders}
                  onReorder={(newOrders) => persistOrder(slot.name, newOrders)}
                  className="flex flex-col gap-2"
                >
                  {slot.orders.map((order) => (
                    <QueueOrderCard key={order._id} order={order} onAdvance={advance} busy={busyId === order._id} />
                  ))}
                </Reorder.Group>
              )}
            </Card>
          ))}
        </div>
      )}

      {board?.lookahead?.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-brown-soft">Coming up</p>
          <div className="flex flex-wrap gap-3">
            {board.lookahead.map((day) => {
              const parts = formatDayParts(day.date);
              return (
                <button
                  key={parts.key}
                  type="button"
                  onClick={() => setDateKey(parts.key)}
                  className="flex flex-col items-start gap-1 rounded-md border border-[rgba(169,141,116,0.2)] bg-paper p-3 text-left hover:border-maroon"
                >
                  <span className="text-sm font-medium text-brown">
                    {parts.weekday} {parts.dayNum} {parts.month}
                  </span>
                  <LoadBar booked={day.booked} capacity={day.capacity} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
