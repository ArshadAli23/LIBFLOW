import React from 'react';
import type { ReservationStatus } from '../types';
import { cn } from '../../../lib/utils';
import { Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

export interface ReservationStatusBadgeProps {
  status: ReservationStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const ReservationStatusBadge: React.FC<ReservationStatusBadgeProps> = ({
  status,
  size = 'md',
  className,
}) => {
  const configMap: Record<
    ReservationStatus,
    { label: string; icon: React.ReactNode; bg: string; text: string; border: string }
  > = {
    WAITING: {
      label: 'In Queue',
      icon: <Clock className="w-3 h-3 text-amber-500 shrink-0" />,
      bg: 'bg-amber-500/10',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-500/20',
    },
    READY_FOR_PICKUP: {
      label: 'Ready for Pickup',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />,
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-500/20',
    },
    CLAIMED: {
      label: 'Claimed',
      icon: <CheckCircle2 className="w-3 h-3 text-brand shrink-0" />,
      bg: 'bg-brand/10',
      text: 'text-brand',
      border: 'border-brand/20',
    },
    CANCELLED: {
      label: 'Cancelled',
      icon: <XCircle className="w-3 h-3 text-zinc-500 shrink-0" />,
      bg: 'bg-zinc-500/10',
      text: 'text-zinc-700 dark:text-zinc-400',
      border: 'border-zinc-500/20',
    },
    EXPIRED: {
      label: 'Expired',
      icon: <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />,
      bg: 'bg-rose-500/10',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-500/20',
    },
  };

  const config = configMap[status] || configMap.WAITING;

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
