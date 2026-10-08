/**
 * LIBFLOW — Notifications State Management Context
 * 
 * Provides:
 * - Persistent notification alerts in localStorage ('libflow_notifications_v1')
 * - Role-scoped filtering (ADMIN, LIBRARIAN, MEMBER)
 * - Read/unread status transitions
 * - Dynamic notification creation from circulation & fine events
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Notification } from './types';
import { INITIAL_NOTIFICATIONS } from './mockNotificationsData';
import type { UserRole } from '../../auth/types';

const STORAGE_KEY = 'libflow_notifications_v1';

export interface NotificationsContextType {
  notifications: Notification[];
  getNotificationsForUser: (userId: string, role: UserRole) => Notification[];
  getUnreadCount: (userId: string, role: UserRole) => number;
  markAsRead: (id: string) => void;
  markAllAsRead: (userId: string, role: UserRole) => void;
  deleteNotification: (id: string) => void;
  createNotification: (
    notif: Omit<Notification, 'id' | 'createdAt' | 'read'>
  ) => Notification;
  resetNotificationsToDefault: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (err) {
      console.error('Failed to sync notifications to localStorage', err);
    }
  }, [notifications]);

  /**
   * Filter notifications appropriate for the active user identity and role
   */
  const getNotificationsForUser = (userId: string, role: UserRole): Notification[] => {
    return notifications.filter((n) => {
      // Direct recipient match
      if (n.recipientId === userId) return true;

      // Broadcast to role
      if (n.recipientRole === role) return true;
      if (n.recipientRole === 'ALL') return true;

      // Special recipient aliases
      if (role === 'ADMIN' && n.recipientId === 'admin') return true;
      if (role === 'LIBRARIAN' && n.recipientId === 'librarian') return true;

      return false;
    });
  };

  /**
   * Count unread notifications for active user & role
   */
  const getUnreadCount = (userId: string, role: UserRole): number => {
    const userNotifs = getNotificationsForUser(userId, role);
    return userNotifs.filter((n) => !n.read).length;
  };

  /**
   * Mark individual notification as read
   */
  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  /**
   * Mark all notifications for active user as read
   */
  const markAllAsRead = (userId: string, role: UserRole) => {
    const userNotifIds = new Set(
      getNotificationsForUser(userId, role).map((n) => n.id)
    );

    setNotifications((prev) =>
      prev.map((n) => (userNotifIds.has(n.id) ? { ...n, read: true } : n))
    );
  };

  /**
   * Remove notification from ledger
   */
  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  /**
   * Programmatically dispatch a new notification
   */
  const createNotification = (
    notif: Omit<Notification, 'id' | 'createdAt' | 'read'>
  ): Notification => {
    const newNotif: Notification = {
      ...notif,
      id: `notif_${Date.now()}`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setNotifications((prev) => [newNotif, ...prev]);
    return newNotif;
  };

  const resetNotificationsToDefault = () => {
    setNotifications(INITIAL_NOTIFICATIONS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
    } catch {
      // Ignored
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        getNotificationsForUser,
        getUnreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        createNotification,
        resetNotificationsToDefault,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = (): NotificationsContextType => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
