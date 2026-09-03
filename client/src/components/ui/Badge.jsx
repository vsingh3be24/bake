const VARIANTS = {
  sale: 'bg-crimson text-cream',
  hot: 'bg-maroon text-cream',
  new: 'bg-olive text-cream',
  info: 'bg-info text-cream',
  'in-stock': 'bg-[rgba(46,125,50,0.12)] text-in-stock',
  'low-stock': 'bg-[rgba(229,142,38,0.14)] text-low-stock',
  'out-stock': 'bg-[rgba(198,40,40,0.12)] text-out-stock',
  neutral: 'bg-cream-deep text-brown-soft',
};

export function Badge({ variant = 'neutral', className = '', children, ...props }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-semibold tracking-wide',
        VARIANTS[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </span>
  );
}
