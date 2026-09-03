import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge.jsx';
import { formatRupees } from '../../lib/format.js';
import { formatDayParts } from '../../lib/availability.js';

const STATUS_VARIANT = {
  placed: 'info',
  confirmed: 'info',
  in_queue: 'low-stock',
  preparing: 'low-stock',
  ready: 'in-stock',
  out_for_delivery: 'in-stock',
  delivered: 'in-stock',
  cancelled: 'out-stock',
  rejected: 'out-stock',
};

const STATUS_LABEL = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  in_queue: 'In Queue',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

export function OrderCard({ order }) {
  const { weekday, dayNum, month } = formatDayParts(order.deliveryDate);

  return (
    <Link
      to={`/me/orders/${order._id}`}
      className="flex flex-col gap-2 rounded-md border border-[rgba(169,141,116,0.2)] bg-paper p-4 transition-colors hover:border-maroon"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-brown">{order.orderId}</span>
        <Badge variant={STATUS_VARIANT[order.orderStatus] || 'neutral'}>
          {STATUS_LABEL[order.orderStatus] || order.orderStatus}
        </Badge>
      </div>
      <p className="text-sm text-brown-soft">
        {order.items.map((i) => `${i.qty}× ${i.nameSnapshot}`).join(', ')}
      </p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-brown-mute">
          {weekday} {dayNum} {month} • {order.deliverySlot}
        </span>
        <span className="font-semibold tabular-nums text-brown">{formatRupees(order.grandTotal)}</span>
      </div>
    </Link>
  );
}

export { STATUS_VARIANT, STATUS_LABEL };
