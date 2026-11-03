import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'gold' | 'glass';
  className?: string;
  children: React.ReactNode;
}

export function Card({
  variant = 'default',
  className = '',
  children,
  ...props
}: CardProps) {
  let variantStyles = 'bg-slate-900/70 border border-slate-800/80 shadow-md backdrop-blur-md';
  if (variant === 'elevated') {
    variantStyles = 'bg-slate-900/90 border border-slate-700/60 shadow-lg';
  } else if (variant === 'gold') {
    variantStyles = 'luxury-panel-gold';
  } else if (variant === 'glass') {
    variantStyles = 'luxury-panel';
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
      className={`px-6 py-5 border-b border-slate-800/60 flex items-center justify-between ${className}`}
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
      className={`text-base font-semibold text-slate-100 tracking-tight flex items-center gap-2 ${className}`}
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
    <p className={`text-xs text-slate-400 mt-1 ${className}`} {...props}>
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
      className={`px-6 py-4 border-t border-slate-800/60 bg-slate-950/30 rounded-b-xl flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
