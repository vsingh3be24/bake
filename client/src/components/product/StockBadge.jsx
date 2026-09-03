import { getStockStatus } from '../../lib/stock.js';

const DOT = { in: 'bg-in-stock', low: 'bg-low-stock', out: 'bg-out-stock' };
const TEXT = { in: 'text-in-stock', low: 'text-low-stock', out: 'text-out-stock' };

export function StockBadge({ product, className = '' }) {
  const status = getStockStatus(product);
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${TEXT[status.level]} ${className}`}>
      <span className={`h-2 w-2 rounded-pill ${DOT[status.level]}`} />
      {status.label}
    </span>
  );
}
