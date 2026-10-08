import React from 'react';
import type { Notification } from '../types';
import { NotificationBadge } from './NotificationBadge';
import { BookCover } from '../../books/components/BookCover';
import { Check, ArrowRight, Trash2 } from 'lucide-react';

export interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onNavigate?: (route: string) => void;
  onDelete?: (id: string) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onNavigate,
  onDelete,
}) => {
  const handleItemClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    if (notification.actionRoute && onNavigate) {
      onNavigate(notification.actionRoute);
    }
  };

  return (
    <div
      onClick={handleItemClick}
      className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
        !notification.read
          ? 'bg-surface border-brand/40 shadow-sm ring-1 ring-brand/20'
          : 'bg-surface/60 border-border-subtle hover:bg-surface hover:border-border-strong'
      }`}
    >
      {/* Unread Accent Edge Indicator */}
      {!notification.read && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand" />
      )}

      <div className="flex items-start gap-3.5 sm:gap-4">
        {/* Optional BookCover Thumbnail */}
        {notification.bookTitle && (
          <div className="shrink-0 hidden xs:block">
            <BookCover
              title={notification.bookTitle}
              author="Library Collection"
              coverUrl={notification.bookCoverUrl}
              size="sm"
              className="w-9 h-13 rounded shadow-xs"
            />
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <NotificationBadge type={notification.type} priority={notification.priority} size="sm" />
              {!notification.read && (
                <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
              )}
            </div>

            <span className="text-[11px] font-mono text-canvas-muted">
              {new Date(notification.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <h4
            className={`text-sm leading-snug truncate ${
              !notification.read ? 'font-bold text-canvas-text font-serif' : 'font-medium text-canvas-text'
            }`}
          >
            {notification.title}
          </h4>

          <p className="text-xs text-canvas-muted leading-relaxed">
            {notification.message}
          </p>

          {/* Action Link & Controls Bar */}
          <div className="flex items-center justify-between pt-2">
            {notification.actionRoute && notification.actionLabel ? (
              <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-brand group-hover:underline">
                <span>{notification.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-1">
              {!notification.read && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  className="p-1 rounded-md text-canvas-muted hover:text-brand hover:bg-canvas-subtle transition-colors text-[10px] font-mono flex items-center gap-1"
                  title="Mark as read"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark read</span>
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                  className="p-1 rounded-md text-canvas-muted hover:text-rose-600 hover:bg-canvas-subtle transition-colors"
                  title="Dismiss notification"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
