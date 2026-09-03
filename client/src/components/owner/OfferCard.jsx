import { Zap, Pause, Play, Pencil, Trash2, Clock } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { useCountdown } from '../../hooks/useCountdown.js';

const STATUS_VARIANT = { live: 'in-stock', scheduled: 'info', expired: 'out-stock', draft: 'neutral' };
const STATUS_LABEL = { live: '🟢 LIVE', scheduled: '🔵 Scheduled', expired: '⚪ Expired', draft: '⚫ Draft' };

const APPLIES_LABEL = { all: 'Everything', category: 'Category', product: 'Products', cart_total: 'Cart total' };

function pad(n) {
  return String(n).padStart(2, '0');
}

export function OfferCard({ offer, onToggle, onExtend, onEndNow, onEdit, onDelete, busy }) {
  const countdown = useCountdown(offer.isFlash ? offer.endAt : null);

  return (
    <Card className="flex flex-col gap-2.5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {offer.isFlash && <Zap size={16} strokeWidth={2} className="shrink-0 text-crimson" />}
          <h3 className="font-heading text-lg text-brown">{offer.title}</h3>
        </div>
        <Badge variant={STATUS_VARIANT[offer.status]}>{STATUS_LABEL[offer.status]}</Badge>
      </div>

      <p className="text-sm text-brown-soft">
        {offer.code ? `Code: ${offer.code}` : 'Auto-applied'} • {APPLIES_LABEL[offer.appliesTo] || offer.appliesTo}
        {offer.isStackable && ' • Stackable'}
      </p>

      {offer.status === 'live' && offer.isFlash && countdown && !countdown.expired && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-crimson">
          <Clock size={14} strokeWidth={2} />
          Ends in: {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
        </p>
      )}

      {offer.usageLimit != null && (
        <p className="text-sm text-brown-mute">
          Used: {offer.usedCount} / {offer.usageLimit}
        </p>
      )}

      <div className="mt-1 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => onToggle(offer)}>
          {offer.isActive ? (
            <>
              <Pause size={13} strokeWidth={1.75} /> Pause
            </>
          ) : (
            <>
              <Play size={13} strokeWidth={1.75} /> Resume
            </>
          )}
        </Button>
        {offer.isFlash && offer.status === 'live' && (
          <>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onExtend(offer, 2)}>
              Extend +2hrs
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onEndNow(offer)}>
              End Now
            </Button>
          </>
        )}
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => onEdit(offer)}>
          <Pencil size={13} strokeWidth={1.75} /> Edit
        </Button>
        <Button size="sm" variant="danger" disabled={busy} onClick={() => onDelete(offer)}>
          <Trash2 size={13} strokeWidth={1.75} />
        </Button>
      </div>
    </Card>
  );
}
