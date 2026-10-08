import React from 'react';
import type { NotificationType, NotificationPriority } from '../types';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Info,
  Calendar,
} from 'lucide-react';

export interface NotificationBadgeProps {
  type: NotificationType;
  priority?: NotificationPriority;
  size?: 'sm' | 'md';
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  type,
  size = 'sm',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  switch (type) {
    case 'RESERVATION_READY':
      return (
        <span
          className={`inline-flex items-center gap-1 font-mono font-bold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 ${sizeClasses}`}
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>Hold Ready</span>
        </span>
      );

    case 'DUE_SOON':
      return (
        <span
          className={`inline-flex items-center gap-1 font-mono font-bold rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 ${sizeClasses}`}
        >
          <Clock className="w-3 h-3" />
          <span>Due Soon</span>
        </span>
      );

    case 'OVERDUE':
      return (
        <span
          className={`inline-flex items-center gap-1 font-mono font-bold rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 ${sizeClasses}`}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>Overdue</span>
        </span>
      );

    case 'RESERVATION_EXPIRING':
      return (
        <span
          className={`inline-flex items-center gap-1 font-mono font-bold rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 ${sizeClasses}`}
        >
          <Clock className="w-3 h-3" />
          <span>Expiring Hold</span>
        </span>
      );

    case 'FINE_CREATED':
      return (
        <span
          className={`inline-flex items-center gap-1 font-mono font-bold rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 ${sizeClasses}`}
        >
          <DollarSign className="w-3 h-3" />
          <span>Fee Levied</span>
        </span>
      );

    case 'FINE_PAID':
      return (
        <span
          className={`inline-flex items-center gap-1 font-mono font-bold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 ${sizeClasses}`}
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>Receipt</span>
        </span>
      );

    case 'FINE_UPDATED':
      return (
        <span
          className={`inline-flex items-center gap-1 font-mono font-bold rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 ${sizeClasses}`}
        >
          <DollarSign className="w-3 h-3" />
          <span>Fine Update</span>
        </span>
      );

    case 'MEMBERSHIP_EXPIRING':
      return (
        <span
          className={`inline-flex items-center gap-1 font-mono font-bold rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 ${sizeClasses}`}
        >
          <Calendar className="w-3 h-3" />
          <span>Membership</span>
        </span>
      );

    case 'SYSTEM_BROADCAST':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-mono font-bold rounded-full bg-brand/10 text-brand border border-brand/20 ${sizeClasses}`}
        >
          <Info className="w-3 h-3" />
          <span>System</span>
        </span>
      );
  }
};
