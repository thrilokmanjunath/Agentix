import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'teal' | 'gold' | 'glass';
  className?: string;
  children: React.ReactNode;
}

export function Card({
  variant = 'default',
  className = '',
  children,
  ...props
}: CardProps) {
  let variantStyles = 'bg-[var(--surface-primary)] border border-[var(--border-subtle)] shadow-sm';
  if (variant === 'elevated') {
    variantStyles = 'bg-[var(--surface-primary)] border border-[var(--border-strong)] shadow-md';
  } else if (variant === 'teal' || variant === 'gold') {
    variantStyles = 'bg-[var(--surface-primary)] border border-[var(--accent-primary)]/40 shadow-sm shadow-[var(--accent-soft-alpha)]';
  } else if (variant === 'glass') {
    variantStyles = 'teal-glass';
  }

  return (
    <div
      className={`rounded-xl transition-all duration-200 ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-6 py-5 border-b border-[var(--border-subtle)] flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-base font-semibold text-[var(--text-primary)] tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-[var(--text-secondary)] mt-1 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 rounded-b-xl flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
