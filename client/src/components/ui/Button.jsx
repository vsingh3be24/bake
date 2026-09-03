const VARIANTS = {
  primary: 'bg-maroon text-cream hover:bg-maroon-dark',
  secondary: 'bg-transparent text-maroon border border-maroon hover:bg-[rgba(140,29,47,0.06)]',
  ghost: 'bg-transparent text-brown-soft hover:bg-[rgba(74,44,26,0.06)]',
  danger: 'bg-out-stock text-cream hover:brightness-90',
};

const SIZES = {
  sm: 'text-sm px-3 py-1.5 gap-1.5',
  md: 'text-base px-5 py-2.5 gap-2',
  lg: 'text-lg px-7 py-3.5 gap-2.5',
};

export function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  loadingText,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <Component
      disabled={Component === 'button' ? isDisabled : undefined}
      aria-disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center rounded-pill font-medium',
        'transition-colors duration-150',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? loadingText || 'Please wait...' : children}
    </Component>
  );
}
