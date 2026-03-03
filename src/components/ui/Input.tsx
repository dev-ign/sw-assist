import { cn } from '../../lib/utils'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[var(--color-text-secondary)]"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          'h-12 w-full rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] px-4 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-40',
          error && 'border-[var(--color-error)] focus:border-[var(--color-error)]',
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="text-xs text-[var(--color-error)]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>
      ) : null}
    </div>
  )
}
