/**
 * LIBFLOW — Notification Service (Patron Feeds & Telemetry Alerts)
 * 
 * CORE RESPONSIBILITIES:
 * - Direct patron notifications (checkout, return, due date alerts, fines, reservation holds).
 * - Role-based announcements & institutional broadcasts (ADMIN, LIBRARIAN, MEMBER, ALL).
 * - Server-side data isolation: patrons cannot inspect or mark other users' notifications.
 * - Deduplication engine: blocks repetitive alert spamming for overdue/due-soon items.
 * - Scheduled & on-demand sweeps for upcoming due dates and delinquent loans.
 */

import crypto from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import { getPool } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { AuditService } from './AuditService.js';
import {
  mapNotificationRow,
  type NotificationEntity,
  type NotificationType,
  type NotificationPriority,
  type NotificationRecipientRole,
  type NotificationRelatedEntity,
} from '../models/Notification.js';

export interface CreateNotificationInput {
  recipientId: string;
  recipientRole?: NotificationRecipientRole | null;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  relatedEntityType?: NotificationRelatedEntity | null;
  relatedEntityId?: string | null;
  bookTitle?: string | null;
  bookCoverUrl?: string | null;
  actionLabel?: string | null;
  actionRoute?: string | null;
  tenantId?: string;
  deduplicateWindowHours?: number;
}

export interface NotificationListFilters {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  search?: string;
  recipientId?: string;
}

export interface RecipientContext {
  userId: string;
  memberId?: string;
  role: string;
  recipientId?: string;
}

export class NotificationService {
  /**
   * Creates and persists a notification with optional deduplication.
   */
  static async createNotification(
    input: CreateNotificationInput,
    conn?: PoolConnection
  ): Promise<NotificationEntity> {
    const tenantId = input.tenantId || 'default-library';
    const client = conn || getPool();

    // 1. Deduplication check if window is specified
    if (input.deduplicateWindowHours && input.deduplicateWindowHours > 0) {
      let dedupeQuery = `
        SELECT * FROM notifications
        WHERE tenant_id = ?
          AND recipient_id = ?
          AND type = ?
          AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
      `;
      const dedupeParams: any[] = [
        tenantId,
        input.recipientId,
        input.type,
        input.deduplicateWindowHours,
      ];

      if (input.relatedEntityId) {
        dedupeQuery += ' AND related_entity_id = ?';
        dedupeParams.push(input.relatedEntityId);
      }

      dedupeQuery += ' ORDER BY created_at DESC LIMIT 1';

      const [existing] = await client.query<any[]>(dedupeQuery, dedupeParams);
      if (existing && existing.length > 0) {
        return mapNotificationRow(existing[0]);
      }
    }

    // 2. Insert notification
    const notificationId = `ntf_${crypto.randomUUID()}`;
    const priority = input.priority || 'NORMAL';

    await client.query(
      `INSERT INTO notifications (
        id, tenant_id, recipient_id, recipient_role, type, priority,
        title, message, is_read, read_at, related_entity_type, related_entity_id,
        book_title, book_cover_url, action_label, action_route, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, FALSE, NULL, ?, ?,
        ?, ?, ?, ?, NOW(), NOW()
      )`,
      [
        notificationId,
        tenantId,
        input.recipientId,
        input.recipientRole || null,
        input.type,
        priority,
        input.title,
        input.message,
        input.relatedEntityType || null,
        input.relatedEntityId || null,
        input.bookTitle || null,
        input.bookCoverUrl || null,
        input.actionLabel || null,
        input.actionRoute || null,
      ]
    );

    const [rows] = await client.query<any[]>(
      'SELECT * FROM notifications WHERE id = ? LIMIT 1',
      [notificationId]
    );

    return mapNotificationRow(rows[0]);
  }

  /**
   * Lists notifications for the authenticated user with server-side ownership enforcement.
   */
  static async listNotifications(
    filters: NotificationListFilters,
    recipientContext: RecipientContext,
    tenantId = 'default-library'
  ): Promise<{
    data: NotificationEntity[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
    unreadCount: number;
  }> {
    const pool = getPool();
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['n.tenant_id = ?'];
    const params: any[] = [tenantId];

    // Ownership & Role Scope
    if (recipientContext.role === 'MEMBER') {
      // Patrons can strictly only access notifications targeted to their user ID, member ID, or role broadcasts
      const memberAltId = recipientContext.memberId || recipientContext.userId;
      whereClauses.push(
        '(n.recipient_id = ? OR n.recipient_id = ? OR n.recipient_role = ? OR n.recipient_role = ?)'
      );
      params.push(recipientContext.userId, memberAltId, 'MEMBER', 'ALL');
    } else {
      // Staff (ADMIN, LIBRARIAN)
      if (filters.recipientId) {
        whereClauses.push('n.recipient_id = ?');
        params.push(filters.recipientId);
      } else {
        whereClauses.push(
          '(n.recipient_id = ? OR n.recipient_role IN (?, ?, ?))'
        );
        params.push(recipientContext.userId, recipientContext.role, 'LIBRARIAN', 'ALL');
      }
    }

    // Filter by read status
    if (filters.isRead !== undefined) {
      whereClauses.push('n.is_read = ?');
      params.push(Boolean(filters.isRead));
    }

    // Filter by type
    if (filters.type) {
      whereClauses.push('n.type = ?');
      params.push(filters.type);
    }

    // Filter by priority
    if (filters.priority) {
      whereClauses.push('n.priority = ?');
      params.push(filters.priority);
    }

    // Keyword search
    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      whereClauses.push('(n.title LIKE ? OR n.message LIKE ? OR n.book_title LIKE ?)');
      params.push(term, term, term);
    }

    const whereSql = whereClauses.join(' AND ');

    // 1. Total matching count
    const [countRows] = await pool.query<any[]>(
      `SELECT COUNT(*) AS total FROM notifications n WHERE ${whereSql}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

    // 2. Unread count under current ownership scope
    const unreadClauses = [...whereClauses];
    const unreadParams = [...params];
    // Replace or ensure is_read = false
    const isReadIdx = unreadClauses.findIndex((c) => c === 'n.is_read = ?');
    if (isReadIdx >= 0) {
      unreadClauses.splice(isReadIdx, 1);
      unreadParams.splice(isReadIdx, 1);
    }
    unreadClauses.push('n.is_read = FALSE');

    const [unreadRows] = await pool.query<any[]>(
      `SELECT COUNT(*) AS unread_total FROM notifications n WHERE ${unreadClauses.join(' AND ')}`,
      unreadParams
    );
    const unreadCount = Number(unreadRows[0]?.unread_total || 0);

    // 3. Paginated dataset
    const dataParams = [...params, limit, offset];
    const [rows] = await pool.query<any[]>(
      `SELECT n.* FROM notifications n
       WHERE ${whereSql}
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      dataParams
    );

    const data = (rows || []).map(mapNotificationRow);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      unreadCount,
    };
  }

  /**
   * Retrieves a single notification by ID with zero-trust ownership verification.
   */
  static async getNotificationById(
    id: string,
    recipientContext: RecipientContext,
    tenantId = 'default-library'
  ): Promise<NotificationEntity> {
    const pool = getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM notifications WHERE tenant_id = ? AND id = ? LIMIT 1',
      [tenantId, id]
    );

    if (!rows || rows.length === 0) {
      throw ApiError.notFound(`Notification with ID "${id}" was not found.`, 'NOTIFICATION_NOT_FOUND');
    }

    const notification = mapNotificationRow(rows[0]);

    // Zero-trust verification for MEMBER patrons
    if (recipientContext.role === 'MEMBER') {
      const memberAltId = recipientContext.memberId || recipientContext.userId;
      const isOwner =
        notification.recipientId === recipientContext.userId ||
        notification.recipientId === memberAltId ||
        notification.recipientRole === 'MEMBER' ||
        notification.recipientRole === 'ALL';

      if (!isOwner) {
        throw ApiError.forbidden(
          'Access forbidden: You cannot view notifications belonging to other library users.',
          'MEMBER_ACCESS_DENIED'
        );
      }
    }

    return notification;
  }

  /**
   * Marks a single notification as read after ownership verification.
   */
  static async markAsRead(
    id: string,
    recipientContext: RecipientContext,
    tenantId = 'default-library'
  ): Promise<NotificationEntity> {
    const notification = await this.getNotificationById(id, recipientContext, tenantId);

    if (notification.isRead) {
      return notification;
    }

    const pool = getPool();
    await pool.query(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = NOW(), updated_at = NOW() 
       WHERE id = ?`,
      [notification.id]
    );

    const [updatedRows] = await pool.query<any[]>(
      'SELECT * FROM notifications WHERE id = ? LIMIT 1',
      [notification.id]
    );

    return mapNotificationRow(updatedRows[0]);
  }

  /**
   * Marks all unread notifications as read for the authenticated recipient.
   */
  static async markAllAsRead(
    recipientContext: RecipientContext,
    tenantId = 'default-library'
  ): Promise<{ markedCount: number }> {
    const pool = getPool();

    if (recipientContext.role === 'MEMBER') {
      const memberAltId = recipientContext.memberId || recipientContext.userId;
      const [result] = await pool.query<any>(
        `UPDATE notifications 
         SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
         WHERE tenant_id = ?
           AND (recipient_id = ? OR recipient_id = ? OR recipient_role = 'MEMBER' OR recipient_role = 'ALL')
           AND is_read = FALSE`,
        [tenantId, recipientContext.userId, memberAltId]
      );
      return { markedCount: Number(result?.affectedRows || 0) };
    }

    // Staff
    const [result] = await pool.query<any>(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
       WHERE tenant_id = ?
         AND (recipient_id = ? OR recipient_role IN ('ADMIN', 'LIBRARIAN', 'ALL'))
         AND is_read = FALSE`,
      [tenantId, recipientContext.userId]
    );

    return { markedCount: Number(result?.affectedRows || 0) };
  }

  /**
   * Staff-authorized administrative broadcast to system roles.
   */
  static async broadcast(
    input: {
      recipientRole?: NotificationRecipientRole;
      title: string;
      message: string;
      priority?: NotificationPriority;
      actionLabel?: string;
      actionRoute?: string;
    },
    actorContext: { actorId: string; actorRole: string; fullName: string; ipAddress?: string; userAgent?: string },
    tenantId = 'default-library'
  ): Promise<NotificationEntity> {
    const targetRole: NotificationRecipientRole = input.recipientRole || 'ALL';
    const notification = await this.createNotification({
      recipientId: 'BROADCAST',
      recipientRole: targetRole,
      type: 'SYSTEM_BROADCAST',
      priority: input.priority || 'HIGH',
      title: input.title,
      message: input.message,
      relatedEntityType: 'SYSTEM',
      actionLabel: input.actionLabel,
      actionRoute: input.actionRoute,
      tenantId,
    });

    await AuditService.log({
      tenantId,
      actorId: actorContext.actorId,
      actorRole: actorContext.actorRole,
      action: 'SYSTEM_BROADCAST_CREATED',
      entityType: 'System',
      entityId: notification.id,
      newValue: { targetRole, title: input.title, priority: input.priority },
      ipAddress: actorContext.ipAddress,
      userAgent: actorContext.userAgent,
    });

    return notification;
  }

  // ============================================================================
  // Lifecycle Event Notifications
  // ============================================================================

  /**
   * Sends checkout confirmation alert.
   */
  static async notifyBookIssued(
    data: {
      recipientId: string;
      bookTitle: string;
      loanNumber: string;
      dueDate: Date;
      loanId: string;
    },
    tenantId = 'default-library',
    conn?: PoolConnection
  ): Promise<NotificationEntity> {
    const dueDateStr = new Date(data.dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return await this.createNotification(
      {
        tenantId,
        recipientId: data.recipientId,
        type: 'BOOK_ISSUED',
        priority: 'NORMAL',
        title: `Book Issued: ${data.bookTitle}`,
        message: `"${data.bookTitle}" (Loan #${data.loanNumber}) has been issued to your account. Due date is ${dueDateStr}.`,
        relatedEntityType: 'LOAN',
        relatedEntityId: data.loanId,
        bookTitle: data.bookTitle,
        actionLabel: 'View Loan',
        actionRoute: `/loans/${data.loanId}`,
        deduplicateWindowHours: 1,
      },
      conn
    );
  }

  /**
   * Sends return receipt confirmation.
   */
  static async notifyBookReturned(
    data: {
      recipientId: string;
      bookTitle: string;
      loanNumber: string;
      loanId: string;
    },
    tenantId = 'default-library',
    conn?: PoolConnection
  ): Promise<NotificationEntity> {
    return await this.createNotification(
      {
        tenantId,
        recipientId: data.recipientId,
        type: 'GENERAL',
        priority: 'LOW',
        title: `Item Returned: ${data.bookTitle}`,
        message: `"${data.bookTitle}" (Loan #${data.loanNumber}) has been successfully returned to library circulation. Thank you!`,
        relatedEntityType: 'LOAN',
        relatedEntityId: data.loanId,
        bookTitle: data.bookTitle,
        actionLabel: 'View History',
        actionRoute: '/loans/history',
        deduplicateWindowHours: 1,
      },
      conn
    );
  }

  /**
   * Sends reservation ready for pickup notice.
   */
  static async notifyReservationReady(
    data: {
      recipientId: string;
      bookTitle: string;
      reservationNumber: string;
      reservationId: string;
      expiresAt: Date;
    },
    tenantId = 'default-library',
    conn?: PoolConnection
  ): Promise<NotificationEntity> {
    const expiryStr = new Date(data.expiresAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return await this.createNotification(
      {
        tenantId,
        recipientId: data.recipientId,
        type: 'RESERVATION_READY',
        priority: 'URGENT',
        title: `Hold Ready for Pickup: ${data.bookTitle}`,
        message: `Your hold #${data.reservationNumber} for "${data.bookTitle}" is ready at the circulation desk! Please claim by ${expiryStr}.`,
        relatedEntityType: 'RESERVATION',
        relatedEntityId: data.reservationId,
        bookTitle: data.bookTitle,
        actionLabel: 'View Reservation',
        actionRoute: `/reservations/${data.reservationId}`,
        deduplicateWindowHours: 6,
      },
      conn
    );
  }

  /**
   * Sends reservation pickup window expiring alert.
   */
  static async notifyReservationExpiring(
    data: {
      recipientId: string;
      bookTitle: string;
      reservationNumber: string;
      reservationId: string;
    },
    tenantId = 'default-library',
    conn?: PoolConnection
  ): Promise<NotificationEntity> {
    return await this.createNotification(
      {
        tenantId,
        recipientId: data.recipientId,
        type: 'RESERVATION_EXPIRING',
        priority: 'HIGH',
        title: `Pickup Hold Expired: ${data.bookTitle}`,
        message: `Your reservation #${data.reservationNumber} for "${data.bookTitle}" has expired and the copy has been released to the next patron.`,
        relatedEntityType: 'RESERVATION',
        relatedEntityId: data.reservationId,
        bookTitle: data.bookTitle,
        deduplicateWindowHours: 12,
      },
      conn
    );
  }

  /**
   * Sends overdue fine assessment alert.
   */
  static async notifyFineCreated(
    data: {
      recipientId: string;
      fineNumber: string;
      amount: number;
      fineId: string;
      bookTitle?: string;
    },
    tenantId = 'default-library',
    conn?: PoolConnection
  ): Promise<NotificationEntity> {
    return await this.createNotification(
      {
        tenantId,
        recipientId: data.recipientId,
        type: 'FINE_CREATED',
        priority: 'HIGH',
        title: `Overdue Fine Assessed: ₹${data.amount.toFixed(2)}`,
        message: `An overdue fine of ₹${data.amount.toFixed(2)} (Fine #${data.fineNumber}) has been recorded on your account${data.bookTitle ? ` for "${data.bookTitle}"` : ''}.`,
        relatedEntityType: 'FINE',
        relatedEntityId: data.fineId,
        bookTitle: data.bookTitle,
        actionLabel: 'Pay Fine',
        actionRoute: `/fines/${data.fineId}`,
        deduplicateWindowHours: 6,
      },
      conn
    );
  }

  /**
   * Sends fine payment confirmation.
   */
  static async notifyFinePaid(
    data: {
      recipientId: string;
      fineNumber: string;
      amountPaid: number;
      remainingBalance: number;
      fineId: string;
    },
    tenantId = 'default-library',
    conn?: PoolConnection
  ): Promise<NotificationEntity> {
    return await this.createNotification(
      {
        tenantId,
        recipientId: data.recipientId,
        type: 'FINE_PAID',
        priority: 'NORMAL',
        title: `Payment Received: ₹${data.amountPaid.toFixed(2)}`,
        message: `Payment of ₹${data.amountPaid.toFixed(2)} for Fine #${data.fineNumber} was processed successfully. Current remaining balance: ₹${data.remainingBalance.toFixed(2)}.`,
        relatedEntityType: 'FINE',
        relatedEntityId: data.fineId,
        actionLabel: 'View Ledger',
        actionRoute: `/fines/${data.fineId}`,
        deduplicateWindowHours: 1,
      },
      conn
    );
  }

  /**
   * Sends fine waiver notification.
   */
  static async notifyFineWaived(
    data: {
      recipientId: string;
      fineNumber: string;
      waivedAmount: number;
      reason: string;
      fineId: string;
    },
    tenantId = 'default-library',
    conn?: PoolConnection
  ): Promise<NotificationEntity> {
    return await this.createNotification(
      {
        tenantId,
        recipientId: data.recipientId,
        type: 'FINE_UPDATED',
        priority: 'NORMAL',
        title: `Fine Waived: ₹${data.waivedAmount.toFixed(2)}`,
        message: `An administrative waiver of ₹${data.waivedAmount.toFixed(2)} was applied to Fine #${data.fineNumber} (Reason: ${data.reason}).`,
        relatedEntityType: 'FINE',
        relatedEntityId: data.fineId,
        deduplicateWindowHours: 1,
      },
      conn
    );
  }

  /**
   * Batch sweep engine: scans for due-soon loans (within 48 hours) and overdue loans.
   * Emits deduplicated alerts and flags overdue accounts.
   */
  static async scanDueSoonAndOverdue(tenantId = 'default-library'): Promise<{
    dueSoonAlertsSent: number;
    overdueAlertsSent: number;
    loansFlaggedOverdue: number;
  }> {
    const pool = getPool();
    let dueSoonAlertsSent = 0;
    let overdueAlertsSent = 0;
    let loansFlaggedOverdue = 0;

    // 1. Scan due soon (due within next 48 hours, not yet overdue, active loans)
    const [dueSoonLoans] = await pool.query<any[]>(
      `SELECT l.*, m.user_id 
       FROM loans l
       JOIN members m ON l.member_id = m.id
       WHERE l.tenant_id = ?
         AND l.status = 'ACTIVE'
         AND l.due_date > NOW()
         AND l.due_date <= DATE_ADD(NOW(), INTERVAL 2 DAY)`,
      [tenantId]
    );

    for (const loan of dueSoonLoans || []) {
      const recipientId = loan.user_id || loan.member_id;
      const hoursLeft = Math.max(1, Math.round((new Date(loan.due_date).getTime() - Date.now()) / (3600 * 1000)));

      // Deduplicate: send at most once per 24 hours per loan
      const created = await this.createNotification({
        tenantId,
        recipientId,
        type: 'DUE_SOON',
        priority: 'HIGH',
        title: `Due Soon: "${loan.book_title}"`,
        message: `Your loan for "${loan.book_title}" is due in approximately ${hoursLeft} hours. Please return or renew to avoid fines.`,
        relatedEntityType: 'LOAN',
        relatedEntityId: loan.id,
        bookTitle: loan.book_title,
        actionLabel: 'Renew Loan',
        actionRoute: `/loans/${loan.id}`,
        deduplicateWindowHours: 24,
      });

      if (created) dueSoonAlertsSent++;
    }

    // 2. Scan overdue loans (due_date < NOW(), status in ACTIVE or OVERDUE)
    const [overdueLoans] = await pool.query<any[]>(
      `SELECT l.*, m.user_id 
       FROM loans l
       JOIN members m ON l.member_id = m.id
       WHERE l.tenant_id = ?
         AND l.status IN ('ACTIVE', 'OVERDUE')
         AND l.due_date < NOW()`,
      [tenantId]
    );

    for (const loan of overdueLoans || []) {
      const recipientId = loan.user_id || loan.member_id;

      // Update status to OVERDUE if still ACTIVE
      if (loan.status === 'ACTIVE') {
        await pool.query(
          "UPDATE loans SET status = 'OVERDUE', updated_at = NOW() WHERE id = ?",
          [loan.id]
        );
        await pool.query(
          "UPDATE members SET has_overdue_restrictions = TRUE, overdue_count = overdue_count + 1, updated_at = NOW() WHERE id = ?",
          [loan.member_id]
        );
        loansFlaggedOverdue++;
      }

      // Deduplicate: send once every 24 hours while overdue
      const created = await this.createNotification({
        tenantId,
        recipientId,
        type: 'OVERDUE',
        priority: 'URGENT',
        title: `OVERDUE NOTICE: "${loan.book_title}"`,
        message: `Item "${loan.book_title}" (Loan #${loan.loan_number}) is past its due date. Please return immediately to halt daily fine accrual.`,
        relatedEntityType: 'LOAN',
        relatedEntityId: loan.id,
        bookTitle: loan.book_title,
        actionLabel: 'View Loan',
        actionRoute: `/loans/${loan.id}`,
        deduplicateWindowHours: 24,
      });

      if (created) overdueAlertsSent++;
    }

    return {
      dueSoonAlertsSent,
      overdueAlertsSent,
      loansFlaggedOverdue,
    };
  }
}
