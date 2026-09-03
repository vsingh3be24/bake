import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, MessageCircle, Printer, Ban } from 'lucide-react';
import { useOwnerOrder } from '../../hooks/useOwnerOrder.js';
import { useToast } from '../../hooks/useToast.js';
import { api } from '../../lib/api.js';
import { printOrderSlip } from '../../lib/printSlip.js';
import { formatRupees } from '../../lib/format.js';
import { formatDayParts } from '../../lib/availability.js';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { STATUS_LABEL } from '../../components/customer/OrderCard.jsx';

const FORWARD_STATUSES = ['placed', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];

export function OwnerOrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { order, loading, error, refresh } = useOwnerOrder(id);

  const [note, setNote] = useState('');
  const [noteDirty, setNoteDirty] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return <EmptyState title="Order not found" message={error} actionLabel="All Orders" actionHref="/owner/orders" />;
  }

  const noteValue = noteDirty ? note : order.ownerNotes || '';
  const currentIdx = FORWARD_STATUSES.indexOf(order.orderStatus);
  const isTerminal = ['delivered', 'cancelled', 'rejected'].includes(order.orderStatus);

  const setStatus = async (status) => {
    setBusy(true);
    try {
      await api.patch(`/owner/orders/${order._id}/status`, { status });
      toast.success('Status updated');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status');
    } finally {
      setBusy(false);
    }
  };

  const setPayment = async (paymentStatus) => {
    setBusy(true);
    try {
      await api.patch(`/owner/orders/${order._id}/payment`, { paymentStatus });
      toast.success('Payment updated');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update payment');
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    setSavingNote(true);
    try {
      await api.patch(`/owner/orders/${order._id}/note`, { note: noteValue });
      toast.success('Note saved');
      setNoteDirty(false);
      refresh();
    } catch {
      toast.error('Could not save the note');
    } finally {
      setSavingNote(false);
    }
  };

  const confirmCancel = async () => {
    setBusy(true);
    try {
      await api.post(`/owner/orders/${order._id}/cancel`, { reason: cancelReason });
      toast.success('Order cancelled');
      setCancelOpen(false);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel the order');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl text-brown">{order.orderId}</h1>
          <p className="text-sm text-brown-mute">Placed {new Date(order.createdAt).toLocaleString('en-IN')}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="neutral">{STATUS_LABEL[order.orderStatus] || order.orderStatus}</Badge>
          <Button size="sm" variant="secondary" onClick={() => printOrderSlip(order)}>
            <Printer size={14} strokeWidth={1.75} /> Print Slip
          </Button>
          {!isTerminal && (
            <Button size="sm" variant="danger" onClick={() => setCancelOpen(true)}>
              <Ban size={14} strokeWidth={1.75} /> Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Status changer */}
      {!isTerminal && (
        <Card className="p-5">
          <h2 className="mb-3 font-heading text-lg text-brown">Update Status</h2>
          <div className="flex flex-wrap gap-2">
            {FORWARD_STATUSES.map((status, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              const next = i === currentIdx + 1;
              return (
                <button
                  key={status}
                  type="button"
                  disabled={busy || !(next || active)}
                  onClick={() => next && setStatus(status)}
                  className={[
                    'rounded-pill px-4 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-maroon text-cream'
                      : done
                      ? 'bg-[rgba(46,125,50,0.12)] text-in-stock'
                      : next
                      ? 'border border-maroon text-maroon hover:bg-[rgba(140,29,47,0.06)]'
                      : 'bg-cream-deep text-brown-mute cursor-not-allowed',
                  ].join(' ')}
                >
                  {STATUS_LABEL[status]}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {isTerminal && order.cancelReason && (
        <Card className="p-5">
          <p className="text-sm font-medium text-out-stock">
            {order.orderStatus === 'rejected' ? 'Rejected' : 'Cancelled'} by {order.cancelledBy}
          </p>
          <p className="text-sm text-brown-soft">{order.cancelReason}</p>
        </Card>
      )}

      {/* Customer block */}
      <Card className="flex flex-col gap-2 p-5">
        <h2 className="font-heading text-lg text-brown">Customer</h2>
        <p className="text-brown">
          {order.contact.name} • {order.contact.phone}
        </p>
        {order.customer && (
          <p className="text-sm text-brown-mute">
            {order.customer.totalOrders} past order{order.customer.totalOrders === 1 ? '' : 's'}
          </p>
        )}
        <div className="mt-1 flex gap-2">
          <Button as="a" href={`tel:+91${order.contact.phone}`} size="sm" variant="secondary">
            <Phone size={14} strokeWidth={1.75} /> Call
          </Button>
          <Button as="a" href={`https://wa.me/91${order.contact.phone}`} size="sm" variant="secondary">
            <MessageCircle size={14} strokeWidth={1.75} /> WhatsApp
          </Button>
        </div>
      </Card>

      {/* Items + money */}
      <Card className="p-5">
        <h2 className="mb-3 font-heading text-lg text-brown">Items</h2>
        <div className="flex flex-col gap-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              {item.product?.images?.[0] ? (
                <img src={item.product.images[0]} alt="" className="h-12 w-12 shrink-0 rounded-sm object-cover" />
              ) : (
                <div className="h-12 w-12 shrink-0 rounded-sm bg-cream-deep" />
              )}
              <div className="flex-1">
                <p className="text-sm text-brown">
                  {item.qty} × {item.nameSnapshot}
                  {item.variantLabel ? ` (${item.variantLabel})` : ''}
                </p>
                {item.itemNote && <p className="text-xs italic text-brown-mute">{item.itemNote}</p>}
              </div>
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

      {/* Delivery */}
      <Card className="flex flex-col gap-1 p-5">
        <h2 className="font-heading text-lg text-brown">Delivery</h2>
        <p className="text-sm text-brown-soft">
          {formatDayParts(order.deliveryDate).weekday} {formatDayParts(order.deliveryDate).dayNum}{' '}
          {formatDayParts(order.deliveryDate).month} • {order.deliverySlot}
        </p>
        <p className="text-sm capitalize text-brown-soft">{order.deliveryType}</p>
        {order.deliveryType === 'delivery' && (
          <p className="text-sm text-brown-soft">
            {order.address.line1}
            {order.address.landmark ? `, ${order.address.landmark}` : ''}, {order.address.area} - {order.address.pincode}
          </p>
        )}
        {order.specialNote && <p className="text-sm text-brown-soft">Note: {order.specialNote}</p>}
        {order.cakeMessage && <p className="text-sm text-brown-soft">🎂 "{order.cakeMessage}"</p>}
      </Card>

      {/* Payment box */}
      <Card className="flex flex-col gap-2 p-5">
        <h2 className="font-heading text-lg text-brown">Payment</h2>
        <p className="text-sm text-brown-soft">
          {order.paymentMethod} • <span className="capitalize">{order.paymentStatus}</span>
        </p>
        {order.upiRefNumber && <p className="text-sm text-brown-soft">UTR: {order.upiRefNumber}</p>}
        {order.paymentScreenshot && (
          <img src={order.paymentScreenshot} alt="Payment screenshot" className="mt-1 max-w-[200px] rounded-md border border-[rgba(169,141,116,0.25)]" />
        )}
        {order.paymentStatus === 'pending' && (
          <div className="mt-1 flex gap-2">
            <Button size="sm" onClick={() => setPayment('paid')} disabled={busy}>
              ✅ Mark as Paid
            </Button>
            <Button size="sm" variant="danger" onClick={() => setPayment('failed')} disabled={busy}>
              ❌ Payment Not Received
            </Button>
          </div>
        )}
      </Card>

      {/* Internal notes */}
      <Card className="flex flex-col gap-2 p-5">
        <h2 className="font-heading text-lg text-brown">Internal Notes</h2>
        <p className="text-xs text-brown-mute">Only visible to you — never shown to the customer.</p>
        <textarea
          value={noteValue}
          onChange={(e) => {
            setNote(e.target.value);
            setNoteDirty(true);
          }}
          rows={3}
          className="w-full rounded-sm border border-[rgba(169,141,116,0.35)] bg-paper px-3.5 py-2.5 text-sm text-brown placeholder:text-brown-mute focus:outline-none focus:ring-2 focus:ring-[rgba(140,29,47,0.4)] focus:border-maroon"
          placeholder="e.g. Regular customer, prefers less sugar"
        />
        <Button size="sm" className="w-fit" loading={savingNote} onClick={saveNote} disabled={!noteDirty}>
          Save Note
        </Button>
      </Card>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel Order">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-brown-soft">Stock for this order's items will be restored automatically.</p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            placeholder="Reason for cancelling"
            className="w-full rounded-sm border border-[rgba(169,141,116,0.35)] bg-paper px-3.5 py-2.5 text-sm text-brown placeholder:text-brown-mute focus:outline-none focus:ring-2 focus:ring-[rgba(140,29,47,0.4)] focus:border-maroon"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Back
            </Button>
            <Button variant="danger" loading={busy} onClick={confirmCancel}>
              Confirm Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
