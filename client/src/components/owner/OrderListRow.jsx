import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge.jsx';
import { formatRupees } from '../../lib/format.js';
import { formatDayParts } from '../../lib/availability.js';
import { STATUS_LABEL, STATUS_VARIANT } from '../customer/OrderCard.jsx';

export function OrderListRow({ order }) {
  const { weekday, dayNum, month } = formatDayParts(order.deliveryDate);

  return (
    <Link
      to={`/owner/orders/${order._id}`}
      className="grid grid-cols-2 gap-2 rounded-md border border-[rgba(169,141,116,0.2)] bg-paper p-4 transition-colors hover:border-maroon sm:grid-cols-6 sm:items-center sm:gap-4"
    >
      <div className="sm:col-span-2">
        <p className="font-semibold text-brown">{order.orderId}</p>
        <p className="text-sm text-brown-soft">{order.contact.name} • {order.contact.phone}</p>
      </div>
      <p className="text-sm text-brown-soft sm:col-span-2">
        {order.items.map((i) => `${i.qty}× ${i.nameSnapshot}`).join(', ')}
      </p>
      <p className="text-sm text-brown-mute">
        {weekday} {dayNum} {month} • {order.deliverySlot}
      </p>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span className="text-sm font-semibold tabular-nums text-brown">{formatRupees(order.grandTotal)}</span>
        <Badge variant={STATUS_VARIANT[order.orderStatus] || 'neutral'}>
          {STATUS_LABEL[order.orderStatus] || order.orderStatus}
        </Badge>
        {order.paymentMethod === 'UPI' && order.paymentStatus === 'pending' && (
          <Badge variant="low-stock">⚠️ verify</Badge>
        )}
      </div>
    </Link>
  );
}
