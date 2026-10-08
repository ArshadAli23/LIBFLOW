/**
 * LIBFLOW — Availability Summary & Segmented Progress Component
 * 
 * Elegant representation of physical copy inventory distribution:
 * Available vs Borrowed vs Reserved vs Total.
 */

import React from 'react';
import { cn } from '../../../lib/utils';

export interface AvailabilitySummaryProps {
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  reservedCopies: number;
  variant?: 'detailed' | 'compact' | 'minimal';
  className?: string;
}

export const AvailabilitySummary: React.FC<AvailabilitySummaryProps> = ({
  totalCopies,
  availableCopies,
  borrowedCopies,
  reservedCopies,
  variant = 'detailed',
  className,
}) => {
  const safeTotal = totalCopies > 0 ? totalCopies : 1;
  const availPct = Math.round((availableCopies / safeTotal) * 100);
  const borrowedPct = Math.round((borrowedCopies / safeTotal) * 100);
  const reservedPct = Math.round((reservedCopies / safeTotal) * 100);

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-2 text-xs', className)}>
        <span
          className={cn(
            'font-mono font-semibold',
            availableCopies > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
          )}
        >
          {availableCopies}
        </span>
        <span className="text-canvas-muted text-[11px]">/ {totalCopies} avail</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('space-y-1.5 w-full', className)}>
        <div className="flex items-center justify-between text-xs">
          <span className="text-canvas-muted text-[11px] font-mono">
            {availableCopies} of {totalCopies} Available
          </span>
          <span className="font-mono text-[10px] text-canvas-muted">{availPct}%</span>
        </div>
        {/* Segmented bar */}
        <div className="h-1.5 w-full bg-canvas-subtle rounded-full overflow-hidden flex">
          <div
            style={{ width: `${availPct}%` }}
            className="bg-emerald-500 transition-all duration-300"
            title={`${availableCopies} Available`}
          />
          <div
            style={{ width: `${borrowedPct}%` }}
            className="bg-sky-500 transition-all duration-300"
            title={`${borrowedCopies} Borrowed`}
          />
          <div
            style={{ width: `${reservedPct}%` }}
            className="bg-amber-500 transition-all duration-300"
            title={`${reservedCopies} Reserved`}
          />
        </div>
      </div>
    );
  }

  // Detailed Variant for Book Details Page
  return (
    <div
      className={cn(
        'p-4 sm:p-5 rounded-xl border border-border-subtle bg-surface shadow-card space-y-4',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-canvas-muted">
            Collection Inventory Status
          </h4>
          <p className="text-sm font-semibold text-canvas-text mt-0.5">
            {availableCopies > 0
              ? `${availableCopies} Copies Available on Shelf`
              : 'All Copies Currently Checked Out or Staged'}
          </p>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-canvas-subtle text-canvas-muted border border-border-subtle">
          {totalCopies} Total Copies
        </span>
      </div>

      {/* Segmented Bar */}
      <div className="space-y-1.5">
        <div className="h-2.5 w-full bg-canvas-subtle rounded-full overflow-hidden flex shadow-xs">
          <div
            style={{ width: `${availPct}%` }}
            className="bg-emerald-500 transition-all duration-500"
            title={`${availableCopies} Available (${availPct}%)`}
          />
          <div
            style={{ width: `${borrowedPct}%` }}
            className="bg-sky-500 transition-all duration-500"
            title={`${borrowedCopies} Borrowed (${borrowedPct}%)`}
          />
          <div
            style={{ width: `${reservedPct}%` }}
            className="bg-amber-500 transition-all duration-500"
            title={`${reservedCopies} Reserved (${reservedPct}%)`}
          />
        </div>
      </div>

      {/* 4 Metric Pill Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
        <div className="p-2.5 rounded-lg border border-border-subtle bg-canvas-subtle/50">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-semibold uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Available
          </div>
          <div className="text-lg font-mono font-bold text-canvas-text mt-0.5">
            {availableCopies}
          </div>
          <span className="text-[10px] text-canvas-muted">On active stacks</span>
        </div>

        <div className="p-2.5 rounded-lg border border-border-subtle bg-canvas-subtle/50">
          <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-mono text-[10px] font-semibold uppercase">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            Borrowed
          </div>
          <div className="text-lg font-mono font-bold text-canvas-text mt-0.5">
            {borrowedCopies}
          </div>
          <span className="text-[10px] text-canvas-muted">With patron</span>
        </div>

        <div className="p-2.5 rounded-lg border border-border-subtle bg-canvas-subtle/50">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-semibold uppercase">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Reserved
          </div>
          <div className="text-lg font-mono font-bold text-canvas-text mt-0.5">
            {reservedCopies}
          </div>
          <span className="text-[10px] text-canvas-muted">In hold queue</span>
        </div>

        <div className="p-2.5 rounded-lg border border-border-subtle bg-canvas-subtle/50">
          <div className="flex items-center gap-1.5 text-canvas-muted font-mono text-[10px] font-semibold uppercase">
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
            Total Copies
          </div>
          <div className="text-lg font-mono font-bold text-canvas-text mt-0.5">
            {totalCopies}
          </div>
          <span className="text-[10px] text-canvas-muted">Accessioned count</span>
        </div>
      </div>
    </div>
  );
};
