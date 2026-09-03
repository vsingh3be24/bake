import { Link, useNavigate } from 'react-router-dom';
import { Phone, PackageSearch } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { useCustomerOrders } from '../../hooks/useCustomerOrders.js';
import { useOffers } from '../../hooks/useOffers.js';
import { useCartStore } from '../../store/cartStore.js';
import { useToast } from '../../hooks/useToast.js';
import { api } from '../../lib/api.js';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { OrderTimeline } from '../../components/customer/OrderTimeline.jsx';
import { formatRupees } from '../../lib/format.js';
import { formatDayParts } from '../../lib/availability.js';
import { addReorderItem } from '../../lib/reorder.js';

const ACTIVE_STATUSES = ['placed', 'confirmed', 'in_queue', 'preparing', 'ready', 'out_for_delivery'];

export function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const customer = useAuthStore((s) => s.customer);
  const { orders, loading, error } = useCustomerOrders('all');
  const { offers } = useOffers();
  const addItem = useCartStore((s) => s.addItem);

  const activeOrder = orders.find((o) => ACTIVE_STATUSES.includes(o.orderStatus));
  const recentDelivered = orders.filter((o) => o.orderStatus === 'delivered').slice(0, 3);

  const reorderQuick = async (orderId) => {
    try {
      const { data } = await api.post(`/customer/orders/${orderId}/reorder`);
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
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl text-brown">
          Hello, {customer?.name?.split(' ')[0] || 'there'} 👋
        </h1>
        {customer && (
          <p className="mt-1 text-sm text-brown-soft">
            <span className="capitalize">{customer.tier}</span> Member • {customer.loyaltyPoints || 0} points
          </p>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : activeOrder ? (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-brown">📦 {activeOrder.orderId}</p>
              <p className="text-sm text-brown-soft">{formatRupees(activeOrder.grandTotal)}</p>
            </div>
            <Badge variant="info">{activeOrder.orderStatus.replace(/_/g, ' ')}</Badge>
          </div>
          <div className="mt-4">
            <OrderTimeline status={activeOrder.orderStatus} />
          </div>
          <p className="mt-4 text-sm text-brown-soft">
            Expected: {formatDayParts(activeOrder.deliveryDate).weekday}, {activeOrder.deliverySlot}
          </p>
          <div className="mt-3 flex gap-2">
            <Button as={Link} to={`/me/orders/${activeOrder._id}`} size="sm">
              Track
            </Button>
            <Button as="a" href="tel:+918017853043" variant="secondary" size="sm">
              <Phone size={14} strokeWidth={1.75} /> Call Us
            </Button>
          </div>
        </Card>
      ) : null}

      {recentDelivered.length > 0 && (
        <div>
          <h2 className="mb-3 font-heading text-xl text-brown">🔁 Order Again</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentDelivered.map((o) => (
              <button
                key={o._id}
                type="button"
                onClick={() => reorderQuick(o._id)}
                className="shrink-0 rounded-md border border-[rgba(169,141,116,0.3)] bg-paper px-4 py-3 text-left text-sm text-brown-soft transition-colors hover:border-maroon"
              >
                {o.items
                  .slice(0, 2)
                  .map((i) => `${i.nameSnapshot} ×${i.qty}`)
                  .join(', ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {offers.length > 0 && (
        <div>
          <h2 className="mb-3 font-heading text-xl text-brown">⚡ Offers For You</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {offers.slice(0, 4).map((o) => (
              <Card key={o._id} className="p-4">
                <p className="font-medium text-brown">{o.title}</p>
                {o.subtitle && <p className="text-sm text-brown-soft">{o.subtitle}</p>}
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && error && orders.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-out-stock">{error}</p>
        </Card>
      )}

      {!loading && !error && orders.length === 0 && (
        <EmptyState
          icon={PackageSearch}
          title="No orders yet"
          message="Your orders will show up here once you place one."
          actionLabel="Browse Menu"
          actionHref="/menu"
        />
      )}
    </div>
  );
}
