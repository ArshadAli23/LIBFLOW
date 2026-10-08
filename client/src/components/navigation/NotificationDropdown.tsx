/**
 * LIBFLOW — Notification Center Dropdown
 * 
 * Connected to centralized NotificationsContext & AuthContext:
 * - Real-time unread badge counter
 * - Quick mark as read
 * - Direct deep-link navigation
 * - Responsive popup panel
 */

import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle2, CheckCheck, ArrowRight } from 'lucide-react';
import { useNotifications } from '../../features/notifications/NotificationsContext';
import { useAuth } from '../../auth/AuthContext';
import { NotificationBadge } from '../../features/notifications/components/NotificationBadge';

export interface NotificationDropdownProps {
  onNavigateToNotifications?: () => void;
  onNavigate?: (route: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  onNavigateToNotifications,
  onNavigate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, role } = useAuth();
  const {
    getNotificationsForUser,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const userId = user?.id === 'usr_member_01' ? 'mem_081' : user?.id || 'mem_081';
  const effectiveRole = role || 'MEMBER';

  const userNotifications = getNotificationsForUser(userId, effectiveRole);
  const unreadCount = getUnreadCount(userId, effectiveRole);
  const recentNotifications = userNotifications.slice(0, 5);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (id: string, actionRoute?: string) => {
    markAsRead(id);
    setIsOpen(false);
    if (actionRoute && onNavigate) {
      onNavigate(actionRoute);
    } else if (onNavigateToNotifications) {
      onNavigateToNotifications();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications, ${unreadCount} unread`}
        className="relative p-2 rounded-lg text-canvas-muted hover:text-canvas-text hover:bg-canvas-subtle transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 ring-2 ring-surface" />
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-surface border border-border-strong shadow-modal z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-canvas-subtle/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-canvas-text">Notifications & Alerts</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead(userId, effectiveRole)}
                className="flex items-center gap-1 text-[11px] font-mono text-canvas-muted hover:text-brand transition-colors"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border-subtle/40">
            {recentNotifications.length === 0 ? (
              <div className="py-8 text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold text-canvas-text">All caught up</p>
                <p className="text-[11px] text-canvas-muted">Zero pending notices at this time.</p>
              </div>
            ) : (
              recentNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item.id, item.actionRoute)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-canvas-subtle/60 transition-colors cursor-pointer select-none ${
                    !item.read ? 'bg-brand/5 dark:bg-brand/10' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <NotificationBadge type={item.type} size="sm" />
                      <span className="text-[10px] font-mono text-canvas-muted">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h5
                      className={`text-xs truncate ${
                        !item.read ? 'font-bold text-canvas-text font-serif' : 'font-medium text-canvas-muted'
                      }`}
                    >
                      {item.title}
                    </h5>

                    <p className="text-[11px] text-canvas-muted leading-relaxed line-clamp-2">
                      {item.message}
                    </p>

                    {item.actionLabel && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-brand pt-0.5">
                        <span>{item.actionLabel}</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {!item.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border-subtle bg-canvas-subtle/30 flex items-center justify-between text-[11px]">
            <span className="font-mono text-canvas-muted text-[10px]">
              {userNotifications.length} total alert{userNotifications.length === 1 ? '' : 's'}
            </span>
            {onNavigateToNotifications && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onNavigateToNotifications();
                }}
                className="font-semibold text-brand hover:underline flex items-center gap-1"
              >
                <span>View all notifications</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
