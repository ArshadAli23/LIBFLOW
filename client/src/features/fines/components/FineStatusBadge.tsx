import React from 'react';
import type { FineStatus } from '../types';
import { AlertCircle, Clock, CheckCircle2, ShieldOff } from 'lucide-react';

export interface FineStatusBadgeProps {
  status: FineStatus;
  size?: 'sm' | 'md';
}

export const FineStatusBadge: React.FC<FineStatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  switch (status) {
    case 'UNPAID':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-mono font-semibold rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 ${sizeClasses}`}
        >
          <AlertCircle className={iconSize} />
          <span>Unpaid</span>
        </span>
      );

    case 'PARTIALLY_PAID':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-mono font-semibold rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 ${sizeClasses}`}
        >
          <Clock className={iconSize} />
          <span>Partially Paid</span>
        </span>
      );

    case 'PAID':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-mono font-semibold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 ${sizeClasses}`}
        >
          <CheckCircle2 className={iconSize} />
          <span>Settled</span>
        </span>
      );

    case 'WAIVED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-mono font-semibold rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 ${sizeClasses}`}
        >
          <ShieldOff className={iconSize} />
          <span>Waived</span>
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center font-mono rounded-full bg-canvas-subtle text-canvas-muted ${sizeClasses}`}>
          {status}
        </span>
      );
  }
};
