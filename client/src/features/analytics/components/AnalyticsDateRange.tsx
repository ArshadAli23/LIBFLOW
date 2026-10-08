import React from 'react';
import type { DateRangeOption } from '../types';
import { Calendar } from 'lucide-react';

export interface AnalyticsDateRangeProps {
  value: DateRangeOption;
  onChange: (value: DateRangeOption) => void;
}

export const AnalyticsDateRange: React.FC<AnalyticsDateRangeProps> = ({
  value,
  onChange,
}) => {
  const options: { value: DateRangeOption; label: string }[] = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: 'This Year' },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-canvas-subtle border border-border-subtle text-xs font-mono shadow-xs">
      <div className="pl-2 pr-1 text-canvas-muted hidden sm:flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-brand" />
        <span className="text-[11px] uppercase tracking-wider font-semibold">Range:</span>
      </div>

      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
            value === opt.value
              ? 'bg-surface text-canvas-text shadow-sm font-semibold'
              : 'text-canvas-muted hover:text-canvas-text'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
