import { forwardRef, type InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export const FormField = forwardRef<HTMLInputElement, Props>(function FormField(
  { label, hint, error, id, className = '', ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <label htmlFor={inputId} className="block">
      <span className="font-mono text-xs uppercase tracking-[0.02em] text-[var(--ink-muted)]">
        {label}
      </span>
      <input
        ref={ref}
        id={inputId}
        className={`mt-2 block w-full h-12 px-4 rounded-lg bg-white border font-sans text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] transition-colors focus:outline-none ${
          error
            ? 'border-[var(--warn)] focus:border-[var(--warn)]'
            : 'border-[var(--line)] focus:border-[var(--ink)]'
        } ${className}`}
        {...rest}
      />
      {error ? (
        <span className="mt-2 block text-xs text-[var(--warn)]">{error}</span>
      ) : hint ? (
        <span className="mt-2 block text-xs text-[var(--ink-muted)]">{hint}</span>
      ) : null}
    </label>
  );
});
