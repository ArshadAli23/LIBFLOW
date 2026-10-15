/**
 * LIBFLOW — Notification Model (Role & Patron Telemetry Alerts)
 * 
 * CORE DOMAIN RULE:
 * - A Notification represents an operational or informational event
 *   communicated to an institutional patron, staff member, or broadcast role.
 */

export type NotificationType =
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'RESERVATION_READY'
  | 'RESERVATION_EXPIRING'
  | 'FINE_CREATED'
  | 'FINE_UPDATED'
  | 'FINE_PAID'
  | 'MEMBERSHIP_EXPIRING'
  | 'SYSTEM_BROADCAST'
  | 'BOOK_ISSUED'
  | 'GENERAL';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type NotificationRecipientRole = 'ADMIN' | 'LIBRARIAN' | 'MEMBER' | 'ALL';
export type NotificationRelatedEntity = 'BOOK' | 'LOAN' | 'RESERVATION' | 'FINE' | 'MEMBER' | 'SYSTEM';

export interface NotificationEntity {
  id: string;
  tenantId: string;
  recipientId: string;
  recipientRole?: NotificationRecipientRole | null;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date | null;
  relatedEntityType?: NotificationRelatedEntity | null;
  relatedEntityId?: string | null;
  bookTitle?: string | null;
  bookCoverUrl?: string | null;
  actionLabel?: string | null;
  actionRoute?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const mapNotificationRow = (row: Record<string, any>): NotificationEntity => {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || 'default-library'),
    recipientId: String(row.recipient_id),
    recipientRole: row.recipient_role ? (row.recipient_role as NotificationRecipientRole) : null,
    type: row.type as NotificationType,
    priority: (row.priority || 'NORMAL') as NotificationPriority,
    title: String(row.title),
    message: String(row.message),
    isRead: Boolean(row.is_read),
    readAt: row.read_at ? new Date(row.read_at) : null,
    relatedEntityType: row.related_entity_type ? (row.related_entity_type as NotificationRelatedEntity) : null,
    relatedEntityId: row.related_entity_id ? String(row.related_entity_id) : null,
    bookTitle: row.book_title ? String(row.book_title) : null,
    bookCoverUrl: row.book_cover_url ? String(row.book_cover_url) : null,
    actionLabel: row.action_label ? String(row.action_label) : null,
    actionRoute: row.action_route ? String(row.action_route) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};
