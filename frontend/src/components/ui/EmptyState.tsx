import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 backdrop-blur-sm ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-sm">
        <Icon size={26} strokeWidth={1.75} />
      </div>
      <h4 className="text-base font-semibold text-slate-100 mb-1 font-serif">{title}</h4>
      <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button variant="gold" size="sm">
            {actionLabel}
          </Button>
        </Link>
      )}
      {actionLabel && !actionHref && onAction && (
        <Button variant="gold" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
