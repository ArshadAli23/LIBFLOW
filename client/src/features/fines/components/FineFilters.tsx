import React from 'react';
import type { FineFilterState, FineStatus, FineReason } from '../types';
import { SearchInput, Select } from '../../../components/forms/FormControls';
import { Button } from '../../../components/ui/Button';
import { X } from 'lucide-react';

export interface FineFiltersProps {
  filterState: FineFilterState;
  onFilterChange: (updates: Partial<FineFilterState>) => void;
  onResetFilters: () => void;
  totalFines: number;
  filteredFinesCount: number;
}

export const FineFilters: React.FC<FineFiltersProps> = ({
  filterState,
  onFilterChange,
  onResetFilters,
  totalFines,
  filteredFinesCount,
}) => {
  const hasActiveFilters =
    filterState.search.trim().length > 0 ||
    filterState.status !== 'ALL' ||
    filterState.reason !== 'ALL';

  return (
    <div className="space-y-3">
      {/* Search & Actions Row */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="flex-1 min-w-[260px] max-w-xl">
          <SearchInput
            value={filterState.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            onClear={() => onFilterChange({ search: '' })}
            placeholder="Search by patron, title, fine ID (e.g. FN-2026-0014)..."
            shortcut="⌘F"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              leftIcon={<X className="w-3.5 h-3.5" />}
              className="text-xs text-canvas-muted hover:text-rose-600 h-9"
            >
              Reset Filters
            </Button>
          )}

          <span className="text-xs font-mono text-canvas-muted px-2.5 py-1.5 rounded-lg bg-canvas-subtle border border-border-subtle">
            Showing <strong className="text-canvas-text">{filteredFinesCount}</strong> of {totalFines}
          </span>
        </div>
      </div>

      {/* Filter Tabs and Selectors */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-canvas-subtle border border-border-subtle text-xs font-mono overflow-x-auto shadow-xs">
          {(['ALL', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'WAIVED'] as const).map((statusKey) => (
            <button
              key={statusKey}
              type="button"
              onClick={() => onFilterChange({ status: statusKey as FineStatus | 'ALL' })}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                filterState.status === statusKey
                  ? 'bg-surface text-canvas-text shadow-sm font-semibold'
                  : 'text-canvas-muted hover:text-canvas-text'
              }`}
            >
              {statusKey === 'ALL'
                ? 'All Fines'
                : statusKey === 'UNPAID'
                ? 'Unpaid Dues'
                : statusKey === 'PARTIALLY_PAID'
                ? 'Partially Paid'
                : statusKey === 'PAID'
                ? 'Settled'
                : 'Waived'}
            </button>
          ))}
        </div>

        {/* Reason Selector */}
        <div className="w-44">
          <Select
            value={filterState.reason}
            onChange={(e) => onFilterChange({ reason: e.target.value as FineReason | 'ALL' })}
            options={[
              { value: 'ALL', label: 'All Penalty Types' },
              { value: 'OVERDUE', label: 'Overdue Loan' },
              { value: 'DAMAGED_ITEM', label: 'Damaged Copy' },
              { value: 'LOST_ITEM', label: 'Lost Item Fee' },
              { value: 'PROCESSING_FEE', label: 'Administrative Fee' },
            ]}
          />
        </div>
      </div>
    </div>
  );
};
