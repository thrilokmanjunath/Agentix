import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'teal' | 'gold' | 'local' | 'cloud' | 'success' | 'warning' | 'danger' | 'neutral' | 'outline' | 'emerald';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  children,
  className = '',
  ...props
}: BadgeProps) {
  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  let variantStyles = 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
  if (variant === 'teal' || variant === 'gold') {
    variantStyles = 'bg-[var(--accent-soft-alpha)] text-[var(--accent-primary)] border-[var(--accent-primary)]/30 font-medium';
  } else if (variant === 'local' || variant === 'success' || variant === 'emerald') {
    variantStyles = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 font-medium';
  } else if (variant === 'cloud') {
    variantStyles = 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25';
  } else if (variant === 'warning') {
    variantStyles = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25';
  } else if (variant === 'danger') {
    variantStyles = 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25';
  } else if (variant === 'outline') {
    variantStyles = 'bg-transparent text-[var(--text-secondary)] border-[var(--border-subtle)]';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border tracking-wide uppercase font-mono ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
