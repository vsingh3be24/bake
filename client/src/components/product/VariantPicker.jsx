export function VariantPicker({ variants, selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {variants.map((variant) => {
        const isActive = variant.label === selected;
        const outOfStock = variant.stockCount <= 0;
        return (
          <button
            key={variant.label}
            type="button"
            disabled={outOfStock}
            onClick={() => onChange(variant.label)}
            className={[
              'rounded-pill border px-4 py-2 text-sm font-medium transition-colors',
              outOfStock
                ? 'cursor-not-allowed border-[rgba(169,141,116,0.3)] text-brown-mute line-through'
                : isActive
                ? 'border-maroon bg-maroon text-cream'
                : 'border-[rgba(169,141,116,0.35)] text-brown-soft hover:border-maroon',
            ].join(' ')}
          >
            {variant.label}
          </button>
        );
      })}
    </div>
  );
}
