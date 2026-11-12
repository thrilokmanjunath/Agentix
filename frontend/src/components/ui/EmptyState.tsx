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
      className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-secondary)]/40 backdrop-blur-sm ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft-alpha)] border border-[var(--accent-primary)]/25 flex items-center justify-center text-[var(--accent-primary)] mb-4 shadow-sm">
        <Icon size={26} strokeWidth={1.75} />
      </div>
      <h4 className="text-base font-semibold text-[var(--text-primary)] mb-1 font-heading">{title}</h4>
      <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button variant="primary" size="sm">
            {actionLabel}
          </Button>
        </Link>
      )}
      {actionLabel && !actionHref && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
