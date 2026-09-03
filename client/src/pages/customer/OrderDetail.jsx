import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Star, BellRing } from 'lucide-react';
import { useCustomerOrder } from '../../hooks/useCustomerOrder.js';
import { useCartStore } from '../../store/cartStore.js';
import { useToast } from '../../hooks/useToast.js';
import { api } from '../../lib/api.js';
import { canNotify, requestNotifyPermission, notifyIfBackground } from '../../lib/browserNotify.js';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { OrderTimeline } from '../../components/customer/OrderTimeline.jsx';
import { STATUS_LABEL, STATUS_VARIANT } from '../../components/customer/OrderCard.jsx';
import { formatRupees } from '../../lib/format.js';
import { formatDayParts } from '../../lib/availability.js';
import { addReorderItem } from '../../lib/reorder.js';

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
          <Star
            size={24}
            strokeWidth={1.75}
            className={n <= value ? 'text-gold' : 'text-brown-mute'}
            fill={n <= value ? '#C9A227' : 'none'}
          />
        </button>
      ))}
    </div>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [notifyOn, setNotifyOn] = useState(canNotify());

  // Fires on every poll where the status genuinely changed — a toast always,
  // plus an OS notification when the tab isn't the one the customer is looking at.
  const onStatusChange = useCallback(
    (updated) => {
      const label = STATUS_LABEL[updated.orderStatus] || updated.orderStatus;
      toast.info(`${updated.orderId} is now ${label}`);
      notifyIfBackground(`Order ${updated.orderId}`, { body: `Now ${label}`, tag: updated._id });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast]
  );
  const { order, loading, error } = useCustomerOrder(id, onStatusChange);
  const addItem = useCartStore((s) => s.addItem);

  const [reordering, setReordering] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const enableNotify = async () => {
    const granted = await requestNotifyPermission();
    setNotifyOn(granted);
    if (!granted) toast.error('Notifications are blocked — enable them in your browser settings');
  };

  const reorder = async () => {
    setReordering(true);
    try {
      const { data } = await api.post(`/customer/orders/${id}/reorder`);
      if (data.items.length === 0) {
        toast.error('None of these items are available right now');
        return;
      }
      data.items.forEach((item) => addReorderItem(addItem, item));
      if (data.skipped.length > 0) {
        toast.info(`${data.skipped.length} item(s) were skipped — no longer available`);
      }
      toast.success('Added to your cart');
      navigate('/cart');
    } catch {
      toast.error('Could not reorder — please try again');
    } finally {
      setReordering(false);
    }
  };

  const submitReview = async () => {
    if (rating === 0) {
      toast.error('Please choose a rating');
      return;
    }
    setSubmittingReview(true);
    try {
      await api.post(`/customer/orders/${id}/review`, { rating, review });
      setReviewed(true);
      toast.success('Thanks for your feedback!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit your review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return <EmptyState title="Order not found" message={error} actionLabel="My Orders" actionHref="/me/orders" />;
  }

  const alreadyReviewed = reviewed || order.rating != null;
  const isActive = !['delivered', 'cancelled', 'rejected'].includes(order.orderStatus);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-brown">{order.orderId}</h1>
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
        <h2 className="mb-3 font-heading text-xl text-brown">Items</h2>
        <div className="flex flex-col gap-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-brown-soft">
                {item.qty} × {item.nameSnapshot}
                {item.variantLabel ? ` (${item.variantLabel})` : ''}
                {item.itemNote && <span className="italic text-brown-mute"> — {item.itemNote}</span>}
              </span>
              <span className="tabular-nums text-brown">{formatRupees(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-1.5 border-t border-[rgba(169,141,116,0.2)] pt-3 text-sm">
          <div className="flex justify-between text-brown-soft">
            <span>Items</span>
            <span className="tabular-nums">{formatRupees(order.itemsTotal)}</span>
          </div>
          {order.offerApplied?.discountAmount > 0 && (
            <div className="flex justify-between text-in-stock">
              <span>Offer {order.offerApplied.code}</span>
              <span className="tabular-nums">&minus;{formatRupees(order.offerApplied.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-brown-soft">
            <span>Delivery</span>
            <span className="tabular-nums">{order.deliveryCharge === 0 ? 'FREE' : formatRupees(order.deliveryCharge)}</span>
          </div>
          <div className="flex justify-between text-brown-soft">
            <span>Packaging</span>
            <span className="tabular-nums">{formatRupees(order.packagingCharge)}</span>
          </div>
          <div className="flex justify-between border-t border-[rgba(169,141,116,0.2)] pt-2 text-base font-semibold text-brown">
            <span>Total</span>
            <span className="tabular-nums">{formatRupees(order.grandTotal)}</span>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-1 p-5">
        <h2 className="font-heading text-xl text-brown">Delivery</h2>
        <p className="text-sm text-brown-soft">
          {formatDayParts(order.deliveryDate).weekday} {formatDayParts(order.deliveryDate).dayNum}{' '}
          {formatDayParts(order.deliveryDate).month} • {order.deliverySlot}
        </p>
        <p className="text-sm text-brown-soft capitalize">{order.deliveryType}</p>
      </Card>

      <Card className="flex flex-col gap-1 p-5">
        <h2 className="font-heading text-xl text-brown">Payment</h2>
        <p className="text-sm text-brown-soft">
          {order.paymentMethod} •{' '}
          <span className="capitalize">{order.paymentStatus}</span>
        </p>
      </Card>

      <div className="flex gap-3">
        <Button loading={reordering} loadingText="Adding to cart..." onClick={reorder}>
          Reorder
        </Button>
      </div>

      {order.orderStatus === 'delivered' && (
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="font-heading text-xl text-brown">Rate this order</h2>
          {alreadyReviewed ? (
            <p className="text-sm text-brown-soft">Thanks — you've already reviewed this order.</p>
          ) : (
            <>
              <StarRating value={rating} onChange={setRating} />
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Tell us what you thought (optional)"
                className="w-full rounded-sm border border-[rgba(169,141,116,0.35)] bg-paper px-3.5 py-2.5 text-sm text-brown placeholder:text-brown-mute focus:outline-none focus:ring-2 focus:ring-[rgba(140,29,47,0.4)] focus:border-maroon"
                rows={3}
              />
              <Button loading={submittingReview} onClick={submitReview} className="w-fit">
                Submit Review
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
