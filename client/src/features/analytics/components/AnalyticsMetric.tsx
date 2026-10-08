import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface AnalyticsMetricProps {
  label: string;
  value: string | number;
  subtext?: string;
  change?: {
    value: string;
    positive: boolean;
  };
  icon?: React.ReactNode;
  variant?: 'brand' | 'success' | 'warning' | 'neutral';
}

export const AnalyticsMetric: React.FC<AnalyticsMetricProps> = ({
  label,
  value,
  subtext,
  change,
  icon,
  variant = 'neutral',
}) => {
  const variantColor = {
    brand: 'text-brand',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    neutral: 'text-canvas-text',
  }[variant];

  return (
    <div className="p-5 rounded-2xl border border-border-subtle bg-surface shadow-card flex flex-col justify-between space-y-3">
      <div className="flex items-center justify-between text-xs font-mono text-canvas-muted">
        <span className="uppercase tracking-wider font-semibold">{label}</span>
        {icon && <div className="text-canvas-muted shrink-0">{icon}</div>}
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl sm:text-3xl font-serif font-bold tracking-tight ${variantColor}`}>
            {value}
          </span>
          {change && (
            <span
              className={`inline-flex items-center text-[11px] font-mono font-semibold ${
                change.positive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {change.positive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {change.value}
            </span>
          )}
        </div>

        {subtext && (
          <p className="text-xs text-canvas-muted leading-tight">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};
