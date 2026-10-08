import React from 'react';
import { formatCurrency } from '../finePolicy';

export interface FineAmountProps {
  amount: number;
  currencySymbol?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'danger' | 'warning' | 'success' | 'neutral';
  className?: string;
}

export const FineAmount: React.FC<FineAmountProps> = ({
  amount,
  currencySymbol = '₹',
  size = 'md',
  variant = 'neutral',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-xs font-semibold',
    md: 'text-sm font-bold',
    lg: 'text-lg font-bold',
    xl: 'text-2xl sm:text-3xl font-serif font-bold',
  }[size];

  const variantClasses = {
    danger: 'text-rose-600 dark:text-rose-400',
    warning: 'text-amber-600 dark:text-amber-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    neutral: 'text-canvas-text',
  }[variant];

  return (
    <span className={`font-mono tracking-tight ${sizeClasses} ${variantClasses} ${className}`}>
      {formatCurrency(amount, currencySymbol)}
    </span>
  );
};
