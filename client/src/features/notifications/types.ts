/**
 * LIBFLOW — Notifications Domain Type Definitions
 * 
 * CORE RULES:
 * - Notification is an event or alert communicated to an institutional user.
 * - Categorized by type and priority.
 * - Links to operational domain entities (Book, Loan, Reservation, Fine, Member).
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
  | 'GENERAL'
  | 'LOAN_ISSUED'
  | 'LOAN_RETURNED'
  | 'LOAN_RENEWED'
  | 'DUE_DATE_REMINDER'
  | 'OVERDUE_ALERT'
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_EXPIRED'
  | 'FINE_ASSESSED'
  | 'FINE_WAIVED';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type NotificationRecipientRole = 'ADMIN' | 'LIBRARIAN' | 'MEMBER' | 'ALL';

export interface Notification {
  id: string;
  recipientId: string;             // Member ID or user ID (or "all", "admin", "librarian")
  recipientRole?: NotificationRecipientRole;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  read: boolean;
  isRead?: boolean;
  readAt?: string | null;
  createdAt: string;               // ISO Date
  relatedEntityType?: 'BOOK' | 'LOAN' | 'RESERVATION' | 'FINE' | 'MEMBER' | 'SYSTEM';
  relatedEntityId?: string;
  bookTitle?: string;
  bookCoverUrl?: string;
  actionLabel?: string;
  actionRoute?: string;
}

export interface NotificationFilterState {
  status: 'ALL' | 'UNREAD' | 'READ';
  type: NotificationType | 'ALL';
}
