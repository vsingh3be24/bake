import { formatRupees } from '../../lib/format.js';
import { getSavings } from '../../lib/stock.js';

export function PriceTag({ price, salePrice, showSavings = false, size = 'md' }) {
  const savings = getSavings(price, salePrice);
  const sizeClass = size === 'lg' ? 'text-2xl' : 'text-lg';

  if (!savings) {
    return <span className={`font-semibold tabular-nums text-brown ${sizeClass}`}>{formatRupees(price)}</span>;
  }

  return (
    <span className="inline-flex items-baseline gap-2 flex-wrap">
      <span className={`font-semibold tabular-nums text-maroon ${sizeClass}`}>{formatRupees(salePrice)}</span>
      <span className="text-sm tabular-nums text-brown-mute line-through">{formatRupees(price)}</span>
      {showSavings && <span className="text-sm text-olive">You save {formatRupees(savings.amount)}</span>}
    </span>
  );
}
