/**
 * LIBFLOW — Books Search, Filter & View Controls
 * 
 * Supports search by title, author, ISBN, publisher, category, and barcode.
 * Removable filter chips, sort selector, and view mode switcher.
 */

import React from 'react';
import {
  X,
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid,
  List,
  RotateCcw,
} from 'lucide-react';
import { SearchInput } from '../../../components/forms/FormControls';
import { Button } from '../../../components/ui/Button';
import type { BookFilterState, BookSortOption, BookViewMode } from '../types';

export interface BookFiltersProps {
  filters: BookFilterState;
  onFilterChange: (updates: Partial<BookFilterState>) => void;
  onResetFilters: () => void;
  sortOption: BookSortOption;
  onSortChange: (sort: BookSortOption) => void;
  viewMode: BookViewMode;
  onViewModeChange: (mode: BookViewMode) => void;
  totalResults: number;
  totalBooksCount: number;
  availableCategories: string[];
  availablePublishers: string[];
}

export const BookFilters: React.FC<BookFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  sortOption,
  onSortChange,
  viewMode,
  onViewModeChange,
  totalResults,
  totalBooksCount,
  availableCategories,
  availablePublishers,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);

  // Active filter chip check
  const activeChips: { key: keyof BookFilterState; label: string; value: string }[] = [];

  if (filters.availability !== 'ALL') {
    activeChips.push({
      key: 'availability',
      label: 'Availability',
      value: filters.availability === 'AVAILABLE' ? 'Available Only' : 'Loaned Out',
    });
  }
  if (filters.category) {
    activeChips.push({ key: 'category', label: 'Category', value: filters.category });
  }
  if (filters.publisher) {
    activeChips.push({ key: 'publisher', label: 'Publisher', value: filters.publisher });
  }
  if (filters.format) {
    activeChips.push({ key: 'format', label: 'Format', value: filters.format });
  }
  if (filters.publicationYear) {
    activeChips.push({
      key: 'publicationYear',
      label: 'Year',
      value: String(filters.publicationYear),
    });
  }

  const removeChip = (key: keyof BookFilterState) => {
    if (key === 'availability') {
      onFilterChange({ availability: 'ALL' });
    } else if (key === 'publicationYear') {
      onFilterChange({ publicationYear: undefined });
    } else {
      onFilterChange({ [key]: '' });
    }
  };

  return (
    <div className="space-y-3">
      {/* Search Input Bar + Primary Action Buttons */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Field */}
        <div className="flex-1">
          <SearchInput
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            onClear={() => onFilterChange({ searchQuery: '' })}
            placeholder="Search by title, author, ISBN, publisher, category, or barcode..."
            className="w-full"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value as BookSortOption)}
            aria-label="Sort books by"
            className="h-9 sm:h-10 px-3 text-xs bg-surface border border-border-subtle rounded-md text-canvas-text focus:outline-hidden focus:border-border-focus font-mono"
          >
            <option value="recently_added">Sort: Recently Added</option>
            <option value="title_asc">Sort: Title (A–Z)</option>
            <option value="title_desc">Sort: Title (Z–A)</option>
            <option value="most_borrowed">Sort: Most Borrowed</option>
            <option value="most_available">Sort: Most Available</option>
            <option value="publication_year_desc">Sort: Year (Newest)</option>
            <option value="publication_year_asc">Sort: Year (Oldest)</option>
          </select>

          {/* Toggle Advanced Filters Button */}
          <Button
            variant={showAdvancedFilters ? 'primary' : 'secondary'}
            size="sm"
            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-xs h-9 sm:h-10"
          >
            Filters
            {activeChips.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-brand-foreground/20">
                {activeChips.length}
              </span>
            )}
          </Button>

          {/* View Mode Switcher */}
          <div className="flex items-center border border-border-subtle rounded-md bg-canvas-subtle p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              aria-label="Table view"
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'table'
                  ? 'bg-surface text-canvas-text shadow-xs'
                  : 'text-canvas-muted hover:text-canvas-text'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('compact')}
              aria-label="Compact list view"
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'compact'
                  ? 'bg-surface text-canvas-text shadow-xs'
                  : 'text-canvas-muted hover:text-canvas-text'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              aria-label="Grid view"
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-surface text-canvas-text shadow-xs'
                  : 'text-canvas-muted hover:text-canvas-text'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filter Tray */}
      {showAdvancedFilters && (
        <div className="p-4 rounded-xl border border-border-subtle bg-surface shadow-ambient grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-150 text-xs">
          {/* Availability */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-canvas-muted mb-1">
              Availability
            </label>
            <select
              value={filters.availability}
              onChange={(e) => onFilterChange({ availability: e.target.value as any })}
              className="w-full h-8 px-2 text-xs bg-canvas-subtle border border-border-subtle rounded text-canvas-text focus:outline-hidden"
            >
              <option value="ALL">All Items</option>
              <option value="AVAILABLE">Available Now</option>
              <option value="BORROWED">Currently Loaned</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-canvas-muted mb-1">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => onFilterChange({ category: e.target.value })}
              className="w-full h-8 px-2 text-xs bg-canvas-subtle border border-border-subtle rounded text-canvas-text focus:outline-hidden"
            >
              <option value="">All Categories</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Publisher */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-canvas-muted mb-1">
              Publisher
            </label>
            <select
              value={filters.publisher}
              onChange={(e) => onFilterChange({ publisher: e.target.value })}
              className="w-full h-8 px-2 text-xs bg-canvas-subtle border border-border-subtle rounded text-canvas-text focus:outline-hidden"
            >
              <option value="">All Publishers</option>
              {availablePublishers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Format */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-canvas-muted mb-1">
              Format
            </label>
            <select
              value={filters.format}
              onChange={(e) => onFilterChange({ format: e.target.value })}
              className="w-full h-8 px-2 text-xs bg-canvas-subtle border border-border-subtle rounded text-canvas-text focus:outline-hidden"
            >
              <option value="">All Formats</option>
              <option value="HARDCOVER">Hardcover</option>
              <option value="PAPERBACK">Paperback</option>
              <option value="DIGITAL">Digital eBook</option>
              <option value="PERIODICAL">Periodical</option>
            </select>
          </div>
        </div>
      )}

      {/* Active Filter Chips & Results Count Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono text-canvas-muted mr-1">
            Showing <strong className="text-canvas-text font-bold">{totalResults}</strong> of {totalBooksCount} books
          </span>

          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-canvas-subtle border border-border-subtle text-canvas-text"
            >
              <span className="text-canvas-muted">{chip.label}:</span>
              <span className="font-semibold">{chip.value}</span>
              <button
                type="button"
                onClick={() => removeChip(chip.key)}
                aria-label={`Remove filter ${chip.label}`}
                className="hover:text-rose-500 rounded p-0.5 ml-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {(activeChips.length > 0 || filters.searchQuery) && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-brand hover:underline ml-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
