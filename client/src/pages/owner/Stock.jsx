import { useMemo, useState } from 'react';
import { Search, TriangleAlert, X } from 'lucide-react';
import { useOwnerStock } from '../../hooks/useOwnerStock.js';
import { useToast } from '../../hooks/useToast.js';
import { api } from '../../lib/api.js';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { StockRow, stockState } from '../../components/owner/StockRow.jsx';
import { QuickFlashModal } from '../../components/owner/QuickFlashModal.jsx';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'in_stock', label: 'In Stock' },
  { id: 'low', label: 'Low ⚠️' },
  { id: 'out', label: 'Out 🔴' },
  { id: 'unlimited', label: 'Unlimited' },
];

function matchesFilter(p, filter) {
  const state = stockState(p);
  switch (filter) {
    case 'in_stock':
      return state === 'in' || state === 'low';
    case 'low':
      return state === 'low';
    case 'out':
      return state === 'out';
    case 'unlimited':
      return p.stockMode === 'unlimited';
    default:
      return true;
  }
}

export function OwnerStock() {
  const toast = useToast();
  const { products, loading, error, setProducts, refresh } = useOwnerStock();

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [bulkValue, setBulkValue] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [flashProduct, setFlashProduct] = useState(null);

  const saveField = async (id, patch) => {
    try {
      const { data } = await api.patch(`/owner/products/${id}/stock`, patch);
      setProducts((prev) => prev.map((p) => (p._id === id ? data : p)));
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save — please try again');
      return false;
    }
  };

  const toggleHot = async (id) => {
    try {
      const { data } = await api.patch(`/owner/products/${id}/hot-selling`);
      setProducts((prev) => prev.map((p) => (p._id === id ? data : p)));
    } catch {
      toast.error('Could not update hot selling');
    }
  };

  const onFlash = (product) => setFlashProduct(product);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => matchesFilter(p, filter) && (!q || p.name.toLowerCase().includes(q)));
  }, [products, filter, search]);

  const counts = useMemo(() => {
    const c = { all: products.length, in_stock: 0, low: 0, out: 0, unlimited: 0 };
    for (const p of products) {
      const s = stockState(p);
      if (s === 'in' || s === 'low') c.in_stock += 1;
      if (s === 'low') c.low += 1;
      if (s === 'out') c.out += 1;
      if (p.stockMode === 'unlimited') c.unlimited += 1;
    }
    return c;
  }, [products]);

  const lowItems = products.filter((p) => stockState(p) === 'low');
  const outItems = products.filter((p) => stockState(p) === 'out');

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p._id));
  const toggleSelectAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((p) => next.delete(p._id));
      else filtered.forEach((p) => next.add(p._id));
      return next;
    });

  const runBulk = async (action, value) => {
    setBulkBusy(true);
    try {
      const { data } = await api.patch('/owner/products/bulk-stock', {
        ids: [...selected],
        action,
        value,
      });
      toast.success(`${data.modified} item${data.modified === 1 ? '' : 's'} updated`);
      setSelected(new Set());
      setBulkValue('');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk update failed');
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-2xl text-brown">Stock</h1>

      {/* Low-stock alert panel */}
      {(lowItems.length > 0 || outItems.length > 0) && (
        <div className="flex flex-col gap-2">
          {lowItems.length > 0 && (
            <div className="flex items-start gap-2 rounded-md bg-[rgba(229,142,38,0.1)] px-4 py-2.5 text-sm text-low-stock">
              <TriangleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              <span>Running low: {lowItems.map((p) => `${p.name} (${p.stockCount})`).join(', ')}</span>
            </div>
          )}
          {outItems.length > 0 && (
            <div className="flex items-start gap-2 rounded-md bg-[rgba(198,40,40,0.08)] px-4 py-2.5 text-sm text-out-stock">
              <TriangleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              <span>Out of stock: {outItems.map((p) => p.name).join(', ')}</span>
            </div>
          )}
        </div>
      )}

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={[
                'rounded-pill px-3.5 py-1.5 text-sm font-medium transition-colors',
                filter === f.id ? 'bg-maroon text-cream' : 'bg-cream-deep text-brown-soft hover:text-brown',
              ].join(' ')}
            >
              {f.label} <span className="opacity-70">({counts[f.id]})</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
          <Search size={16} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-mute" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full rounded-sm border border-[rgba(169,141,116,0.35)] bg-paper py-2 pl-9 pr-3.5 text-sm text-brown focus:border-maroon focus:outline-none focus:ring-2 focus:ring-[rgba(140,29,47,0.35)]"
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-maroon bg-[rgba(140,29,47,0.05)] px-4 py-3">
          <span className="text-sm font-medium text-brown">{selected.size} selected</span>
          <Button size="sm" disabled={bulkBusy} onClick={() => runBulk('markInStock')}>
            Mark In Stock
          </Button>
          <Button size="sm" variant="secondary" disabled={bulkBusy} onClick={() => runBulk('markOutOfStock')}>
            Mark Out
          </Button>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              placeholder="qty"
              className="w-20 rounded-sm border border-[rgba(169,141,116,0.35)] bg-paper px-2 py-1 text-sm tabular-nums text-brown focus:border-maroon focus:outline-none"
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={bulkBusy || bulkValue === ''}
              onClick={() => runBulk('setStock', Number(bulkValue))}
            >
              Set Stock
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={bulkBusy || bulkValue === ''}
              onClick={() => runBulk('setCapacity', Number(bulkValue))}
            >
              Set Capacity
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto flex items-center gap-1 text-sm text-brown-soft hover:text-brown"
          >
            <X size={14} strokeWidth={1.75} /> Clear
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-out-stock">{error}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.length > 0 && (
            <label className="flex items-center gap-2 px-3 text-sm text-brown-soft">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 accent-maroon"
              />
              Select all ({filtered.length})
            </label>
          )}
          {filtered.map((p) => (
            <StockRow
              key={p._id}
              product={p}
              selected={selected.has(p._id)}
              onToggleSelect={toggleSelect}
              onSave={saveField}
              onToggleHot={toggleHot}
              onFlash={onFlash}
            />
          ))}
          {filtered.length === 0 && (
            <p className="py-12 text-center text-brown-soft">No items match this view.</p>
          )}
        </div>
      )}

      <QuickFlashModal product={flashProduct} onClose={() => setFlashProduct(null)} />
    </div>
  );
}
