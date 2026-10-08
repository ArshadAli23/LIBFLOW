import React from 'react';
import type { LoanStatus } from '../types';
import { cn } from '../../../lib/utils';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export interface LoanStatusBadgeProps {
  status: LoanStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const LoanStatusBadge: React.FC<LoanStatusBadgeProps> = ({
  status,
  size = 'md',
  className,
}) => {
  const configMap: Record<
    LoanStatus,
    { label: string; icon: React.ReactNode; bg: string; text: string; border: string }
  > = {
    ACTIVE: {
      label: 'Active Loan',
      icon: <Clock className="w-3 h-3 text-emerald-500 shrink-0" />,
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-500/20',
    },
    OVERDUE: {
      label: 'Overdue',
      icon: <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />,
      bg: 'bg-rose-500/10',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-500/20',
    },
    RETURNED: {
      label: 'Returned',
      icon: <CheckCircle2 className="w-3 h-3 text-zinc-500 shrink-0" />,
      bg: 'bg-zinc-500/10',
      text: 'text-zinc-700 dark:text-zinc-400',
      border: 'border-zinc-500/20',
    },
    LOST: {
      label: 'Missing / Lost',
      icon: <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />,
      bg: 'bg-amber-500/10',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-500/20',
    },
  };

  const config = configMap[status] || configMap.ACTIVE;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono uppercase tracking-wider font-semibold rounded-full border',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
