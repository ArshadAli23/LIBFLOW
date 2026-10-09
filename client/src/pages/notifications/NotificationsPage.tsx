import React, { useState, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNotifications } from '../../features/notifications/NotificationsContext';
import type { NotificationFilterState } from '../../features/notifications/types';
import { NotificationList } from '../../features/notifications/components/NotificationList';
import { NotificationFilters } from '../../features/notifications/components/NotificationFilters';
import { Bell } from 'lucide-react';

import { useActiveMember } from '../../features/members/useActiveMember';

export interface NotificationsPageProps {
  onNavigate: (path: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const { user, role } = useAuth();
  const { domainId, memberId } = useActiveMember();
  const {
    getNotificationsForUser,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  // Resolve isolated user identity for notifications without fallback leakage
  const userId = role === 'MEMBER'
    ? (domainId || memberId || user?.id || '')
    : (user?.id || '');
  const effectiveRole = role || 'MEMBER';

  const userNotifications = getNotificationsForUser(userId, effectiveRole);
  const unreadCount = getUnreadCount(userId, effectiveRole);

  const [filterState, setFilterState] = useState<NotificationFilterState>({
    status: 'ALL',
    type: 'ALL',
  });

  const filteredNotifications = useMemo(() => {
    return userNotifications.filter((n) => {
      if (filterState.status === 'UNREAD' && n.read) return false;
      if (filterState.status === 'READ' && !n.read) return false;
      if (filterState.type !== 'ALL' && n.type !== filterState.type) return false;
      return true;
    });
  }, [userNotifications, filterState]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-brand font-semibold flex items-center gap-1">
              <Bell className="w-3.5 h-3.5" />
              Communication Dispatch
            </span>
            <span className="text-canvas-muted text-xs">•</span>
            <span className="text-[11px] font-mono text-canvas-muted">Campus & Circulation Feed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-canvas-text">
            Notifications & Alerts
          </h1>
          <p className="text-xs sm:text-sm text-canvas-muted mt-1 max-w-2xl">
            {effectiveRole === 'MEMBER'
              ? 'Real-time updates regarding your loan due dates, staged reservation pickups, and fee receipts.'
              : effectiveRole === 'LIBRARIAN'
              ? 'Front-desk circulation alerts, overdue notifications, and student reservation staging events.'
              : 'System-wide governance bulletins, inventory anomalies, and administrative audits.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
          {unreadCount > 0 ? (
            <span className="px-3 py-1.5 rounded-lg bg-brand/10 border border-brand/20 text-brand font-bold">
              {unreadCount} Unread Alert{unreadCount === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-lg bg-canvas-subtle border border-border-subtle text-canvas-muted">
              All Caught Up
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <NotificationFilters
        filterState={filterState}
        onFilterChange={(updates) => setFilterState((prev) => ({ ...prev, ...updates }))}
        unreadCount={unreadCount}
        totalCount={userNotifications.length}
        onMarkAllAsRead={() => markAllAsRead(userId, effectiveRole)}
      />

      {/* Notifications Feed */}
      <NotificationList
        notifications={filteredNotifications}
        onMarkAsRead={markAsRead}
        onNavigate={onNavigate}
        onDelete={deleteNotification}
        filterType={filterState.status !== 'ALL' ? filterState.status : undefined}
      />
    </div>
  );
};
