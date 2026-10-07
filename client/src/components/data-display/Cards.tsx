import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from '../feedback/FeedbackStates';

// ==========================================
// Card Primitive
// ==========================================
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'doppelrand' | 'interactive';
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'default',
  header,
  footer,
  children,
  ...props
}) => {
  if (variant === 'doppelrand') {
    return (
      <div className={cn('doppelrand', className)} {...props}>
        <div className="doppelrand-inner p-4 sm:p-5 inset-highlight">
          {header && <div className="mb-4 pb-3 border-b border-border-subtle">{header}</div>}
          <div>{children}</div>
          {footer && <div className="mt-4 pt-3 border-t border-border-subtle">{footer}</div>}
        </div>
      </div>
    );
  }

  const variantStyles = {
    default: 'bg-surface border border-border-subtle shadow-card',
    elevated: 'bg-surface border border-border-subtle shadow-elevated',
    interactive:
      'bg-surface border border-border-subtle hover:border-border-strong hover:shadow-elevated transition-all duration-200 cursor-pointer active:scale-[0.99]',
  };

  return (
    <div
      className={cn(
        'rounded-xl p-4 sm:p-5 text-canvas-text',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {header && <div className="mb-3.5 pb-3 border-b border-border-subtle">{header}</div>}
      <div>{children}</div>
      {footer && <div className="mt-4 pt-3 border-t border-border-subtle">{footer}</div>}
    </div>
  );
};

// ==========================================
// StatCard (Library Analytics Metric Card)
// ==========================================
export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  supportingText?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    period?: string;
  };
  isLoading?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  supportingText,
  trend,
  isLoading = false,
  className,
}) => {
  if (isLoading) {
    return (
      <Card variant="doppelrand" className={className}>
        <div className="flex items-center justify-between gap-4 mb-3">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-8 h-8 rounded-lg" />
        </div>
        <Skeleton className="w-28 h-8 mb-2" />
        <Skeleton className="w-36 h-3" />
      </Card>
    );
  }

  return (
    <Card variant="doppelrand" className={className}>
      <div className="flex items-start justify-between gap-4 mb-2">
        <span className="text-xs font-medium text-canvas-muted uppercase tracking-wider font-mono">
          {title}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-canvas-subtle border border-border-subtle flex items-center justify-center text-canvas-text shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-1.5">
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight font-sans text-canvas-text">
          {value}
        </h3>
      </div>

      <div className="flex items-center gap-2 text-xs">
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-medium font-mono text-[11px]',
              trend.isPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            )}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend.value}
          </span>
        )}

        {(supportingText || trend?.period) && (
          <span className="text-canvas-muted truncate">
            {supportingText || trend?.period}
          </span>
        )}
      </div>
    </Card>
  );
};

// ==========================================
// Avatar & AvatarGroup
// ==========================================
export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  status?: 'online' | 'offline';
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  className,
  status,
}) => {
  const sizeStyles = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={cn('relative inline-flex shrink-0 select-none', className)}>
      <div
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center font-semibold font-mono bg-canvas-subtle border border-border-subtle text-canvas-text shadow-ambient',
          sizeStyles[size]
        )}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-surface',
            status === 'online' ? 'bg-emerald-500' : 'bg-zinc-400'
          )}
        />
      )}
    </div>
  );
};

export const AvatarGroup: React.FC<{
  children: React.ReactNode;
  max?: number;
  className?: string;
}> = ({ children, max = 3, className }) => {
  const childrenArray = React.Children.toArray(children);
  const visible = childrenArray.slice(0, max);
  const remaining = childrenArray.length - max;

  return (
    <div className={cn('flex items-center -space-x-2', className)}>
      {visible.map((child, i) => (
        <div key={i} className="ring-2 ring-surface rounded-full">
          {child}
        </div>
      ))}
      {remaining > 0 && (
        <div className="w-8 h-8 rounded-full bg-canvas-subtle border border-border-subtle text-canvas-muted text-xs font-mono font-medium flex items-center justify-center ring-2 ring-surface">
          +{remaining}
        </div>
      )}
    </div>
  );
};

// ==========================================
// DataRow (Key-Value Metadata Display)
// ==========================================
export const DataRow: React.FC<{
  label: string;
  value: React.ReactNode;
  className?: string;
}> = ({ label, value, className }) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-2 text-xs sm:text-sm border-b border-border-subtle last:border-0',
        className
      )}
    >
      <span className="text-canvas-muted">{label}</span>
      <span className="font-medium text-canvas-text font-mono text-right truncate max-w-[60%]">
        {value}
      </span>
    </div>
  );
};
