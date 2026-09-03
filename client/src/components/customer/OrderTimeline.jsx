import { Check } from 'lucide-react';

// `in_queue` is an internal-only status between confirmed and preparing —
// customers see it folded into "Confirmed", matching the spec's own C.8
// mockup which never shows a separate "queued" step.
const STEPS = [
  { key: 'placed', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

function stepIndex(status) {
  if (status === 'in_queue') return 1; // folds into "confirmed"
  const i = STEPS.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
}

function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

// Fold in_queue's own history entry into "confirmed" for display, matching
// how the step list itself treats it — otherwise a step could show a
// timestamp from a status it never visually reaches.
function timeForStep(statusHistory, stepKey) {
  const entry = statusHistory?.find((h) => h.status === stepKey || (stepKey === 'confirmed' && h.status === 'in_queue'));
  return entry?.at || null;
}

export function OrderTimeline({ status, statusHistory }) {
  if (status === 'cancelled' || status === 'rejected') {
    return (
      <div className="rounded-md bg-[rgba(198,40,40,0.08)] px-4 py-3 text-sm font-medium text-out-stock">
        This order has been {status === 'cancelled' ? 'cancelled' : 'rejected'}
      </div>
    );
  }

  const current = stepIndex(status);

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const at = statusHistory ? timeForStep(statusHistory, step.key) : null;
        return (
          <div key={step.key} className="flex flex-1 flex-col items-center last:flex-none">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div className={`h-0.5 flex-1 ${i <= current ? 'bg-maroon' : 'bg-[rgba(169,141,116,0.3)]'}`} />
              )}
              <div
                className={[
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-pill text-xs',
                  done ? 'bg-maroon text-cream' : active ? 'bg-maroon text-cream animate-pulse' : 'bg-cream-deep text-brown-mute',
                ].join(' ')}
              >
                {done ? <Check size={13} strokeWidth={2.5} /> : ''}
              </div>
            </div>
            <span className={`mt-1.5 text-center text-[11px] leading-tight ${active ? 'font-medium text-brown' : 'text-brown-mute'}`}>
              {step.label}
            </span>
            {(done || active) && at && (
              <span className="text-center text-[10px] leading-tight text-brown-mute">{timeLabel(at)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
