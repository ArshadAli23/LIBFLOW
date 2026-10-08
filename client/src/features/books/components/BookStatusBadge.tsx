/**
 * LIBFLOW — Book & Copy Status Badge
 * 
 * Consistent status and condition indicators reusing the design token system.
 */

import React from 'react';
import { Badge, type BadgeVariant } from '../../../components/data-display/Badge';
import type { BookStatus, CopyStatus, CopyCondition } from '../types';

export interface BookStatusBadgeProps {
  status: BookStatus;
  size?: 'sm' | 'md';
}

export const BookStatusBadge: React.FC<BookStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const isArchived = status === 'ARCHIVED';
  return (
    <Badge
      variant={isArchived ? 'neutral' : 'success'}
      size={size}
      withDot
    >
      {isArchived ? 'Archived' : 'Active Catalog'}
    </Badge>
  );
};

export interface CopyStatusBadgeProps {
  status: CopyStatus;
  size?: 'sm' | 'md';
}

export const CopyStatusBadge: React.FC<CopyStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const configMap: Record<CopyStatus, { label: string; variant: BadgeVariant }> = {
    AVAILABLE: { label: 'Available', variant: 'success' },
    BORROWED: { label: 'Borrowed', variant: 'info' },
    RESERVED: { label: 'Reserved', variant: 'warning' },
    LOST: { label: 'Lost', variant: 'error' },
    DAMAGED: { label: 'Damaged', variant: 'error' },
    MAINTENANCE: { label: 'Maintenance', variant: 'neutral' },
    WITHDRAWN: { label: 'Withdrawn', variant: 'neutral' },
  };

  const config = configMap[status] || { label: status, variant: 'neutral' };

  return (
    <Badge variant={config.variant} size={size} withDot>
      {config.label}
    </Badge>
  );
};

export interface CopyConditionBadgeProps {
  condition: CopyCondition;
  size?: 'sm' | 'md';
}

export const CopyConditionBadge: React.FC<CopyConditionBadgeProps> = ({ condition, size = 'sm' }) => {
  const conditionVariants: Record<CopyCondition, BadgeVariant> = {
    NEW: 'success',
    EXCELLENT: 'success',
    GOOD: 'info',
    FAIR: 'warning',
    POOR: 'error',
    DAMAGED: 'error',
  };

  return (
    <Badge variant={conditionVariants[condition] || 'neutral'} size={size}>
      {condition}
    </Badge>
  );
};
