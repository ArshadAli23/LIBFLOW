/**
 * LIBFLOW — Notifications & Communication Dispatch API Service
 * 
 * Interacts with /api/v1/notifications endpoints.
 * Provides typed mapping between backend notification entities and frontend domain models.
 * 
 * BACKEND ROUTE CONTRACT:
 * - GET   /api/v1/notifications                 (Authenticated patron/staff feed)
 * - GET   /api/v1/notifications/:id             (Single notification details with ownership guard)
 * - PATCH /api/v1/notifications/:id/read        (Mark single notification as read)
 * - PATCH /api/v1/notifications/read-all        (Mark all recipient notifications as read)
 * - POST  /api/v1/notifications/broadcast       (Staff broadcast to user roles)
 * - POST  /api/v1/notifications/scan-due-overdue (Staff due/overdue loan scan sweep)
 */

import { apiClient } from './client.ts';
import type {
  ApiResponse,
  ApiNotification,
  ApiMarkAllReadResult,
  ApiScanDueOverdueResult,
  NotificationType,
  NotificationPriority,
} from './types.ts';
import type {
  Notification,
  NotificationRecipientRole,
} from '../../features/notifications/types.ts';

export interface NotificationListParams {
  page?: number;
  limit?: number;
  isRead?: boolean | string;
  type?: NotificationType | 'ALL' | string;
  priority?: NotificationPriority | 'ALL' | string;
  search?: string;
  recipientId?: string;
}

export interface BroadcastPayload {
  title: string;
  message: string;
  recipientRole?: NotificationRecipientRole;
  priority?: NotificationPriority;
  actionLabel?: string;
  actionRoute?: string;
}

/**
 * Normalizes ISO date string safely.
 */
function formatIso(val: any): string {
  if (!val) return new Date().toISOString();
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Maps a backend ApiNotification entity to the frontend Notification domain model.
 */
export function mapApiNotificationToNotification(apiNotif: any): Notification {
  const isRead = Boolean(
    apiNotif.isRead !== undefined
      ? apiNotif.isRead
      : apiNotif.is_read !== undefined
      ? apiNotif.is_read
      : apiNotif.read !== undefined
      ? apiNotif.read
      : false
  );

  const createdAt = formatIso(apiNotif.createdAt || apiNotif.created_at);
  const readAt = apiNotif.readAt || apiNotif.read_at
    ? formatIso(apiNotif.readAt || apiNotif.read_at)
    : null;

  return {
    id: String(apiNotif.id),
    recipientId: String(apiNotif.recipientId || apiNotif.recipient_id || ''),
    recipientRole: (apiNotif.recipientRole || apiNotif.recipient_role) as NotificationRecipientRole | undefined,
    type: (apiNotif.type as NotificationType) || 'GENERAL',
    priority: (apiNotif.priority as NotificationPriority) || 'NORMAL',
    title: String(apiNotif.title || ''),
    message: String(apiNotif.message || ''),
    read: isRead,
    isRead,
    readAt,
    createdAt,
    relatedEntityType: apiNotif.relatedEntityType || apiNotif.related_entity_type || undefined,
    relatedEntityId: apiNotif.relatedEntityId ? String(apiNotif.relatedEntityId) : (apiNotif.related_entity_id ? String(apiNotif.related_entity_id) : undefined),
    bookTitle: apiNotif.bookTitle || apiNotif.book_title || undefined,
    bookCoverUrl: apiNotif.bookCoverUrl || apiNotif.book_cover_url || undefined,
    actionLabel: apiNotif.actionLabel || apiNotif.action_label || undefined,
    actionRoute: apiNotif.actionRoute || apiNotif.action_route || undefined,
  };
}

export const notificationsApi = {
  /**
   * List notifications for authenticated user with pagination, filtering, and unread counts.
   */
  listNotifications: async (
    params?: NotificationListParams
  ): Promise<ApiResponse<ApiNotification[]> & { meta?: { pagination?: any; unreadCount?: number } }> => {
    const cleanParams: Record<string, any> = { ...params };
    if (cleanParams.type === 'ALL') {
      delete cleanParams.type;
    }
    if (cleanParams.priority === 'ALL') {
      delete cleanParams.priority;
    }
    return apiClient.get<ApiNotification[]>('/notifications', {
      params: cleanParams as Record<string, string | number | boolean | undefined | null>,
    });
  },

  /**
   * Retrieve single notification by ID.
   */
  getNotificationById: async (id: string): Promise<ApiResponse<ApiNotification>> => {
    return apiClient.get<ApiNotification>(`/notifications/${encodeURIComponent(id)}`);
  },

  /**
   * Mark a single notification as read.
   */
  markAsRead: async (id: string): Promise<ApiResponse<ApiNotification>> => {
    return apiClient.patch<ApiNotification>(`/notifications/${encodeURIComponent(id)}/read`);
  },

  /**
   * Mark all eligible notifications as read for authenticated user.
   */
  markAllAsRead: async (): Promise<ApiResponse<ApiMarkAllReadResult>> => {
    return apiClient.patch<ApiMarkAllReadResult>('/notifications/read-all');
  },

  /**
   * Staff broadcast to user roles (ADMIN, LIBRARIAN only).
   */
  broadcast: async (payload: BroadcastPayload): Promise<ApiResponse<ApiNotification>> => {
    return apiClient.post<ApiNotification>('/notifications/broadcast', payload);
  },

  /**
   * Staff-triggered sweep for due-soon and overdue loans (ADMIN, LIBRARIAN only).
   */
  scanDueSoonAndOverdue: async (): Promise<ApiResponse<ApiScanDueOverdueResult>> => {
    return apiClient.post<ApiScanDueOverdueResult>('/notifications/scan-due-overdue');
  },
};
