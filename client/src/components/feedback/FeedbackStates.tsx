import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X, RefreshCw, Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

// ==========================================
// Alert Component
// ==========================================
export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  variant?: AlertVariant;
  title: string;
  description?: string;
  onClose?: () => void;
  className?: string;
  action?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  description,
  onClose,
  className,
  action,
}) => {
  const variantStyles: Record<AlertVariant, { container: string; icon: React.ReactNode }> = {
    info: {
      container: 'border-status-info-border bg-status-info-bg/30 text-status-info-text',
      icon: <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" strokeWidth={1.75} />,
    },
    success: {
      container: 'border-status-available-border bg-status-available-bg/30 text-status-available-text',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />,
    },
    warning: {
      container: 'border-status-warning-border bg-status-warning-bg/30 text-status-warning-text',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={1.75} />,
    },
    error: {
      container: 'border-status-overdue-border bg-status-overdue-bg/30 text-status-overdue-text',
      icon: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" strokeWidth={1.75} />,
    },
  };

  const { container, icon } = variantStyles[variant];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-3.5 sm:p-4 rounded-lg border text-xs sm:text-sm shadow-ambient',
        container,
        className
      )}
    >
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <h5 className="font-semibold tracking-tight text-canvas-text leading-tight">{title}</h5>
        {description && (
          <p className="mt-1 text-canvas-muted text-xs leading-relaxed">{description}</p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          className="text-canvas-muted hover:text-canvas-text rounded p-0.5 shrink-0 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// ==========================================
// Spinner Component
// ==========================================
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className,
}) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <svg
      className={cn('animate-spin text-brand shrink-0', sizeMap[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
};

// ==========================================
// Skeleton (Atmospheric Shimmer)
// ==========================================
export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-canvas-subtle border border-border-subtle/40',
        className
      )}
      {...props}
    />
  );
};

// ==========================================
// Progress Bar
// ==========================================
export const Progress: React.FC<{
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}> = ({ value, max = 100, className, showLabel = false }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-canvas-muted font-mono">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-1.5 w-full overflow-hidden rounded-full bg-canvas-subtle border border-border-subtle"
      >
        <div
          className="h-full bg-brand transition-all duration-300 ease-spring"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// ==========================================
// Full States: Loading, Error, Empty
// ==========================================
export const LoadingState: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading library data...',
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center text-canvas-muted',
        className
      )}
    >
      <Spinner size="lg" className="mb-3" />
      <p className="text-xs sm:text-sm font-medium">{message}</p>
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}> = ({
  title = 'An unexpected error occurred',
  message,
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 text-canvas-text',
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-sm sm:text-base font-semibold">{title}</h4>
      <p className="text-xs sm:text-sm text-canvas-muted mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="mt-4"
        >
          Try Again
        </Button>
      )}
    </div>
  );
};

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}> = ({
  icon = <Inbox className="w-6 h-6 text-canvas-muted" />,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-border-strong bg-canvas-subtle/50 text-canvas-text',
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-surface border border-border-subtle flex items-center justify-center shadow-ambient mb-3.5">
        {icon}
      </div>
      <h4 className="text-sm sm:text-base font-semibold tracking-tight">{title}</h4>
      <p className="text-xs sm:text-sm text-canvas-muted mt-1 max-w-sm leading-relaxed">
        {description}
      </p>
      {action && (
        <Button
          variant="primary"
          size="sm"
          onClick={action.onClick}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};
