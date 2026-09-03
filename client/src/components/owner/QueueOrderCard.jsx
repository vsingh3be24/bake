import { Reorder, useDragControls } from 'framer-motion';
import { Link } from 'react-router-dom';
import { GripVertical, Cake, Gift } from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';

const STAGE_VARIANT = { queued: 'neutral', prep: 'info', ready: 'in-stock' };
const STAGE_LABEL = { queued: '⚪ Queue', prep: '🔵 Prep', ready: '🟢 Ready' };
const NEXT_ACTION = { queued: { status: 'preparing', label: 'Start' }, prep: { status: 'ready', label: 'Ready' } };

function readyByLabel(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function QueueOrderCard({ order, onAdvance, busy }) {
  const controls = useDragControls();
  const action = NEXT_ACTION[order.kitchenStage];
  const readyBy = readyByLabel(order.estimatedReadyAt);

  return (
    <Reorder.Item
      value={order}
      id={order._id}
      dragListener={false}
      dragControls={controls}
      className="flex items-start gap-2 rounded-md border border-[rgba(169,141,116,0.2)] bg-paper p-3"
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        className="mt-1 shrink-0 cursor-grab touch-none text-brown-mute active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} strokeWidth={1.75} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <span className="font-semibold text-brown">
            {order.orderId} <span className="font-normal text-brown-soft">{order.contact.name}</span>
          </span>
          <Badge variant={STAGE_VARIANT[order.kitchenStage]}>{STAGE_LABEL[order.kitchenStage]}</Badge>
        </div>
        <p className="mt-0.5 text-sm text-brown-soft">{order.itemsSummary}</p>
        {order.cakeMessage && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-brown-mute">
            <Cake size={12} strokeWidth={1.75} /> "{order.cakeMessage}"
          </p>
        )}
        {order.isGift && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-brown-mute">
            <Gift size={12} strokeWidth={1.75} /> Gift
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          {readyBy && <span className="text-xs text-brown-mute">Ready by {readyBy}</span>}
          <div className="ml-auto flex gap-1.5">
            {action && (
              <Button size="sm" disabled={busy} onClick={() => onAdvance(order, action.status)}>
                {action.label}
              </Button>
            )}
            <Button as={Link} to={`/owner/orders/${order._id}`} size="sm" variant="secondary">
              Details
            </Button>
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
}
