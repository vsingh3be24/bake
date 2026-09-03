import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, LayoutGrid, Rows3, Plus } from 'lucide-react';
import { useOwnerOrders } from '../../hooks/useOwnerOrders.js';
import { useToast } from '../../hooks/useToast.js';
import { api } from '../../lib/api.js';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { OrderListRow } from '../../components/owner/OrderListRow.jsx';
import { OrderKanban } from '../../components/owner/OrderKanban.jsx';
import { ManualOrderModal } from '../../components/owner/ManualOrderModal.jsx';

const TABS = [
  { id: 'placed', label: 'New' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
  { id: 'out_for_delivery', label: 'Out' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

export function OwnerOrders() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState('placed');
  const [view, setView] = useState('list'); // 'list' | 'kanban'
  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(searchParams.get('paymentStatus') || '');
  const [manualOpen, setManualOpen] = useState(searchParams.get('manual') === '1');

  useEffect(() => {
    if (searchParams.get('manual') || searchParams.get('paymentStatus') || searchParams.get('payment')) {
      if (searchParams.get('payment')) setPayment(searchParams.get('payment'));
      const next = new URLSearchParams(searchParams);
      next.delete('manual');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One fetch covers every tab and both views — status filtering happens
  // client-side against this set, so switching tabs never re-hits the server
  // and the tab counts stay in sync with whatever's actually on screen.
  const filters = useMemo(() => {
    const f = {};
    if (payment) f.payment = payment;
    if (paymentStatus) f.paymentStatus = paymentStatus;
    if (search.trim()) f.q = search.trim();
    return f;
  }, [payment, paymentStatus, search]);

  const { orders: allOrders, loading, error, refresh } = useOwnerOrders(filters);

  const counts = useMemo(() => {
    const c = { placed: 0, confirmed: 0, preparing: 0, ready: 0, out_for_delivery: 0, delivered: 0, cancelled: 0 };
    for (const o of allOrders) {
      if (o.orderStatus === 'in_queue') c.confirmed += 1;
      else if (o.orderStatus === 'rejected') c.cancelled += 1;
      else if (c[o.orderStatus] !== undefined) c[o.orderStatus] += 1;
    }
    return c;
  }, [allOrders]);

  const tabsWithCounts = TABS.map((t) => ({ ...t, count: counts[t.id] }));

  const orders =
    tab === 'cancelled'
      ? allOrders.filter((o) => ['cancelled', 'rejected'].includes(o.orderStatus))
      : tab === 'confirmed'
      ? allOrders.filter((o) => ['confirmed', 'in_queue'].includes(o.orderStatus))
      : allOrders.filter((o) => o.orderStatus === tab);

  const moveStatus = async (orderId, status) => {
    try {
      await api.patch(`/owner/orders/${orderId}/status`, { status });
      toast.success('Order updated');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update the order');
    }
  };

  const kanbanOrders = allOrders.filter((o) => !['cancelled', 'rejected'].includes(o.orderStatus));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl text-brown">Orders</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-pill border border-[rgba(169,141,116,0.3)] p-0.5">
            <button
              type="button"
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
              className={`rounded-pill p-1.5 ${view === 'list' ? 'bg-maroon text-cream' : 'text-brown-soft'}`}
              aria-label="List view"
            >
              <Rows3 size={16} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setView('kanban')}
              aria-pressed={view === 'kanban'}
              className={`rounded-pill p-1.5 ${view === 'kanban' ? 'bg-maroon text-cream' : 'text-brown-soft'}`}
              aria-label="Kanban view"
            >
              <LayoutGrid size={16} strokeWidth={1.75} />
            </button>
          </div>
          <Button size="sm" onClick={() => setManualOpen(true)}>
            <Plus size={14} strokeWidth={1.75} /> Manual Order
          </Button>
        </div>
      </div>

      {view === 'list' && <Tabs tabs={tabsWithCounts} active={tab} onChange={setTab} />}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-mute" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, or order ID..."
            className="w-full rounded-sm border border-[rgba(169,141,116,0.35)] bg-paper py-2.5 pl-9 pr-3.5 text-sm text-brown focus:border-maroon focus:outline-none focus:ring-2 focus:ring-[rgba(140,29,47,0.4)]"
          />
        </div>
        <div className="w-40">
          <Select value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option value="">All Payments</option>
            <option value="UPI">UPI</option>
            <option value="COD">COD</option>
          </Select>
        </div>
        <div className="w-48">
          <Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
            <option value="">Any Payment Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </Select>
        </div>
      </div>

      {loading && allOrders.length === 0 ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : error ? (
        <p className="text-out-stock">{error}</p>
      ) : view === 'kanban' ? (
        <OrderKanban orders={kanbanOrders} onMoveStatus={moveStatus} onCardClick={(o) => navigate(`/owner/orders/${o._id}`)} />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders here" message="Nothing matches this view right now." />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <OrderListRow key={order._id} order={order} />
          ))}
        </div>
      )}

      <ManualOrderModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onCreated={(order) => {
          refresh();
          navigate(`/owner/orders/${order._id}`);
        }}
      />
    </div>
  );
}
