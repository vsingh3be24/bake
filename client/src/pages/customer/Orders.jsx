import { useState } from 'react';
import { PackageSearch } from 'lucide-react';
import { useCustomerOrders } from '../../hooks/useCustomerOrders.js';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { OrderCard } from '../../components/customer/OrderCard.jsx';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

export function Orders() {
  const [filter, setFilter] = useState('all');
  const { orders, loading, error } = useCustomerOrders(filter);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-2xl text-brown">My Orders</h1>

      <Tabs tabs={FILTERS} active={filter} onChange={setFilter} layoutId="order-filter-tabs" />

      {error && <p className="text-out-stock">{error}</p>}

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <EmptyState
          icon={PackageSearch}
          title="No orders here"
          message="Your orders will show up here once you place one."
          actionLabel="Browse Menu"
          actionHref="/menu"
        />
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="flex flex-col gap-3">
          {orders.map((o) => (
            <OrderCard key={o._id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}
