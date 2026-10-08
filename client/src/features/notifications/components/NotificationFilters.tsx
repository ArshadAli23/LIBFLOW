import React from 'react';
import type { NotificationFilterState } from '../types';
import { Button } from '../../../components/ui/Button';
import { CheckCheck } from 'lucide-react';

export interface NotificationFiltersProps {
  filterState: NotificationFilterState;
  onFilterChange: (updates: Partial<NotificationFilterState>) => void;
  unreadCount: number;
  totalCount: number;
  onMarkAllAsRead: () => void;
}

export const NotificationFilters: React.FC<NotificationFiltersProps> = ({
  filterState,
  onFilterChange,
  unreadCount,
  totalCount,
  onMarkAllAsRead,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
      {/* Read / Unread Status Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-canvas-subtle border border-border-subtle text-xs font-mono overflow-x-auto shadow-xs">
        <button
          type="button"
          onClick={() => onFilterChange({ status: 'ALL' })}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
            filterState.status === 'ALL'
              ? 'bg-surface text-canvas-text shadow-sm font-semibold'
              : 'text-canvas-muted hover:text-canvas-text'
          }`}
        >
          All ({totalCount})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange({ status: 'UNREAD' })}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
            filterState.status === 'UNREAD'
              ? 'bg-surface text-canvas-text shadow-sm font-semibold'
              : 'text-canvas-muted hover:text-canvas-text'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
          )}
          <span>({unreadCount})</span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange({ status: 'READ' })}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
            filterState.status === 'READ'
              ? 'bg-surface text-canvas-text shadow-sm font-semibold'
              : 'text-canvas-muted hover:text-canvas-text'
          }`}
        >
          Read ({Math.max(0, totalCount - unreadCount)})
        </button>
      </div>

      {/* Bulk Action: Mark All Read */}
      <div className="flex items-center gap-2 self-start sm:self-auto">
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
            className="text-xs h-9 font-mono"
          >
            Mark all read
          </Button>
        )}
      </div>
    </div>
  );
};
