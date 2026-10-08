import React from 'react';
import type { MemberFilterState, MemberSortOption, MemberStatus, MemberType } from '../types';
import { SearchInput, Select } from '../../../components/forms/FormControls';
import { Button } from '../../../components/ui/Button';
import { Filter, X, ArrowUpDown } from 'lucide-react';

export interface MemberFiltersProps {
  filterState: MemberFilterState;
  onFilterChange: (updates: Partial<MemberFilterState>) => void;
  onResetFilters: () => void;
  sortBy: MemberSortOption;
  onSortChange: (sort: MemberSortOption) => void;
  departments: string[];
  totalResults: number;
  totalMembers: number;
}

export const MemberFilters: React.FC<MemberFiltersProps> = ({
  filterState,
  onFilterChange,
  onResetFilters,
  sortBy,
  onSortChange,
  departments,
  totalResults,
  totalMembers,
}) => {
  const [isFilterTrayOpen, setIsFilterTrayOpen] = React.useState(false);

  const hasActiveFilters =
    filterState.search.trim().length > 0 ||
    filterState.status !== 'ALL' ||
    filterState.memberType !== 'ALL' ||
    filterState.department !== 'ALL';

  return (
    <div className="space-y-3">
      {/* Search & Action Row */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="flex-1 min-w-[260px] max-w-xl">
          <SearchInput
            value={filterState.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            onClear={() => onFilterChange({ search: '' })}
            placeholder="Search by patron name, ID (e.g. MB-2026-081), email..."
            shortcut="⌘F"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Toggle Filters Tray Button */}
          <Button
            variant={hasActiveFilters ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setIsFilterTrayOpen(!isFilterTrayOpen)}
            leftIcon={<Filter className="w-3.5 h-3.5" />}
            className="text-xs font-mono"
          >
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-brand text-brand-foreground font-bold">
                •
              </span>
            )}
          </Button>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 min-w-[170px]">
            <ArrowUpDown className="w-3.5 h-3.5 text-canvas-muted shrink-0" />
            <Select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as MemberSortOption)}
              options={[
                { value: 'name_asc', label: 'Name (A–Z)' },
                { value: 'name_desc', label: 'Name (Z–A)' },
                { value: 'member_id_asc', label: 'Member ID (Asc)' },
                { value: 'recent_activity', label: 'Recent Activity' },
                { value: 'active_loans_desc', label: 'Most Active Loans' },
                { value: 'outstanding_fine_desc', label: 'Highest Fines' },
              ]}
              className="h-8 text-xs py-0"
            />
          </div>
        </div>
      </div>

      {/* Expandable Filter Tray */}
      {isFilterTrayOpen && (
        <div className="p-3.5 rounded-xl border border-border-subtle bg-canvas-subtle/50 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-canvas-muted mb-1">
              Account Status
            </label>
            <Select
              value={filterState.status}
              onChange={(e) => onFilterChange({ status: e.target.value as MemberStatus | 'ALL' })}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active Privileges' },
                { value: 'SUSPENDED', label: 'Suspended Accounts' },
                { value: 'EXPIRED', label: 'Expired Memberships' },
                { value: 'PENDING', label: 'Pending Approval' },
              ]}
              className="h-8 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-canvas-muted mb-1">
              Patron Classification
            </label>
            <Select
              value={filterState.memberType}
              onChange={(e) => onFilterChange({ memberType: e.target.value as MemberType | 'ALL' })}
              options={[
                { value: 'ALL', label: 'All Patron Types' },
                { value: 'STUDENT', label: 'Student' },
                { value: 'FACULTY', label: 'Faculty' },
                { value: 'STAFF', label: 'Staff' },
                { value: 'EXTERNAL', label: 'External Affiliate' },
              ]}
              className="h-8 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-canvas-muted mb-1">
              Academic Department
            </label>
            <Select
              value={filterState.department}
              onChange={(e) => onFilterChange({ department: e.target.value })}
              options={[
                { value: 'ALL', label: 'All Departments' },
                ...departments.map((dept) => ({ value: dept, label: dept })),
              ]}
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      {/* Active Filter Chips & Result Count Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-subtle/40 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-canvas-muted font-mono text-[11px]">
            Showing <strong className="text-canvas-text font-bold">{totalResults}</strong> of{' '}
            {totalMembers} members
          </span>

          {filterState.search && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-brand/10 text-brand border border-brand/20">
              Query: &quot;{filterState.search}&quot;
              <button
                type="button"
                onClick={() => onFilterChange({ search: '' })}
                className="hover:opacity-75"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterState.status !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-canvas-subtle border border-border-subtle text-canvas-text">
              Status: {filterState.status}
              <button
                type="button"
                onClick={() => onFilterChange({ status: 'ALL' })}
                className="hover:opacity-75"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterState.memberType !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-canvas-subtle border border-border-subtle text-canvas-text">
              Type: {filterState.memberType}
              <button
                type="button"
                onClick={() => onFilterChange({ memberType: 'ALL' })}
                className="hover:opacity-75"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filterState.department !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-canvas-subtle border border-border-subtle text-canvas-text">
              Dept: {filterState.department}
              <button
                type="button"
                onClick={() => onFilterChange({ department: 'ALL' })}
                className="hover:opacity-75"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-[11px] font-mono font-semibold text-brand hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
};
