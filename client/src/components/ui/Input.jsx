import { forwardRef, useId } from 'react';

export const Input = forwardRef(function Input(
  { label, error, helperText, required, className = '', ...props },
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
      <input
        ref={ref}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        className={[
          'w-full rounded-sm border bg-paper px-3.5 py-2.5 text-base text-brown',
          'placeholder:text-brown-mute',
          'focus:outline-none focus:ring-2 focus:ring-[rgba(140,29,47,0.4)] focus:border-maroon',
          error ? 'border-out-stock' : 'border-[rgba(169,141,116,0.35)]',
          className,
        ].join(' ')}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-out-stock">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-sm text-brown-mute">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});
