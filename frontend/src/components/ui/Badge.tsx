import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'gold' | 'local' | 'cloud' | 'success' | 'warning' | 'danger' | 'neutral' | 'outline' | 'emerald';
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

  let variantStyles = 'bg-slate-800 text-slate-300 border-slate-700/60';
  if (variant === 'gold') {
    variantStyles = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
  } else if (variant === 'local') {
    variantStyles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-medium';
  } else if (variant === 'cloud') {
    variantStyles = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  } else if (variant === 'success' || variant === 'emerald') {
    variantStyles = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  } else if (variant === 'warning') {
    variantStyles = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  } else if (variant === 'danger') {
    variantStyles = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  } else if (variant === 'outline') {
    variantStyles = 'bg-transparent text-slate-300 border-slate-700/80';
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
