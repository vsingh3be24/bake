import { Link, useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, TriangleAlert, CircleCheck, BadgeCheck, Zap, ClipboardList } from 'lucide-react';
import { useOwnerDashboard } from '../../hooks/useOwnerDashboard.js';
import { useToast } from '../../hooks/useToast.js';
import { api } from '../../lib/api.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Switch } from '../../components/ui/Switch.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { CountUp } from '../../components/owner/CountUp.jsx';
import { formatRupees } from '../../lib/format.js';

function StatCard({ label, value, prefix = '', warn = false }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-brown-mute">{label}</p>
      <p className={`mt-1 font-heading text-3xl ${warn ? 'text-out-stock' : 'text-brown'}`}>
        <CountUp value={value} prefix={prefix} />
      </p>
    </Card>
  );
}

export function OwnerDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, refresh } = useOwnerDashboard();

  const toggleShop = async (open) => {
    try {
      await api.patch('/owner/settings', { shopOpen: open });
      toast.success(open ? 'Shop is now open' : 'Shop is now closed');
      refresh();
    } catch {
      toast.error('Could not update shop status');
    }
  };

  const act = async (orderId, action) => {
    try {
      if (action === 'accept') await api.patch(`/owner/orders/${orderId}/status`, { status: 'confirmed' });
      else if (action === 'reject') await api.post(`/owner/orders/${orderId}/reject`, {});
      else if (action === 'paid') await api.patch(`/owner/orders/${orderId}/payment`, { paymentStatus: 'paid' });
      toast.success(action === 'accept' ? 'Order confirmed' : action === 'reject' ? 'Order rejected' : 'Marked as paid');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-out-stock">{error || 'Could not load the dashboard'}</p>;
  }

  const capacityPct = data.dailyOrderCapacity
    ? Math.min(Math.round((data.stats.ordersToday / data.dailyOrderCapacity) * 100), 100)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Master switch + capacity */}
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-brown-soft">Shop Status:</span>
            <span className={`inline-flex items-center gap-1.5 font-semibold ${data.shopOpen ? 'text-in-stock' : 'text-out-stock'}`}>
              <span className={`h-2.5 w-2.5 rounded-pill ${data.shopOpen ? 'bg-in-stock' : 'bg-out-stock'}`} />
              {data.shopOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
          <Switch checked={data.shopOpen} onChange={toggleShop} label={data.shopOpen ? 'Open' : 'Closed'} />
        </div>
        <div>
          <div className="flex items-center justify-between text-sm text-brown-soft">
            <span>Today: {data.stats.ordersToday} orders / {data.dailyOrderCapacity} capacity</span>
            <span>{capacityPct}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-pill bg-cream-deep">
            <div
              className="h-full rounded-pill bg-maroon transition-all"
              style={{ width: `${capacityPct}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Today's Orders" value={data.stats.ordersToday} />
        <StatCard label="Today's Sale" value={data.stats.salesToday} prefix="₹" />
        <StatCard label="Pending Payment" value={data.stats.pendingPayment} warn={data.stats.pendingPayment > 0} />
        <StatCard label="Low Stock" value={data.stats.lowStockCount} warn={data.stats.lowStockCount > 0} />
      </div>

      {/* Alert strip */}
      {(data.alerts.lowStock.length > 0 || data.alerts.outOfStock.length > 0 || data.alerts.paymentsToVerify.length > 0) && (
        <div className="flex flex-col gap-2">
          {data.alerts.outOfStock.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-[rgba(198,40,40,0.08)] px-4 py-2.5 text-sm text-out-stock">
              <TriangleAlert size={16} strokeWidth={1.75} className="shrink-0" />
              <span className="min-w-0 flex-1">Out of stock: {data.alerts.outOfStock.map((p) => p.name).join(', ')}</span>
              <button type="button" onClick={() => navigate('/owner/stock')} className="ml-auto shrink-0 font-medium underline">
                Fix
              </button>
            </div>
          )}
          {data.alerts.lowStock.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-[rgba(229,142,38,0.1)] px-4 py-2.5 text-sm text-low-stock">
              <TriangleAlert size={16} strokeWidth={1.75} className="shrink-0" />
              <span className="min-w-0 flex-1">
                Low stock: {data.alerts.lowStock.map((p) => `${p.name} (${p.stockCount} left)`).join(', ')}
              </span>
              <button type="button" onClick={() => navigate('/owner/stock')} className="ml-auto shrink-0 font-medium underline">
                Fix
              </button>
            </div>
          )}
          {data.alerts.paymentsToVerify.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-[rgba(46,110,183,0.1)] px-4 py-2.5 text-sm text-info">
              <TriangleAlert size={16} strokeWidth={1.75} className="shrink-0" />
              <span className="min-w-0 flex-1">{data.alerts.paymentsToVerify.length} UPI payment(s) need verifying</span>
              <button
                type="button"
                onClick={() => navigate('/owner/orders?paymentStatus=pending&payment=UPI')}
                className="ml-auto shrink-0 font-medium underline"
              >
                Verify
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2.5">
        <Button size="sm" onClick={() => navigate('/owner/orders?manual=1')}>
          + Manual Order
        </Button>
        <Button as={Link} to="/owner/offers" size="sm" variant="secondary">
          <Zap size={14} strokeWidth={1.75} /> + Flash Offer
        </Button>
        <Button as={Link} to="/owner/baking-list" size="sm" variant="secondary">
          <ClipboardList size={14} strokeWidth={1.75} /> Today's Baking List
        </Button>
      </div>

      {/* New orders feed */}
      <div>
        <h2 className="mb-3 font-heading text-xl text-brown">New Orders</h2>
        {data.newOrders.length === 0 ? (
          <Card className="p-6 text-center text-brown-soft">No new orders waiting on you 🎉</Card>
        ) : (
          <div className="flex flex-col gap-3">
            {data.newOrders.map((order) => (
              <Card key={order._id} className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <Link to={`/owner/orders/${order._id}`} className="font-semibold text-maroon">
                    {order.orderId}
                  </Link>
                  <span className="text-xs text-brown-mute">
                    {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-brown-soft">
                  {order.contact.name} • {order.contact.phone}
                </p>
                <p className="text-sm text-brown-soft">
                  {order.items.map((i) => `${i.qty}× ${i.nameSnapshot}`).join(', ')}
                </p>
                <p className="text-sm text-brown">
                  {formatRupees(order.grandTotal)} • {order.paymentMethod}
                  {order.paymentMethod === 'UPI' && order.paymentStatus === 'pending' && (
                    <span className="ml-1 text-low-stock">⚠️ verify</span>
                  )}
                </p>
                {order.specialNote && <p className="text-sm italic text-brown-mute">"{order.specialNote}"</p>}
                <div className="mt-1 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => act(order._id, 'accept')}>
                    <CircleCheck size={14} strokeWidth={1.75} /> Accept
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => act(order._id, 'reject')}>
                    Reject
                  </Button>
                  <Button as="a" href={`tel:+91${order.contact.phone}`} size="sm" variant="secondary">
                    <Phone size={14} strokeWidth={1.75} /> Call
                  </Button>
                  <Button as="a" href={`https://wa.me/91${order.contact.phone}`} size="sm" variant="secondary">
                    <MessageCircle size={14} strokeWidth={1.75} /> WhatsApp
                  </Button>
                  {order.paymentMethod === 'UPI' && order.paymentStatus === 'pending' && (
                    <Button size="sm" variant="secondary" onClick={() => act(order._id, 'paid')}>
                      <BadgeCheck size={14} strokeWidth={1.75} /> Mark Paid
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
