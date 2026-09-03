import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Download, Copy } from 'lucide-react';
import { useOwnerCustomers } from '../../hooks/useOwnerCustomers.js';
import { useToast } from '../../hooks/useToast.js';
import { downloadCustomersCsv, phoneListText } from '../../lib/customerExport.js';
import { formatRupees } from '../../lib/format.js';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';

const TIER_VARIANT = { gold: 'sale', silver: 'info', regular: 'neutral' };

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

export function OwnerCustomers() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [blocked, setBlocked] = useState('');
  const [sort, setSort] = useState('recent');
  const [selected, setSelected] = useState(new Set());

  const filters = useMemo(() => {
    const f = { sort };
    if (search.trim()) f.search = search.trim();
    if (tier) f.tier = tier;
    if (blocked) f.blocked = blocked;
    return f;
  }, [search, tier, blocked, sort]);

  const { customers, loading, error } = useOwnerCustomers(filters);

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allSelected = customers.length > 0 && customers.every((c) => selected.has(c._id));
  const toggleSelectAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) customers.forEach((c) => next.delete(c._id));
      else customers.forEach((c) => next.add(c._id));
      return next;
    });

  const selectedCustomers = customers.filter((c) => selected.has(c._id));

  const exportCsv = () => {
    const rows = selectedCustomers.length > 0 ? selectedCustomers : customers;
    downloadCustomersCsv(rows);
    toast.success(`Exported ${rows.length} customer${rows.length === 1 ? '' : 's'}`);
  };

  const copyPhones = async () => {
    const rows = selectedCustomers.length > 0 ? selectedCustomers : customers;
    try {
      await navigator.clipboard.writeText(phoneListText(rows));
      toast.success(`Copied ${rows.length} number${rows.length === 1 ? '' : 's'} — paste into a WhatsApp broadcast list`);
    } catch {
      toast.error('Could not copy — your browser blocked clipboard access');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-2xl text-brown">Customers</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-mute" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone..."
            className="w-full rounded-sm border border-[rgba(169,141,116,0.35)] bg-paper py-2 pl-9 pr-3.5 text-sm text-brown focus:border-maroon focus:outline-none focus:ring-2 focus:ring-[rgba(140,29,47,0.35)]"
          />
        </div>
        <div className="w-36">
          <Select value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="">All Tiers</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="regular">Regular</option>
          </Select>
        </div>
        <div className="w-36">
          <Select value={blocked} onChange={(e) => setBlocked(e.target.value)}>
            <option value="">All Customers</option>
            <option value="false">Active</option>
            <option value="true">Blocked</option>
          </Select>
        </div>
        <div className="w-40">
          <Select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Recent Order</option>
            <option value="spent">Top Spenders</option>
            <option value="orders">Most Orders</option>
            <option value="name">Name A-Z</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {selected.size > 0 && <span className="text-sm text-brown-soft">{selected.size} selected</span>}
        <Button size="sm" variant="secondary" onClick={exportCsv} disabled={customers.length === 0}>
          <Download size={14} strokeWidth={1.75} /> Export CSV{selected.size > 0 ? ` (${selected.size})` : ''}
        </Button>
        <Button size="sm" variant="secondary" onClick={copyPhones} disabled={customers.length === 0}>
          <Copy size={14} strokeWidth={1.75} /> Copy Phone Numbers{selected.size > 0 ? ` (${selected.size})` : ''}
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-out-stock">{error}</p>
      ) : customers.length === 0 ? (
        <EmptyState title="No customers found" message="Try a different search or filter." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-[rgba(169,141,116,0.2)]">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[rgba(169,141,116,0.2)] bg-cream-deep text-left text-brown-soft">
                <th className="w-10 p-3">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 accent-maroon" />
                </th>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Phone</th>
                <th className="p-3 font-medium">Tier</th>
                <th className="p-3 font-medium">Orders</th>
                <th className="p-3 font-medium">Total Spent</th>
                <th className="p-3 font-medium">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id} className="border-b border-[rgba(169,141,116,0.12)] bg-paper last:border-0 hover:bg-cream-deep">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(c._id)}
                      onChange={() => toggleSelect(c._id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 accent-maroon"
                    />
                  </td>
                  <td className="p-3">
                    <Link to={`/owner/customers/${c._id}`} className="font-medium text-brown hover:text-maroon">
                      {c.name}
                    </Link>
                    {c.isBlocked && (
                      <Badge variant="out-stock" className="ml-2">
                        Blocked
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 text-brown-soft">{c.phone}</td>
                  <td className="p-3">
                    <Badge variant={TIER_VARIANT[c.tier] || 'neutral'} className="capitalize">
                      {c.tier}
                    </Badge>
                  </td>
                  <td className="p-3 tabular-nums text-brown-soft">{c.totalOrders}</td>
                  <td className="p-3 tabular-nums text-brown-soft">{formatRupees(c.totalSpent)}</td>
                  <td className="p-3 text-brown-mute">{formatDate(c.lastOrderAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
