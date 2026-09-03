import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, BellRing, PackageSearch } from 'lucide-react';
import { useOrderTracking } from '../../hooks/useOrderTracking.js';
import { useToast } from '../../hooks/useToast.js';
import { canNotify, requestNotifyPermission, notifyIfBackground } from '../../lib/browserNotify.js';
import { formatRupees } from '../../lib/format.js';
import { formatDayParts } from '../../lib/availability.js';
import { OrderTimeline } from '../../components/customer/OrderTimeline.jsx';
import { STATUS_LABEL, STATUS_VARIANT } from '../../components/customer/OrderCard.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';

export function Track() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState(searchParams.get('orderId') || '');
  const [notifyOn, setNotifyOn] = useState(canNotify());

  const activeId = searchParams.get('orderId') || null;

  const onStatusChange = useCallback(
    (updated) => {
      const label = STATUS_LABEL[updated.orderStatus] || updated.orderStatus;
      toast.info(`${updated.orderId} is now ${label}`);
      notifyIfBackground(`Order ${updated.orderId}`, { body: `Now ${label}` });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast]
  );

  const { order, loading, error } = useOrderTracking(activeId, onStatusChange);

  const submit = (e) => {
    e.preventDefault();
    const trimmed = input.trim().toUpperCase();
    if (!trimmed) return;
    setSearchParams({ orderId: trimmed });
  };

  const enableNotify = async () => {
    const granted = await requestNotifyPermission();
    setNotifyOn(granted);
    if (!granted) toast.error('Notifications are blocked — enable them in your browser settings');
  };

  const isActive = order && !['delivered', 'cancelled', 'rejected'].includes(order.orderStatus);

  return (
    <div className="container-lhh py-8">
      <h1 className="font-heading text-3xl text-brown">Track Your Order</h1>
      <p className="mt-1 text-brown-soft">Enter the Order ID from your confirmation to see live status.</p>

      <form onSubmit={submit} className="mt-6 flex max-w-md gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="LHH-0209-0001"
          className="flex-1"
        />
        <Button type="submit">
          <Search size={16} strokeWidth={1.75} /> Track
        </Button>
      </form>

      <div className="mt-8 max-w-2xl">
        {!activeId ? null : loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error || !order ? (
          <EmptyState icon={PackageSearch} title="Order not found" message={error || 'Please check the order ID and try again'} />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-2xl text-brown">{order.orderId}</h2>
              <Badge variant={STATUS_VARIANT[order.orderStatus] || 'neutral'}>
                {STATUS_LABEL[order.orderStatus] || order.orderStatus}
              </Badge>
            </div>

            <Card className="flex flex-col gap-3 p-5">
              <OrderTimeline status={order.orderStatus} statusHistory={order.statusHistory} />
              {isActive && !notifyOn && (
                <button
                  type="button"
                  onClick={enableNotify}
                  className="flex w-fit items-center gap-1.5 text-xs font-medium text-maroon underline"
                >
                  <BellRing size={13} strokeWidth={1.75} /> Notify me when this order updates
                </button>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 font-heading text-lg text-brown">Items</h3>
              <div className="flex flex-col gap-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-brown-soft">
                      {item.qty} × {item.nameSnapshot}
                      {item.variantLabel ? ` (${item.variantLabel})` : ''}
                    </span>
                    <span className="tabular-nums text-brown">{formatRupees(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t border-[rgba(169,141,116,0.2)] pt-3 text-base font-semibold text-brown">
                <span>Total</span>
                <span className="tabular-nums">{formatRupees(order.grandTotal)}</span>
              </div>
            </Card>

            <Card className="flex flex-col gap-1 p-5">
              <h3 className="font-heading text-lg text-brown">Delivery</h3>
              <p className="text-sm text-brown-soft">
                {formatDayParts(order.deliveryDate).weekday} {formatDayParts(order.deliveryDate).dayNum}{' '}
                {formatDayParts(order.deliveryDate).month} • {order.deliverySlot}
              </p>
              <p className="text-sm capitalize text-brown-soft">{order.deliveryType}</p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
