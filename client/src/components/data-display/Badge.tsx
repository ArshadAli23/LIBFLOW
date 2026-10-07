import React from 'react';
import { cn } from '../../lib/utils';

export type StatusType =
  | 'AVAILABLE'
  | 'BORROWED'
  | 'OVERDUE'
  | 'RESERVED'
  | 'MAINTENANCE'
  | 'WAITING'
  | 'READY_FOR_PICKUP'
  | 'CLAIMED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'PAID'
  | 'PENDING';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'brand' | 'outline';

interface StatusConfig {
  label: string;
  variant: BadgeVariant;
  dotColor: string;
}

const STATUS_MAP: Record<StatusType, StatusConfig> = {
  AVAILABLE: { label: 'Available', variant: 'success', dotColor: 'bg-emerald-500' },
  BORROWED: { label: 'Borrowed', variant: 'info', dotColor: 'bg-sky-500' },
  OVERDUE: { label: 'Overdue', variant: 'error', dotColor: 'bg-rose-500' },
  RESERVED: { label: 'Reserved', variant: 'info', dotColor: 'bg-sky-500' },
  MAINTENANCE: { label: 'Maintenance', variant: 'neutral', dotColor: 'bg-zinc-500' },
  WAITING: { label: 'Waiting', variant: 'warning', dotColor: 'bg-amber-500' },
  READY_FOR_PICKUP: { label: 'Ready for Pickup', variant: 'success', dotColor: 'bg-emerald-500' },
  CLAIMED: { label: 'Claimed', variant: 'neutral', dotColor: 'bg-zinc-500' },
  EXPIRED: { label: 'Expired', variant: 'error', dotColor: 'bg-rose-500' },
  CANCELLED: { label: 'Cancelled', variant: 'neutral', dotColor: 'bg-zinc-400' },
  ACTIVE: { label: 'Active', variant: 'success', dotColor: 'bg-emerald-500' },
  SUSPENDED: { label: 'Suspended', variant: 'error', dotColor: 'bg-rose-500' },
  PAID: { label: 'Paid', variant: 'success', dotColor: 'bg-emerald-500' },
  PENDING: { label: 'Pending', variant: 'warning', dotColor: 'bg-amber-500' },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  withDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  withDot = false,
  children,
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    neutral: 'bg-canvas-subtle text-canvas-muted border-border-subtle',
    success: 'bg-status-available-bg text-status-available-text border-status-available-border',
    warning: 'bg-status-warning-bg text-status-warning-text border-status-warning-border',
    error: 'bg-status-overdue-bg text-status-overdue-text border-status-overdue-border',
    info: 'bg-status-info-bg text-status-info-text border-status-info-border',
    brand: 'bg-brand text-brand-foreground border-transparent',
    outline: 'bg-transparent text-canvas-text border-border-strong',
  };

  const dotColors: Record<BadgeVariant, string> = {
    neutral: 'bg-canvas-muted',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    info: 'bg-sky-500',
    brand: 'bg-brand-foreground',
    outline: 'bg-canvas-text',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium font-mono rounded-full border tracking-wide uppercase select-none transition-colors duration-150',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {withDot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: StatusType;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  withDot = true,
  className,
  ...props
}) => {
  const config = STATUS_MAP[status] || {
    label: status,
    variant: 'neutral' as BadgeVariant,
    dotColor: 'bg-zinc-400',
  };

  return (
    <Badge
      variant={config.variant}
      size={size}
      withDot={withDot}
      className={className}
      {...props}
    >
      {config.label}
    </Badge>
  );
};
