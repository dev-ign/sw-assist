import { cn } from '../../lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed',
        {
          'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] active:scale-[0.98]':
            variant === 'primary',
          'bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] active:scale-[0.98]':
            variant === 'secondary',
          'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]':
            variant === 'ghost',
        },
        {
          'h-9 px-4 text-sm gap-1.5': size === 'sm',
          'h-12 px-6 text-base gap-2': size === 'md',
          'h-14 px-8 text-lg gap-2': size === 'lg',
        },
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  )
}
