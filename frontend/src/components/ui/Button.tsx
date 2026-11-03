import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  let sizeStyles = 'px-4 py-2 text-sm';
  if (size === 'sm') sizeStyles = 'px-3 py-1.5 text-xs';
  if (size === 'lg') sizeStyles = 'px-6 py-2.5 text-base';

  let variantStyles = 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700/60';
  if (variant === 'gold') {
    variantStyles = 'luxury-button-gold text-slate-950 font-semibold border border-amber-400/40';
  } else if (variant === 'primary') {
    variantStyles = 'bg-blue-600 hover:bg-blue-500 text-white font-medium border border-blue-500/50 shadow-sm';
  } else if (variant === 'outline') {
    variantStyles = 'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white border border-slate-700';
  } else if (variant === 'ghost') {
    variantStyles = 'bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-transparent';
  } else if (variant === 'danger') {
    variantStyles = 'bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 border border-rose-700/50';
  }

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin text-current" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
