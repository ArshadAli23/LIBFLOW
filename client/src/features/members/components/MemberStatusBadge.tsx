import React from 'react';
import type { MemberStatus, MemberType } from '../types';
import { cn } from '../../../lib/utils';
import { CheckCircle2, AlertTriangle, Clock, XCircle, GraduationCap, Briefcase, Award, Globe } from 'lucide-react';

export interface MemberStatusBadgeProps {
  status: MemberStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export const MemberStatusBadge: React.FC<MemberStatusBadgeProps> = ({
  status,
  size = 'md',
  className,
}) => {
  const configMap: Record<
    MemberStatus,
    { label: string; icon: React.ReactNode; bg: string; text: string; border: string }
  > = {
    ACTIVE: {
      label: 'Active',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />,
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-500/20',
    },
    SUSPENDED: {
      label: 'Suspended',
      icon: <XCircle className="w-3 h-3 text-rose-500 shrink-0" />,
      bg: 'bg-rose-500/10',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-500/20',
    },
    EXPIRED: {
      label: 'Expired',
      icon: <Clock className="w-3 h-3 text-zinc-500 shrink-0" />,
      bg: 'bg-zinc-500/10',
      text: 'text-zinc-700 dark:text-zinc-400',
      border: 'border-zinc-500/20',
    },
    PENDING: {
      label: 'Pending',
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

export const MemberTypeBadge: React.FC<{ type: MemberType; className?: string }> = ({
  type,
  className,
}) => {
  const iconMap: Record<MemberType, React.ReactNode> = {
    STUDENT: <GraduationCap className="w-3 h-3 text-brand shrink-0" />,
    FACULTY: <Award className="w-3 h-3 text-purple-500 shrink-0" />,
    STAFF: <Briefcase className="w-3 h-3 text-sky-500 shrink-0" />,
    EXTERNAL: <Globe className="w-3 h-3 text-amber-500 shrink-0" />,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-canvas-subtle border border-border-subtle text-canvas-muted',
        className
      )}
    >
      {iconMap[type]}
      <span>{type}</span>
    </span>
  );
};
