import { useEffect, useRef, useState } from 'react';
import { Star, Zap, Check, Package } from 'lucide-react';
import { Switch } from '../ui/Switch.jsx';

const MODE_LABEL = { unlimited: 'Unlimited', counted: 'Counted', daily_capacity: 'Daily Cap' };

function stockState(p) {
  if (!p.inStock) return 'out';
  if (p.stockMode === 'counted' && p.stockCount <= 0) return 'out';
  if (p.stockMode === 'counted' && p.stockCount <= p.lowStockThreshold) return 'low';
  return 'in';
}

const DOT = { in: 'bg-in-stock', low: 'bg-low-stock', out: 'bg-out-stock' };

/**
 * One editable stock row. Numeric fields keep a local draft so typing stays
 * smooth, and auto-save is debounced; the parent owns the canonical product
 * and re-syncs the draft only when the *saved* value changes (see the effect),
 * so a settled edit never visibly jumps.
 */
export function StockRow({ product, selected, onToggleSelect, onSave, onToggleHot, onFlash }) {
  const [draft, setDraft] = useState({
    stockCount: product.stockCount,
    dailyCapacity: product.dailyCapacity,
    lowStockThreshold: product.lowStockThreshold,
    restockDate: product.restockDate ? product.restockDate.slice(0, 10) : '',
  });
  const [savedFlash, setSavedFlash] = useState(false);
  const timers = useRef({});

  // Re-sync a field only when the canonical (server) value changes, so an
  // in-flight keystroke is never clobbered by an unrelated re-render.
  useEffect(() => {
    setDraft((d) => ({ ...d, stockCount: product.stockCount }));
  }, [product.stockCount]);
  useEffect(() => {
    setDraft((d) => ({ ...d, dailyCapacity: product.dailyCapacity }));
  }, [product.dailyCapacity]);
  useEffect(() => {
    setDraft((d) => ({ ...d, lowStockThreshold: product.lowStockThreshold }));
  }, [product.lowStockThreshold]);
  useEffect(() => {
    setDraft((d) => ({ ...d, restockDate: product.restockDate ? product.restockDate.slice(0, 10) : '' }));
  }, [product.restockDate]);

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const scheduleSave = (field, rawValue, delay = 600) => {
    clearTimeout(timers.current[field]);
    timers.current[field] = setTimeout(async () => {
      const ok = await onSave(product._id, { [field]: rawValue });
      if (ok) flashSaved();
    }, delay);
  };

  const onNumberChange = (field) => (e) => {
    const value = e.target.value;
    setDraft((d) => ({ ...d, [field]: value === '' ? '' : Number(value) }));
    if (value !== '') scheduleSave(field, Number(value));
  };

  const onRestockChange = (e) => {
    const value = e.target.value;
    setDraft((d) => ({ ...d, restockDate: value }));
    scheduleSave('restockDate', value || null, 300);
  };

  const changeMode = async (e) => {
    const ok = await onSave(product._id, { stockMode: e.target.value });
    if (ok) flashSaved();
  };

  const toggleStatus = async (checked) => {
    const ok = await onSave(product._id, { inStock: checked });
    if (ok) flashSaved();
  };

  const state = stockState(product);

  const numberInput =
    'w-16 rounded-sm border border-[rgba(169,141,116,0.35)] bg-paper px-2 py-1 text-sm tabular-nums text-brown focus:border-maroon focus:outline-none focus:ring-2 focus:ring-[rgba(140,29,47,0.35)]';

  return (
    <div
      className={[
        'flex flex-wrap items-center gap-x-4 gap-y-3 rounded-md border bg-paper p-3',
        state === 'out'
          ? 'border-[rgba(198,40,40,0.35)]'
          : state === 'low'
          ? 'border-[rgba(229,142,38,0.4)]'
          : 'border-[rgba(169,141,116,0.2)]',
      ].join(' ')}
    >
      {/* select + identity */}
      <div className="flex min-w-[180px] flex-1 items-center gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(product._id)}
          aria-label={`Select ${product.name}`}
          className="h-4 w-4 accent-maroon"
        />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-cream-deep">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <Package size={18} strokeWidth={1.75} className="text-brown-mute" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-brown">{product.name}</p>
          <p className="truncate text-xs text-brown-mute">{product.category?.name}</p>
        </div>
      </div>

      {/* mode */}
      <label className="flex flex-col text-[11px] text-brown-mute">
        Mode
        <select
          value={product.stockMode}
          onChange={changeMode}
          className="mt-0.5 rounded-sm border border-[rgba(169,141,116,0.35)] bg-paper px-2 py-1 text-sm text-brown focus:border-maroon focus:outline-none"
        >
          {Object.entries(MODE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {/* stock (counted) */}
      <label className="flex flex-col text-[11px] text-brown-mute">
        Stock
        {product.stockMode === 'counted' ? (
          <input
            type="number"
            min={0}
            value={draft.stockCount}
            onChange={onNumberChange('stockCount')}
            className={`mt-0.5 ${numberInput} ${state === 'low' ? 'text-low-stock' : ''}`}
          />
        ) : (
          <span className="mt-0.5 py-1 text-sm text-brown-mute">—</span>
        )}
      </label>

      {/* daily capacity */}
      <label className="flex flex-col text-[11px] text-brown-mute">
        Capacity/day
        {product.stockMode === 'daily_capacity' ? (
          <input
            type="number"
            min={0}
            value={draft.dailyCapacity}
            onChange={onNumberChange('dailyCapacity')}
            className={`mt-0.5 ${numberInput}`}
          />
        ) : (
          <span className="mt-0.5 py-1 text-sm text-brown-mute">—</span>
        )}
      </label>

      {/* low-stock threshold */}
      <label className="flex flex-col text-[11px] text-brown-mute">
        Low at
        {product.stockMode === 'counted' ? (
          <input
            type="number"
            min={0}
            value={draft.lowStockThreshold}
            onChange={onNumberChange('lowStockThreshold')}
            className={`mt-0.5 ${numberInput}`}
          />
        ) : (
          <span className="mt-0.5 py-1 text-sm text-brown-mute">—</span>
        )}
      </label>

      {/* restock date (shown when out of stock) */}
      <label className="flex flex-col text-[11px] text-brown-mute">
        Back on
        <input
          type="date"
          value={draft.restockDate}
          onChange={onRestockChange}
          className="mt-0.5 rounded-sm border border-[rgba(169,141,116,0.35)] bg-paper px-2 py-1 text-sm text-brown focus:border-maroon focus:outline-none"
        />
      </label>

      {/* status */}
      <div className="flex flex-col items-start text-[11px] text-brown-mute">
        <span className="mb-0.5 flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-pill ${DOT[state]}`} />
          Status
        </span>
        <Switch checked={product.inStock} onChange={toggleStatus} label={product.inStock ? 'In stock' : 'Out'} />
      </div>

      {/* actions */}
      <div className="flex items-center gap-1.5">
        {savedFlash && (
          <span className="flex items-center gap-0.5 text-xs text-in-stock">
            <Check size={13} strokeWidth={2} /> Saved
          </span>
        )}
        <button
          type="button"
          onClick={() => onToggleHot(product._id)}
          aria-label={product.isHotSelling ? 'Remove hot selling' : 'Mark hot selling'}
          aria-pressed={product.isHotSelling}
          title="Hot selling"
          className="rounded-sm p-1.5 text-brown-soft transition-colors hover:bg-[rgba(74,44,26,0.06)]"
        >
          <Star size={16} strokeWidth={1.75} fill={product.isHotSelling ? '#C9A227' : 'none'} className={product.isHotSelling ? 'text-gold' : ''} />
        </button>
        <button
          type="button"
          onClick={() => onFlash(product)}
          aria-label="Flash offer"
          title="Flash offer"
          className="rounded-sm p-1.5 text-brown-soft transition-colors hover:bg-[rgba(74,44,26,0.06)]"
        >
          <Zap size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

export { stockState };
