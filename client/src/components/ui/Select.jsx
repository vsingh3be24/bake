import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(function Select(
  { label, error, helperText, required, className = '', children, ...props },
  ref
) {
  const generatedId = useId();
  const id = props.id || generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-brown">
          {label}
          {required && <span className="text-out-stock ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-invalid={!!error}
          className={[
            'w-full appearance-none rounded-sm border bg-paper px-3.5 py-2.5 pr-10 text-base text-brown',
            'focus:outline-none focus:ring-2 focus:ring-[rgba(140,29,47,0.4)] focus:border-maroon',
            error ? 'border-out-stock' : 'border-[rgba(169,141,116,0.35)]',
            className,
          ].join(' ')}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brown-soft"
        />
      </div>
      {error ? (
        <p className="text-sm text-out-stock">{error}</p>
      ) : helperText ? (
        <p className="text-sm text-brown-mute">{helperText}</p>
      ) : null}
    </div>
  );
});
