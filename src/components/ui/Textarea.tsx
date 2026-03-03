import { cn } from '../../lib/utils'
import type { TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export function Textarea({ label, error, hint, className, id, ...props }: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label
          htmlFor={textareaId}
          className="text-sm font-medium text-[var(--color-text-secondary)]"
        >
          {label}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        className={cn(
          'w-full rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] px-4 py-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-40 resize-none',
          error && 'border-[var(--color-error)]',
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
