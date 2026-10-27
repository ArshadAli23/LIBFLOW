/**
 * LIBFLOW — Notifications State Management Context
 * 
 * CORE CONTRACT:
 * - Supports dual operational modes:
 *   1. 'demo': Local persistent state via safeStorage for offline portfolio evaluation
 *   2. 'live': Real Express + MySQL notification engine via notificationsApi client
 * - Governed by VITE_AUTH_MODE ('demo' | 'live')
 * - In live mode:
 *   - Fetches user notifications from GET /api/v1/notifications
 *   - Derives authoritative unread counts from server meta.unreadCount
 *   - Mark read: PATCH /api/v1/notifications/:id/read
 *   - Mark all read: PATCH /api/v1/notifications/read-all
 *   - Staff broadcast: POST /api/v1/notifications/broadcast
 *   - Staff due/overdue scan: POST /api/v1/notifications/scan-due-overdue
 *   - In-flight concurrency locking prevents duplicate mutations
 *   - Request sequence counters discard out-of-order search responses
 *   - Never silently falls back to mock notifications upon live API failure
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type { Notification } from './types.ts';
import { INITIAL_NOTIFICATIONS } from './mockNotificationsData.ts';
import type { UserRole } from '../../auth/types.ts';
import { useAuth } from '../../auth/AuthContext.tsx';
import { safeStorageGet, safeStorageSet, isArray } from '../../lib/storage.ts';
import {
  notificationsApi,
  mapApiNotificationToNotification,
  type NotificationListParams,
  type BroadcastPayload,
} from '../../lib/api/notifications.ts';
import { ApiClientError, type ApiScanDueOverdueResult } from '../../lib/api/types.ts';

const STORAGE_KEY = 'libflow_notifications_v1';

export interface NotificationsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationsContextType {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  pagination: NotificationsPagination;
  unreadCount: number;
  clearError: () => void;
  fetchNotifications: (params?: NotificationListParams) => Promise<void>;
  getNotificationsForUser: (userId?: string, role?: UserRole) => Notification[];
  getUnreadCount: (userId?: string, role?: UserRole) => number;
  markAsRead: (id: string) => Promise<void> | void;
  markAllAsRead: (userId?: string, role?: UserRole) => Promise<void> | void;
  deleteNotification: (id: string) => void;
  createNotification: (
    notif: Omit<Notification, 'id' | 'createdAt' | 'read'>
  ) => Notification;
  broadcastNotification: (payload: BroadcastPayload) => Promise<Notification>;
  scanDueSoonAndOverdue: () => Promise<ApiScanDueOverdueResult>;
  resetNotificationsToDefault: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, authMode, isAuthenticated } = useAuth();

  // In demo mode: read from localStorage or INITIAL_NOTIFICATIONS
  // In live mode: start empty and hydrate from backend API
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (authMode === 'live') {
      return [];
    }
    return safeStorageGet<Notification[]>(STORAGE_KEY, INITIAL_NOTIFICATIONS, isArray);
  });

  const [isLoading, setIsLoading] = useState<boolean>(authMode === 'live');
  const [error, setError] = useState<string | null>(null);
  const [liveUnreadCount, setLiveUnreadCount] = useState<number>(0);
  const [pagination, setPagination] = useState<NotificationsPagination>({
    total: authMode === 'live' ? 0 : INITIAL_NOTIFICATIONS.length,
    page: 1,
    limit: 20,
    totalPages: authMode === 'live' ? 1 : Math.ceil(INITIAL_NOTIFICATIONS.length / 20) || 1,
  });

  // Track sequence counter to prevent race conditions from overlapping async queries
  const requestSeqRef = useRef<number>(0);

  // In-flight operation lock to prevent duplicate concurrent submissions
  const inFlightOperationsRef = useRef<Set<string>>(new Set());

  // Sync state to localStorage ONLY in demo mode
  useEffect(() => {
    if (authMode === 'demo') {
      safeStorageSet(STORAGE_KEY, notifications);
    }
  }, [authMode, notifications]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Filter notifications appropriate for the active user identity and role (demo mode)
   */
  const filterDemoNotifications = useCallback(
    (notifs: Notification[], userId?: string, userRole?: UserRole): Notification[] => {
      const activeRole = userRole || role || 'MEMBER';
      const activeId = userId || user?.id || 'mem_081';

      return notifs.filter((n) => {
        // Direct recipient match
        if (n.recipientId === activeId) return true;

        // Broadcast to role
        if (n.recipientRole === activeRole) return true;
        if (n.recipientRole === 'ALL') return true;

        // Special recipient aliases
        if (activeRole === 'ADMIN' && n.recipientId === 'admin') return true;
        if (activeRole === 'LIBRARIAN' && n.recipientId === 'librarian') return true;

        return false;
      });
    },
    [role, user]
  );

  /**
   * Fetches notifications from backend API in live mode, with server-authoritative unread count.
   */
  const fetchNotifications = useCallback(
    async (params?: NotificationListParams): Promise<void> => {
      if (authMode !== 'live') {
        setIsLoading(false);
        return;
      }

      const seq = ++requestSeqRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const response = await notificationsApi.listNotifications(params);

        if (seq !== requestSeqRef.current) return;

        const mapped = (response.data || []).map(mapApiNotificationToNotification);

        setNotifications(mapped);

        // Authoritative unread count from server response meta
        const serverUnreadCount = (response as any).meta?.unreadCount;
        if (typeof serverUnreadCount === 'number') {
          setLiveUnreadCount(serverUnreadCount);
        } else {
          setLiveUnreadCount(mapped.filter((n) => !n.read).length);
        }

        const serverPagination = (response as any).meta?.pagination || (response as any).pagination;
        if (serverPagination) {
          setPagination({
            total: serverPagination.total,
            page: serverPagination.page,
            limit: serverPagination.limit,
            totalPages: serverPagination.totalPages,
          });
        }
      } catch (err: any) {
        if (seq !== requestSeqRef.current) return;

        let errorMsg = 'Failed to load notifications.';
        if (err instanceof ApiClientError) {
          errorMsg = err.message;
        } else if (err?.message) {
          errorMsg = err.message;
        }

        setError(errorMsg);
        // CRITICAL RULE: Never silently fall back to mock notifications on live failure
        setNotifications([]);
        setLiveUnreadCount(0);
      } finally {
        if (seq === requestSeqRef.current) {
          setIsLoading(false);
        }
      }
    },
    [authMode]
  );

  // Automatic initial fetch when authenticated in live mode
  useEffect(() => {
    if (authMode === 'live' && isAuthenticated) {
      fetchNotifications().catch(() => {});
    }
  }, [authMode, isAuthenticated, fetchNotifications]);

  /**
   * Get notifications for user: In live mode, server already filtered to authenticated recipient.
   * In demo mode, uses role-scoped filtering.
   */
  const getNotificationsForUser = useCallback(
    (userId?: string, targetRole?: UserRole): Notification[] => {
      if (authMode === 'live') {
        return notifications;
      }
      return filterDemoNotifications(notifications, userId, targetRole);
    },
    [authMode, notifications, filterDemoNotifications]
  );

  /**
   * Count unread notifications for active user
   */
  const getUnreadCount = useCallback(
    (userId?: string, targetRole?: UserRole): number => {
      if (authMode === 'live') {
        return liveUnreadCount;
      }
      const userNotifs = filterDemoNotifications(notifications, userId, targetRole);
      return userNotifs.filter((n) => !n.read).length;
    },
    [authMode, liveUnreadCount, notifications, filterDemoNotifications]
  );

  // Authoritative unread count selector
  const unreadCount = useMemo(() => {
    if (authMode === 'live') {
      return liveUnreadCount;
    }
    const filtered = filterDemoNotifications(notifications, user?.id, role || 'MEMBER');
    return filtered.filter((n) => !n.read).length;
  }, [authMode, liveUnreadCount, notifications, user, role, filterDemoNotifications]);

  /**
   * Mark individual notification as read
   */
  const markAsRead = useCallback(
    async (id: string): Promise<void> => {
      const opKey = `read:${id}`;
      if (inFlightOperationsRef.current.has(opKey)) return;
      inFlightOperationsRef.current.add(opKey);

      try {
        if (authMode === 'live') {
          await notificationsApi.markAsRead(id);

          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n))
          );
          setLiveUnreadCount((prev) => Math.max(0, prev - 1));
          return;
        }

        // Demo Mode
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n))
        );
      } catch (err: any) {
        console.warn(`[NotificationService] Failed to mark notification "${id}" as read:`, err?.message);
        throw err;
      } finally {
        inFlightOperationsRef.current.delete(opKey);
      }
    },
    [authMode]
  );

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(
    async (userId?: string, targetRole?: UserRole): Promise<void> => {
      const opKey = 'read:all';
      if (inFlightOperationsRef.current.has(opKey)) return;
      inFlightOperationsRef.current.add(opKey);

      try {
        if (authMode === 'live') {
          await notificationsApi.markAllAsRead();

          setNotifications((prev) =>
            prev.map((n) => ({ ...n, read: true, isRead: true }))
          );
          setLiveUnreadCount(0);
          return;
        }

        // Demo Mode
        const userNotifIds = new Set(
          filterDemoNotifications(notifications, userId, targetRole).map((n) => n.id)
        );

        setNotifications((prev) =>
          prev.map((n) => (userNotifIds.has(n.id) ? { ...n, read: true, isRead: true } : n))
        );
      } catch (err: any) {
        console.warn('[NotificationService] Failed to mark all notifications as read:', err?.message);
        throw err;
      } finally {
        inFlightOperationsRef.current.delete(opKey);
      }
    },
    [authMode, notifications, filterDemoNotifications]
  );

  /**
   * Remove notification locally
   */
  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  /**
   * Programmatically dispatch a new notification (Demo mode simulation helper)
   */
  const createNotification = useCallback(
    (notif: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification => {
      const newNotif: Notification = {
        ...notif,
        id: `notif_${Date.now()}`,
        read: false,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      setNotifications((prev) => [newNotif, ...prev]);
      return newNotif;
    },
    []
  );

  /**
   * Broadcast notification to user roles (ADMIN, LIBRARIAN staff action)
   */
  const broadcastNotification = useCallback(
    async (payload: BroadcastPayload): Promise<Notification> => {
      if (authMode === 'live') {
        const response = await notificationsApi.broadcast(payload);
        const mapped = mapApiNotificationToNotification(response.data);

        setNotifications((prev) => [mapped, ...prev]);
        return mapped;
      }

      // Demo Mode fallback
      return createNotification({
        recipientId: 'BROADCAST',
        recipientRole: payload.recipientRole || 'ALL',
        type: 'SYSTEM_BROADCAST',
        priority: payload.priority || 'HIGH',
        title: payload.title,
        message: payload.message,
        actionLabel: payload.actionLabel,
        actionRoute: payload.actionRoute,
      });
    },
    [authMode, createNotification]
  );

  /**
   * Scan due-soon and overdue loans sweep (Staff action)
   */
  const scanDueSoonAndOverdue = useCallback(async (): Promise<ApiScanDueOverdueResult> => {
    if (authMode === 'live') {
      const response = await notificationsApi.scanDueSoonAndOverdue();
      await fetchNotifications().catch(() => {});
      return response.data;
    }

    return {
      dueSoonAlertsSent: 0,
      overdueAlertsSent: 0,
      loansFlaggedOverdue: 0,
    };
  }, [authMode, fetchNotifications]);

  const resetNotificationsToDefault = useCallback(() => {
    setNotifications(INITIAL_NOTIFICATIONS);
    safeStorageSet(STORAGE_KEY, INITIAL_NOTIFICATIONS);
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        isLoading,
        error,
        pagination,
        unreadCount,
        clearError,
        fetchNotifications,
        getNotificationsForUser,
        getUnreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        createNotification,
        broadcastNotification,
        scanDueSoonAndOverdue,
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
