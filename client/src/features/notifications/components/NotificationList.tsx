import React from 'react';
import type { Notification } from '../types';
import { NotificationItem } from './NotificationItem';
import { NotificationEmptyState } from './NotificationEmptyState';

export interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onNavigate?: (route: string) => void;
  onDelete?: (id: string) => void;
  filterType?: string;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onMarkAsRead,
  onNavigate,
  onDelete,
  filterType,
}) => {
  if (notifications.length === 0) {
    return <NotificationEmptyState filterType={filterType} />;
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkAsRead={onMarkAsRead}
          onNavigate={onNavigate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
