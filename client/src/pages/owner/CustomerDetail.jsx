import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Phone, MessageCircle, Ban, ShieldCheck, Star } from 'lucide-react';
import { useOwnerCustomer } from '../../hooks/useOwnerCustomer.js';
import { useToast } from '../../hooks/useToast.js';
import { api } from '../../lib/api.js';
import { formatRupees } from '../../lib/format.js';
import { formatDayParts } from '../../lib/availability.js';
import { STATUS_VARIANT, STATUS_LABEL } from '../../components/customer/OrderCard.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';

const TIER_VARIANT = { gold: 'sale', silver: 'info', regular: 'neutral' };

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

export function OwnerCustomerDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { customer, orders, loading, error, refresh } = useOwnerCustomer(id);

  const [note, setNote] = useState('');
  const [noteDirty, setNoteDirty] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !customer) {
    return <EmptyState title="Customer not found" message={error} actionLabel="All Customers" actionHref="/owner/customers" />;
  }

  const noteValue = noteDirty ? note : customer.ownerNote || '';

  const saveNote = async () => {
    setSavingNote(true);
    try {
      await api.patch(`/owner/customers/${customer._id}/note`, { note: noteValue });
      toast.success('Note saved');
      setNoteDirty(false);
      refresh();
    } catch {
      toast.error('Could not save the note');
    } finally {
      setSavingNote(false);
    }
  };

  const unblock = async () => {
    setBusy(true);
    try {
      await api.patch(`/owner/customers/${customer._id}/block`, { isBlocked: false });
      toast.success('Customer unblocked');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not unblock the customer');
    } finally {
      setBusy(false);
    }
  };

  const confirmBlock = async () => {
    setBusy(true);
    try {
      await api.patch(`/owner/customers/${customer._id}/block`, { isBlocked: true, reason: blockReason });
      toast.success('Customer blocked');
      setBlockOpen(false);
      setBlockReason('');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not block the customer');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl text-brown">{customer.name}</h1>
            <Badge variant={TIER_VARIANT[customer.tier] || 'neutral'} className="capitalize">
              {customer.tier}
            </Badge>
            {customer.isBlocked && <Badge variant="out-stock">Blocked</Badge>}
          </div>
          <p className="text-sm text-brown-mute">
            {customer.phone} • Joined {formatDate(customer.createdAt)}
            {customer.isGuest && ' • Guest (no password set)'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button as="a" href={`tel:+91${customer.phone}`} size="sm" variant="secondary">
            <Phone size={14} strokeWidth={1.75} /> Call
          </Button>
          <Button as="a" href={`https://wa.me/91${customer.phone}`} size="sm" variant="secondary">
            <MessageCircle size={14} strokeWidth={1.75} /> WhatsApp
          </Button>
          {customer.isBlocked ? (
            <Button size="sm" disabled={busy} onClick={unblock}>
              <ShieldCheck size={14} strokeWidth={1.75} /> Unblock
            </Button>
          ) : (
            <Button size="sm" variant="danger" onClick={() => setBlockOpen(true)}>
              <Ban size={14} strokeWidth={1.75} /> Block
            </Button>
          )}
        </div>
      </div>

      {customer.isBlocked && customer.blockReason && (
        <Card className="border-[rgba(198,40,40,0.35)] bg-[rgba(198,40,40,0.06)] p-4 text-sm text-out-stock">
          Blocked: {customer.blockReason}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-brown-mute">Total Orders</p>
          <p className="mt-1 font-heading text-2xl text-brown">{customer.totalOrders}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-brown-mute">Total Spent</p>
          <p className="mt-1 font-heading text-2xl text-brown">{formatRupees(customer.totalSpent)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-brown-mute">Avg Order Value</p>
          <p className="mt-1 font-heading text-2xl text-brown">{formatRupees(customer.avgOrderValue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-brown-mute">Last Order</p>
          <p className="mt-1 font-heading text-2xl text-brown">{formatDate(customer.lastOrderAt)}</p>
        </Card>
      </div>

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
          placeholder="e.g. nuts allergy, always pays late"
        />
        <Button size="sm" className="w-fit" loading={savingNote} onClick={saveNote} disabled={!noteDirty}>
          Save Note
        </Button>
      </Card>

      {customer.addresses?.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 font-heading text-lg text-brown">Addresses</h2>
          <div className="flex flex-col gap-2">
            {customer.addresses.map((a, i) => (
              <p key={i} className="text-sm text-brown-soft">
                <span className="font-medium text-brown">{a.label}</span>
                {a.isDefault && <Badge variant="in-stock" className="ml-1.5">Default</Badge>} — {a.line1}
                {a.landmark ? `, ${a.landmark}` : ''}, {a.area} - {a.pincode}
              </p>
            ))}
          </div>
        </Card>
      )}

      {customer.favourites?.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-1.5 font-heading text-lg text-brown">
            <Star size={16} strokeWidth={1.75} className="text-gold" /> Favourite Items
          </h2>
          <div className="flex flex-wrap gap-2">
            {customer.favourites.map((p) => (
              <Link
                key={p._id}
                to={`/product/${p.slug}`}
                className="rounded-pill border border-[rgba(169,141,116,0.3)] px-3 py-1.5 text-sm text-brown-soft hover:border-maroon"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div>
        <h2 className="mb-3 font-heading text-lg text-brown">Order History</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-brown-mute">No orders yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {orders.map((order) => {
              const { weekday, dayNum, month } = formatDayParts(order.deliveryDate);
              return (
                <Link
                  key={order._id}
                  to={`/owner/orders/${order._id}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-[rgba(169,141,116,0.2)] bg-paper p-3 hover:border-maroon"
                >
                  <div>
                    <p className="font-medium text-brown">{order.orderId}</p>
                    <p className="text-sm text-brown-mute">
                      {order.items.map((i) => `${i.qty}× ${i.nameSnapshot}`).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-sm text-brown-mute sm:inline">
                      {weekday} {dayNum} {month} • {order.deliverySlot}
                    </span>
                    <span className="font-medium tabular-nums text-brown">{formatRupees(order.grandTotal)}</span>
                    <Badge variant={STATUS_VARIANT[order.orderStatus] || 'neutral'}>
                      {STATUS_LABEL[order.orderStatus] || order.orderStatus}
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={blockOpen} onClose={() => setBlockOpen(false)} title="Block Customer">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-brown-soft">
            {customer.name} won't be able to sign up, log in, or place orders until you unblock them.
          </p>
          <textarea
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            rows={3}
            placeholder="Reason for blocking (shown to the customer)"
            className="w-full rounded-sm border border-[rgba(169,141,116,0.35)] bg-paper px-3.5 py-2.5 text-sm text-brown placeholder:text-brown-mute focus:outline-none focus:ring-2 focus:ring-[rgba(140,29,47,0.4)] focus:border-maroon"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setBlockOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} onClick={confirmBlock} disabled={!blockReason.trim()}>
              Confirm Block
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
