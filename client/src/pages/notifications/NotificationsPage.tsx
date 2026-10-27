import React, { useState, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNotifications } from '../../features/notifications/NotificationsContext';
import type { NotificationFilterState } from '../../features/notifications/types';
import { NotificationList } from '../../features/notifications/components/NotificationList';
import { NotificationFilters } from '../../features/notifications/components/NotificationFilters';
import { BroadcastModal } from '../../features/notifications/components/BroadcastModal';
import { Button } from '../../components/ui/Button';
import { Bell, Send, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useActiveMember } from '../../features/members/useActiveMember';
import type { ApiScanDueOverdueResult } from '../../lib/api/types';

export interface NotificationsPageProps {
  onNavigate: (path: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const { user, role, authMode } = useAuth();
  const { domainId, memberId } = useActiveMember();
  const {
    getNotificationsForUser,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isLoading,
    error,
    clearError,
    fetchNotifications,
    broadcastNotification,
    scanDueSoonAndOverdue,
  } = useNotifications();

  // Resolve isolated user identity for notifications without fallback leakage
  const userId = role === 'MEMBER'
    ? (domainId || memberId || user?.id || '')
    : (user?.id || '');
  const effectiveRole = role || 'MEMBER';
  const isStaff = role === 'ADMIN' || role === 'LIBRARIAN';

  const userNotifications = getNotificationsForUser(userId, effectiveRole);
  const unreadCount = getUnreadCount(userId, effectiveRole);

  const [filterState, setFilterState] = useState<NotificationFilterState>({
    status: 'ALL',
    type: 'ALL',
  });

  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ApiScanDueOverdueResult | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const filteredNotifications = useMemo(() => {
    return userNotifications.filter((n) => {
      if (filterState.status === 'UNREAD' && n.read) return false;
      if (filterState.status === 'READ' && !n.read) return false;
      if (filterState.type !== 'ALL' && n.type !== filterState.type) return false;
      return true;
    });
  }, [userNotifications, filterState]);

  const handleRunScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    clearError();
    setScanResult(null);
    setActionSuccessMessage(null);

    try {
      const result = await scanDueSoonAndOverdue();
      setScanResult(result);
    } catch (err: any) {
      // Error handled via NotificationsContext error state or caught here
    } finally {
      setIsScanning(false);
    }
  };

  const handleBroadcastSubmit = async (payload: any) => {
    await broadcastNotification(payload);
    setActionSuccessMessage(`Broadcast bulletin "${payload.title}" dispatched successfully.`);
  };

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

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto font-mono text-xs">
          {unreadCount > 0 ? (
            <span className="px-3 py-1.5 rounded-lg bg-brand/10 border border-brand/20 text-brand font-bold">
              {unreadCount} Unread Alert{unreadCount === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-lg bg-canvas-subtle border border-border-subtle text-canvas-muted">
              All Caught Up
            </span>
          )}

          {authMode === 'live' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNotifications()}
              disabled={isLoading}
              title="Refresh notifications"
              className="p-1.5 h-8 w-8"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand' : ''}`} />
            </Button>
          )}

          {/* Staff-Only Administrative Actions */}
          {isStaff && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunScan}
                isLoading={isScanning}
                leftIcon={<Clock className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Scan Due/Overdue
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsBroadcastModalOpen(true)}
                leftIcon={<Send className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Broadcast
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Action Success Banner */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between font-mono animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 hover:underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Scan Results Banner */}
      {scanResult && (
        <div className="p-3.5 rounded-xl border border-brand/30 bg-brand/5 text-canvas-text text-xs flex items-center justify-between font-mono animate-in fade-in">
          <div className="space-y-0.5">
            <div className="font-semibold flex items-center gap-2 text-brand">
              <Clock className="w-3.5 h-3.5" />
              Circulation Scan Sweep Completed
            </div>
            <div className="text-[11px] text-canvas-muted flex items-center gap-3">
              <span>Due-Soon Alerts: <strong className="text-canvas-text">{scanResult.dueSoonAlertsSent}</strong></span>
              <span>•</span>
              <span>Overdue Alerts: <strong className="text-canvas-text">{scanResult.overdueAlertsSent}</strong></span>
              <span>•</span>
              <span>Loans Flagged Overdue: <strong className="text-canvas-text">{scanResult.loansFlaggedOverdue}</strong></span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setScanResult(null)}
            className="text-canvas-muted hover:text-canvas-text text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Actionable Error Banner */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNotifications()}
              className="text-xs h-7 px-2.5 border-red-500/30 hover:bg-red-500/20"
            >
              Retry
            </Button>
            <button
              type="button"
              onClick={clearError}
              className="text-[11px] text-red-600 dark:text-red-400 hover:underline px-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <NotificationFilters
        filterState={filterState}
        onFilterChange={(updates) => setFilterState((prev) => ({ ...prev, ...updates }))}
        unreadCount={unreadCount}
        totalCount={userNotifications.length}
        onMarkAllAsRead={() => markAllAsRead(userId, effectiveRole)}
      />

      {/* Loading Skeleton / Feed */}
      {isLoading && userNotifications.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-brand mx-auto" />
          <p className="text-xs font-mono text-canvas-muted">Loading dispatch feed from library network...</p>
        </div>
      ) : (
        <NotificationList
          notifications={filteredNotifications}
          onMarkAsRead={markAsRead}
          onNavigate={onNavigate}
          onDelete={deleteNotification}
          filterType={filterState.status !== 'ALL' ? filterState.status : undefined}
        />
      )}

      {/* Staff Broadcast Modal */}
      {isStaff && (
        <BroadcastModal
          isOpen={isBroadcastModalOpen}
          onClose={() => setIsBroadcastModalOpen(false)}
          onSendBroadcast={handleBroadcastSubmit}
        />
      )}
    </div>
  );
};
