import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, IconButton } from '../ui/Button';
import { Skeleton } from '../feedback/FeedbackStates';

// ==========================================
// Table Types
// ==========================================
export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  selectedIds?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSort?: (columnKey: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  selectedIds,
  onSelectRow,
  onSelectAll,
  sortColumn,
  sortDirection,
  onSort,
  isLoading = false,
  emptyMessage = 'No records found in this view.',
  className,
}: TableProps<T>) {
  const allSelected =
    data.length > 0 && selectedIds && data.every((item) => selectedIds.includes(keyExtractor(item)));

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-card',
        className
      )}
    >
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-canvas-subtle/70 text-canvas-muted uppercase tracking-wider font-mono text-[11px] select-none">
              {onSelectRow && onSelectAll && (
                <th className="w-10 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onSelectAll}
                    aria-label="Select all rows"
                    className="w-3.5 h-3.5 rounded border-border-strong text-brand focus:ring-border-focus"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn('px-4 py-3 font-semibold', col.className)}
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className="group inline-flex items-center gap-1.5 text-canvas-muted hover:text-canvas-text transition-colors"
                    >
                      <span>{col.header}</span>
                      {sortColumn === col.key ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-brand" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-brand" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle/70">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {onSelectRow && (
                    <td className="px-3 py-3 text-center">
                      <Skeleton className="w-3.5 h-3.5 rounded mx-auto" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-3/4 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onSelectRow ? 1 : 0)}
                  className="px-4 py-12 text-center text-canvas-muted font-sans"
                >
                  <p>{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const id = keyExtractor(item);
                const isSelected = selectedIds?.includes(id);

                return (
                  <tr
                    key={id}
                    className={cn(
                      'transition-colors duration-150 hover:bg-canvas-subtle/50 text-canvas-text group',
                      isSelected && 'bg-brand-accent-subtle/40 dark:bg-brand-accent-subtle/20'
                    )}
                  >
                    {onSelectRow && (
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow(id)}
                          aria-label={`Select row ${id}`}
                          className="w-3.5 h-3.5 rounded border-border-strong text-brand focus:ring-border-focus"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn('px-4 py-3 align-middle', col.className)}
                      >
                        {col.render ? col.render(item) : item[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// Pagination Component
// ==========================================
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  onPageChange,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-canvas-muted select-none',
        className
      )}
    >
      <div>
        {totalRecords !== undefined ? (
          <span>
            Total <strong className="font-mono text-canvas-text">{totalRecords}</strong> records
          </span>
        ) : (
          <span>
            Page <strong className="font-mono text-canvas-text">{currentPage}</strong> of{' '}
            <strong className="font-mono text-canvas-text">{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <IconButton
          variant="secondary"
          size="sm"
          icon={<ChevronLeft className="w-4 h-4" />}
          aria-label="Previous page"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        />
        <span className="px-2 font-mono text-xs text-canvas-text">
          {currentPage} / {totalPages || 1}
        </span>
        <IconButton
          variant="secondary"
          size="sm"
          icon={<ChevronRight className="w-4 h-4" />}
          aria-label="Next page"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        />
      </div>
    </div>
  );
};

// ==========================================
// Filter and Sort Micro-Components
// ==========================================
export const FilterChip: React.FC<{
  label: string;
  active?: boolean;
  onClick: () => void;
  count?: number;
}> = ({ label, active, onClick, count }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium font-sans border transition-all duration-150',
        active
          ? 'bg-brand text-brand-foreground border-transparent shadow-ambient'
          : 'bg-surface text-canvas-muted border-border-subtle hover:border-border-strong hover:text-canvas-text'
      )}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            'px-1 py-0.2 rounded-full text-[10px] font-mono',
            active ? 'bg-white/20' : 'bg-canvas-subtle text-canvas-text'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
};

export const FilterButton: React.FC<{
  activeCount?: number;
  onClick: () => void;
}> = ({ activeCount, onClick }) => {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onClick}
      leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
      nestedBadge={activeCount ? activeCount : undefined}
    >
      Filters
    </Button>
  );
};
