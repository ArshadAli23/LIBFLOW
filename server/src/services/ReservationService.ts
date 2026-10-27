/**
 * LIBFLOW — Reservation Service (Hold Queue & Pickup Lifecycle)
 * 
 * CORE RESPONSIBILITIES:
 * - Manages bibliographic title hold queue with strict FIFO seniority.
 * - Enforces the deterministic state machine:
 *   WAITING -> READY_FOR_PICKUP -> CLAIMED
 *   READY_FOR_PICKUP -> EXPIRED
 *   WAITING -> CANCELLED
 * - Automatic pickup staging with 48-hour expiration policy.
 * - Queue re-indexing upon cancellation or fulfillment.
 * - Batch sweeps for expired pickup windows.
 */

import crypto from 'node:crypto';
import { getPool, withTransaction } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { AuditService } from './AuditService.js';
import { ReservationQueueService } from './ReservationQueueService.js';
import { NotificationService } from './NotificationService.js';
import {
  mapReservationRow,
  type ReservationEntity,
  type ReservationStatus,
} from '../models/Reservation.js';
import { mapMemberRow, type MemberEntity } from '../models/Member.js';
import { mapBookRow, type BookEntity } from '../models/Book.js';
import { mapBookCopyRow, type BookCopyEntity } from '../models/BookCopy.js';
import { mapLoanRow, type LoanEntity } from '../models/Loan.js';

export interface CreateReservationInput {
  bookId: string;
  memberId?: string; // If staff, required; if member, extracted from session
  pickupSlot?: string;
  notes?: string;
  tenantId?: string;
}

export interface ReservationListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReservationStatus;
  bookId?: string;
  memberId?: string;
  sortBy?: string;
  tenantId?: string;
}

export interface ActorContext {
  actorId: string;
  actorRole: string;
  fullName: string;
  memberId?: string;
  ipAddress?: string;
  userAgent?: string;
}

const RESERVATION_SORT_WHITELIST: Record<string, string> = {
  created_desc: 'r.created_at DESC',
  created_asc: 'r.created_at ASC',
  queue_asc: 'r.queue_position ASC',
  expires_asc: 'r.expires_at ASC',
};

export class ReservationService {
  /**
   * Places a reservation hold on a bibliographic title for a library member.
   */
  static async createReservation(
    input: CreateReservationInput,
    actorContext: ActorContext,
    tenantId = 'default-library'
  ): Promise<ReservationEntity> {
    const targetMemberIdentifier =
      actorContext.actorRole === 'MEMBER'
        ? actorContext.memberId || actorContext.actorId
        : input.memberId;

    if (!targetMemberIdentifier) {
      throw ApiError.badRequest('Member identification is required to place a reservation.', 'MEMBER_REQUIRED');
    }

    return await withTransaction(async (conn) => {
      // 1. Resolve and lock Member
      const [memberRows] = await conn.query<any[]>(
        'SELECT * FROM members WHERE tenant_id = ? AND (id = ? OR member_id = ? OR user_id = ?) LIMIT 1 FOR UPDATE',
        [tenantId, targetMemberIdentifier, targetMemberIdentifier, targetMemberIdentifier]
      );

      if (!memberRows || memberRows.length === 0) {
        throw ApiError.notFound('Member record not found.', 'MEMBER_NOT_FOUND');
      }

      const member = mapMemberRow(memberRows[0]);

      if (member.status !== 'ACTIVE') {
        throw ApiError.forbidden(
          `Cannot place reservation: Member status is ${member.status}.`,
          'MEMBER_INACTIVE'
        );
      }

      if (member.hasOverdueRestrictions) {
        throw ApiError.forbidden(
          'Cannot place reservation: Member has active overdue restriction on their account.',
          'MEMBER_OVERDUE_RESTRICTION'
        );
      }

      // 2. Resolve and lock Book
      const [bookRows] = await conn.query<any[]>(
        'SELECT * FROM books WHERE tenant_id = ? AND id = ? LIMIT 1 FOR UPDATE',
        [tenantId, input.bookId]
      );

      if (!bookRows || bookRows.length === 0) {
        throw ApiError.notFound(`Book with ID "${input.bookId}" was not found.`, 'BOOK_NOT_FOUND');
      }

      const book = mapBookRow(bookRows[0]);

      if (book.status !== 'ACTIVE') {
        throw ApiError.badRequest('Cannot reserve an archived or inactive book title.', 'BOOK_NOT_ACTIVE');
      }

      // 3. Prevent duplicate active reservations by the same member for this book
      const [existingRes] = await conn.query<any[]>(
        "SELECT id FROM reservations WHERE tenant_id = ? AND member_id = ? AND book_id = ? AND status IN ('WAITING', 'READY_FOR_PICKUP') LIMIT 1 FOR UPDATE",
        [tenantId, member.id, book.id]
      );

      if (existingRes && existingRes.length > 0) {
        throw ApiError.conflict(
          'You already have an active reservation hold for this book title.',
          'DUPLICATE_RESERVATION'
        );
      }

      // 4. Prevent reservation if member already has this book borrowed on active loan
      const [existingLoan] = await conn.query<any[]>(
        "SELECT id FROM loans WHERE tenant_id = ? AND member_id = ? AND book_id = ? AND status IN ('ACTIVE', 'OVERDUE') LIMIT 1 FOR UPDATE",
        [tenantId, member.id, book.id]
      );

      if (existingLoan && existingLoan.length > 0) {
        throw ApiError.conflict(
          'You currently have a copy of this book borrowed on an active loan.',
          'MEMBER_ALREADY_BORROWED'
        );
      }

      // 5. Fetch existing waiting holds to determine FIFO queue position
      const [waitingRows] = await conn.query<any[]>(
        "SELECT id, member_id, book_id, queue_position, status FROM reservations WHERE tenant_id = ? AND book_id = ? AND status = 'WAITING' ORDER BY queue_position ASC FOR UPDATE",
        [tenantId, book.id]
      );

      const nextQueuePosition = ReservationQueueService.calculateNextQueuePosition(
        (waitingRows || []).map((r) => ({
          id: r.id,
          memberId: r.member_id,
          bookId: r.book_id,
          queuePosition: Number(r.queue_position),
          status: r.status,
        }))
      );

      // Check if an available physical copy exists and no other holds are waiting ahead
      let assignedCopyId: string | null = null;
      let reservationStatus: ReservationStatus = 'WAITING';
      let readyAt: Date | null = null;
      let expiresAt: Date | null = null;

      if (nextQueuePosition === 1 && book.availableCopies > 0) {
        // Immediate staging for pickup: assign available copy
        const [availCopies] = await conn.query<any[]>(
          "SELECT id, barcode FROM book_copies WHERE tenant_id = ? AND book_id = ? AND status = 'AVAILABLE' ORDER BY copy_number ASC LIMIT 1 FOR UPDATE",
          [tenantId, book.id]
        );

        if (availCopies && availCopies.length > 0) {
          const stagedCopy = availCopies[0];
          assignedCopyId = stagedCopy.id;
          reservationStatus = 'READY_FOR_PICKUP';
          readyAt = new Date();
          expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

          // Update physical copy status to RESERVED
          await conn.query(
            `UPDATE book_copies SET 
              status = 'RESERVED',
              current_holder_id = ?,
              current_holder_name = ?,
              updated_at = NOW()
            WHERE id = ?`,
            [member.id, member.fullName, stagedCopy.id]
          );

          // Update book counters: available decremented, reserved incremented
          await conn.query(
            `UPDATE books SET 
              available_copies = GREATEST(0, available_copies - 1),
              reserved_copies = reserved_copies + 1,
              updated_at = NOW()
            WHERE id = ?`,
            [book.id]
          );

          // Log copy event
          const eventId = `ev_${crypto.randomUUID()}`;
          await conn.query(
            `INSERT INTO book_copy_events (id, tenant_id, copy_id, event, actor, note, created_at)
             VALUES (?, ?, ?, 'RESERVED', ?, 'Staged for patron pickup hold', NOW())`,
            [eventId, tenantId, stagedCopy.id, actorContext.fullName]
          );
        }
      }

      // 6. Insert reservation
      const resId = `res_${crypto.randomUUID()}`;
      const resNumber = `RS-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      await conn.query(
        `INSERT INTO reservations (
          id, tenant_id, reservation_number, member_id, member_barcode, member_name,
          member_email, book_id, book_title, assigned_copy_id, status, queue_position,
          ready_at, expires_at, pickup_slot, notes, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, NOW(), NOW()
        )`,
        [
          resId,
          tenantId,
          resNumber,
          member.id,
          member.memberId,
          member.fullName,
          member.email,
          book.id,
          book.title,
          assignedCopyId,
          reservationStatus,
          nextQueuePosition,
          readyAt,
          expiresAt,
          input.pickupSlot || null,
          input.notes || null,
        ]
      );

      // 7. Update member reservation count
      await conn.query(
        'UPDATE members SET reservation_count = reservation_count + 1, updated_at = NOW() WHERE id = ?',
        [member.id]
      );

      // 8. Audit log
      await AuditService.log({
        tenantId,
        actorId: actorContext.actorId,
        actorRole: actorContext.actorRole,
        action: 'RESERVATION_CREATED',
        entityType: 'Reservation',
        entityId: resId,
        newValue: { resNumber, memberId: member.id, bookId: book.id, status: reservationStatus, queuePosition: nextQueuePosition },
        ipAddress: actorContext.ipAddress,
        userAgent: actorContext.userAgent,
      });

      // Emit notification if immediately ready for pickup
      if (reservationStatus === 'READY_FOR_PICKUP' && expiresAt) {
        try {
          const recipientId = member.userId || member.id;
          await NotificationService.notifyReservationReady(
            {
              recipientId,
              bookTitle: book.title,
              reservationNumber: resNumber,
              reservationId: resId,
              expiresAt,
            },
            tenantId,
            conn
          );
        } catch (err) {
          console.error('[NotificationService] Failed to emit reservation ready alert:', err);
        }
      }

      const [createdRows] = await conn.query<any[]>('SELECT * FROM reservations WHERE id = ? LIMIT 1', [resId]);
      return mapReservationRow(createdRows[0]);
    });
  }

  /**
   * Cancels an eligible reservation and triggers automatic queue re-indexing or copy re-staging.
   */
  static async cancelReservation(
    reservationId: string,
    actorContext: ActorContext,
    tenantId = 'default-library'
  ): Promise<ReservationEntity> {
    return await withTransaction(async (conn) => {
      const [rows] = await conn.query<any[]>(
        'SELECT * FROM reservations WHERE tenant_id = ? AND id = ? LIMIT 1 FOR UPDATE',
        [tenantId, reservationId]
      );

      if (!rows || rows.length === 0) {
        throw ApiError.notFound(`Reservation with ID "${reservationId}" was not found.`, 'RESERVATION_NOT_FOUND');
      }

      const res = mapReservationRow(rows[0]);

      // Ownership enforcement: Patron can only cancel their own reservation
      if (actorContext.actorRole === 'MEMBER') {
        const isOwner =
          res.memberId === actorContext.memberId ||
          res.memberId === actorContext.actorId;
        if (!isOwner) {
          throw ApiError.forbidden('You are not authorized to cancel another member’s reservation.', 'FORBIDDEN');
        }
      }

      // State machine validation
      ReservationQueueService.validateTransition(res.status, 'CANCELLED');

      // 1. If reservation was READY_FOR_PICKUP, handle staged physical copy
      if (res.status === 'READY_FOR_PICKUP' && res.assignedCopyId) {
        // Check if there is another WAITING hold for this book
        const [nextWaitingRows] = await conn.query<any[]>(
          "SELECT * FROM reservations WHERE tenant_id = ? AND book_id = ? AND status = 'WAITING' ORDER BY queue_position ASC, created_at ASC LIMIT 1 FOR UPDATE",
          [tenantId, res.bookId]
        );

        if (nextWaitingRows && nextWaitingRows.length > 0) {
          // Reassign copy to next candidate
          const nextHold = nextWaitingRows[0];
          const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

          await conn.query(
            `UPDATE reservations SET 
              status = 'READY_FOR_PICKUP',
              assigned_copy_id = ?,
              ready_at = NOW(),
              expires_at = ?,
              updated_at = NOW()
            WHERE id = ?`,
            [res.assignedCopyId, newExpiry, nextHold.id]
          );

          await conn.query(
            `UPDATE book_copies SET 
              current_holder_id = ?,
              current_holder_name = ?,
              updated_at = NOW()
            WHERE id = ?`,
            [nextHold.member_id, nextHold.member_name, res.assignedCopyId]
          );

          // Re-index remaining waiting holds
          await conn.query(
            `UPDATE reservations SET 
              queue_position = GREATEST(1, queue_position - 1),
              updated_at = NOW()
            WHERE tenant_id = ? AND book_id = ? AND status = 'WAITING' AND id != ?`,
            [tenantId, res.bookId, nextHold.id]
          );
        } else {
          // No more waiting holds: copy returns to AVAILABLE
          await conn.query(
            `UPDATE book_copies SET 
              status = 'AVAILABLE',
              current_holder_id = NULL,
              current_holder_name = NULL,
              updated_at = NOW()
            WHERE id = ?`,
            [res.assignedCopyId]
          );

          await conn.query(
            `UPDATE books SET 
              reserved_copies = GREATEST(0, reserved_copies - 1),
              available_copies = available_copies + 1,
              updated_at = NOW()
            WHERE id = ?`,
            [res.bookId]
          );
        }
      } else if (res.status === 'WAITING') {
        // Re-index waiting queue positions behind this cancelled hold
        await conn.query(
          `UPDATE reservations SET 
            queue_position = GREATEST(1, queue_position - 1),
            updated_at = NOW()
          WHERE tenant_id = ? AND book_id = ? AND status = 'WAITING' AND queue_position > ?`,
          [tenantId, res.bookId, res.queuePosition]
        );
      }

      // 2. Mark reservation CANCELLED
      await conn.query(
        "UPDATE reservations SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW() WHERE id = ?",
        [res.id]
      );

      // 3. Decrement member reservation count
      await conn.query(
        'UPDATE members SET reservation_count = GREATEST(0, reservation_count - 1), updated_at = NOW() WHERE id = ?',
        [res.memberId]
      );

      // 4. Audit log
      await AuditService.log({
        tenantId,
        actorId: actorContext.actorId,
        actorRole: actorContext.actorRole,
        action: 'RESERVATION_CANCELLED',
        entityType: 'Reservation',
        entityId: res.id,
        oldValue: { status: res.status },
        newValue: { status: 'CANCELLED' },
        ipAddress: actorContext.ipAddress,
        userAgent: actorContext.userAgent,
      });

      const [updatedRows] = await conn.query<any[]>('SELECT * FROM reservations WHERE id = ? LIMIT 1', [res.id]);
      return mapReservationRow(updatedRows[0]);
    });
  }

  /**
   * Claims a ready reservation, transitioning it to CLAIMED and converting it into an active Loan.
   */
  static async claimReservation(
    reservationId: string,
    actorContext: ActorContext,
    tenantId = 'default-library'
  ): Promise<{ reservation: ReservationEntity; loan: LoanEntity }> {
    return await withTransaction(async (conn) => {
      const [resRows] = await conn.query<any[]>(
        'SELECT * FROM reservations WHERE tenant_id = ? AND id = ? LIMIT 1 FOR UPDATE',
        [tenantId, reservationId]
      );

      if (!resRows || resRows.length === 0) {
        throw ApiError.notFound(`Reservation with ID "${reservationId}" was not found.`, 'RESERVATION_NOT_FOUND');
      }

      const res = mapReservationRow(resRows[0]);

      // Ownership enforcement
      if (actorContext.actorRole === 'MEMBER') {
        const isOwner =
          res.memberId === actorContext.memberId ||
          res.memberId === actorContext.actorId;
        if (!isOwner) {
          throw ApiError.forbidden('You are not authorized to claim another member’s reservation.', 'FORBIDDEN');
        }
      }

      // Must be READY_FOR_PICKUP
      if (res.status !== 'READY_FOR_PICKUP') {
        throw ApiError.badRequest(
          `Cannot claim reservation with status "${res.status}". Must be READY_FOR_PICKUP.`,
          'INVALID_RESERVATION_STATUS'
        );
      }

      // Expiry check
      if (res.expiresAt && res.expiresAt.getTime() < Date.now()) {
        throw ApiError.badRequest(
          'Reservation pickup window has expired. Please speak with library staff.',
          'RESERVATION_EXPIRED'
        );
      }

      if (!res.assignedCopyId) {
        throw ApiError.internal('No physical copy assigned to ready reservation.');
      }

      // Resolve Member
      const [memberRows] = await conn.query<any[]>(
        'SELECT * FROM members WHERE tenant_id = ? AND id = ? LIMIT 1 FOR UPDATE',
        [tenantId, res.memberId]
      );
      const member = mapMemberRow(memberRows[0]);

      if (member.activeLoansCount >= member.maxBorrowLimit) {
        throw ApiError.badRequest(
          `Member has reached their maximum borrowing limit of ${member.maxBorrowLimit} books.`,
          'MAX_BORROW_LIMIT_EXCEEDED'
        );
      }

      // Resolve Copy & Book
      const [copyRows] = await conn.query<any[]>(
        'SELECT * FROM book_copies WHERE id = ? LIMIT 1 FOR UPDATE',
        [res.assignedCopyId]
      );
      const copy = mapBookCopyRow(copyRows[0]);

      const [bookRows] = await conn.query<any[]>(
        'SELECT * FROM books WHERE id = ? LIMIT 1 FOR UPDATE',
        [res.bookId]
      );
      const book = mapBookRow(bookRows[0]);

      // Create active loan
      const loanId = `loan_${crypto.randomUUID()}`;
      const loanNumber = `LN-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const checkoutDate = new Date();
      const dueDate = new Date(checkoutDate.getTime() + 14 * 24 * 60 * 60 * 1000);

      await conn.query(
        `INSERT INTO loans (
          id, tenant_id, loan_number, member_id, member_barcode, member_name, member_email,
          book_id, book_title, book_copy_id, copy_barcode, copy_shelf, checkout_date,
          due_date, status, renewal_count, max_renewals, issued_by, fine_calculated,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, 'ACTIVE', 0, 2, ?, 0.00,
          NOW(), NOW()
        )`,
        [
          loanId,
          tenantId,
          loanNumber,
          member.id,
          member.memberId,
          member.fullName,
          member.email,
          book.id,
          book.title,
          copy.id,
          copy.barcode,
          copy.shelf,
          checkoutDate,
          dueDate,
          actorContext.fullName,
        ]
      );

      // Transition copy: RESERVED -> BORROWED
      await conn.query(
        `UPDATE book_copies SET 
          status = 'BORROWED',
          current_holder_id = ?,
          current_holder_name = ?,
          borrowed_date = ?,
          due_date = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [member.id, member.fullName, checkoutDate, dueDate, copy.id]
      );

      // Update parent book counters: reserved decremented, borrowed incremented, times_borrowed incremented
      await conn.query(
        `UPDATE books SET 
          reserved_copies = GREATEST(0, reserved_copies - 1),
          borrowed_copies = borrowed_copies + 1,
          times_borrowed = times_borrowed + 1,
          updated_at = NOW()
        WHERE id = ?`,
        [book.id]
      );

      // Transition reservation: READY_FOR_PICKUP -> CLAIMED
      await conn.query(
        "UPDATE reservations SET status = 'CLAIMED', claimed_at = NOW(), updated_at = NOW() WHERE id = ?",
        [res.id]
      );

      // Update member counts
      await conn.query(
        `UPDATE members SET 
          active_loans_count = active_loans_count + 1,
          reservation_count = GREATEST(0, reservation_count - 1),
          total_books_borrowed = total_books_borrowed + 1,
          last_activity_at = NOW(),
          updated_at = NOW()
        WHERE id = ?`,
        [member.id]
      );

      // Record copy event
      const eventId = `ev_${crypto.randomUUID()}`;
      await conn.query(
        `INSERT INTO book_copy_events (id, tenant_id, copy_id, event, actor, note, created_at)
         VALUES (?, ?, ?, 'BORROWED', ?, ?, NOW())`,
        [eventId, tenantId, copy.id, actorContext.fullName, `Hold claimed. Loan #${loanNumber}`]
      );

      // Audit log
      await AuditService.log({
        tenantId,
        actorId: actorContext.actorId,
        actorRole: actorContext.actorRole,
        action: 'RESERVATION_CLAIMED',
        entityType: 'Reservation',
        entityId: res.id,
        newValue: { loanId, loanNumber, claimedAt: new Date() },
        ipAddress: actorContext.ipAddress,
        userAgent: actorContext.userAgent,
      });

      const [updatedRes] = await conn.query<any[]>('SELECT * FROM reservations WHERE id = ? LIMIT 1', [res.id]);
      const [createdLoan] = await conn.query<any[]>('SELECT * FROM loans WHERE id = ? LIMIT 1', [loanId]);

      return {
        reservation: mapReservationRow(updatedRes[0]),
        loan: mapLoanRow(createdLoan[0]),
      };
    });
  }

  /**
   * Sweeps and processes all expired pickup reservations.
   * Reassigns staged physical copies to next FIFO candidates or returns them to shelf inventory.
   */
  static async processExpiredReservations(
    actorContext: ActorContext,
    tenantId = 'default-library'
  ): Promise<{ processedCount: number; expiredIds: string[] }> {
    return await withTransaction(async (conn) => {
      const [expiredRows] = await conn.query<any[]>(
        "SELECT * FROM reservations WHERE tenant_id = ? AND status = 'READY_FOR_PICKUP' AND expires_at <= NOW() FOR UPDATE",
        [tenantId]
      );

      if (!expiredRows || expiredRows.length === 0) {
        return { processedCount: 0, expiredIds: [] };
      }

      const expiredIds: string[] = [];

      for (const row of expiredRows) {
        const res = mapReservationRow(row);
        expiredIds.push(res.id);

        // Mark EXPIRED
        await conn.query(
          "UPDATE reservations SET status = 'EXPIRED', updated_at = NOW() WHERE id = ?",
          [res.id]
        );

        // Decrement member reservation count
        await conn.query(
          'UPDATE members SET reservation_count = GREATEST(0, reservation_count - 1), updated_at = NOW() WHERE id = ?',
          [res.memberId]
        );

        // Check if another waiting hold exists for this book title
        if (res.assignedCopyId) {
          const [nextWaiting] = await conn.query<any[]>(
            "SELECT * FROM reservations WHERE tenant_id = ? AND book_id = ? AND status = 'WAITING' ORDER BY queue_position ASC, created_at ASC LIMIT 1 FOR UPDATE",
            [tenantId, res.bookId]
          );

          if (nextWaiting && nextWaiting.length > 0) {
            const nextHold = nextWaiting[0];
            const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

            await conn.query(
              `UPDATE reservations SET 
                status = 'READY_FOR_PICKUP',
                assigned_copy_id = ?,
                ready_at = NOW(),
                expires_at = ?,
                updated_at = NOW()
              WHERE id = ?`,
              [res.assignedCopyId, newExpiry, nextHold.id]
            );

            await conn.query(
              `UPDATE book_copies SET 
                current_holder_id = ?,
                current_holder_name = ?,
                updated_at = NOW()
              WHERE id = ?`,
              [nextHold.member_id, nextHold.member_name, res.assignedCopyId]
            );

            // Re-index remaining waiting holds
            await conn.query(
              `UPDATE reservations SET 
                queue_position = GREATEST(1, queue_position - 1),
                updated_at = NOW()
              WHERE tenant_id = ? AND book_id = ? AND status = 'WAITING' AND id != ?`,
              [tenantId, res.bookId, nextHold.id]
            );
          } else {
            // No more waiting holds: copy returns to AVAILABLE
            await conn.query(
              `UPDATE book_copies SET 
                status = 'AVAILABLE',
                current_holder_id = NULL,
                current_holder_name = NULL,
                updated_at = NOW()
              WHERE id = ?`,
              [res.assignedCopyId]
            );

            await conn.query(
              `UPDATE books SET 
                reserved_copies = GREATEST(0, reserved_copies - 1),
                available_copies = available_copies + 1,
                updated_at = NOW()
              WHERE id = ?`,
              [res.bookId]
            );
          }
        }

        // Audit log
        await AuditService.log({
          tenantId,
          actorId: actorContext.actorId,
          actorRole: actorContext.actorRole,
          action: 'RESERVATION_EXPIRED',
          entityType: 'Reservation',
          entityId: res.id,
          oldValue: { status: 'READY_FOR_PICKUP', expiresAt: res.expiresAt },
          newValue: { status: 'EXPIRED' },
          ipAddress: actorContext.ipAddress,
          userAgent: actorContext.userAgent,
        });

        // Notify member that pickup hold expired
        try {
          await NotificationService.notifyReservationExpiring(
            {
              recipientId: res.memberId,
              bookTitle: res.bookTitle || 'Reserved Title',
              reservationNumber: res.reservationNumber,
              reservationId: res.id,
            },
            tenantId,
            conn
          );
        } catch (err) {
          console.error('[NotificationService] Failed to emit reservation expiring alert:', err);
        }
      }

      return { processedCount: expiredIds.length, expiredIds };
    });
  }

  /**
   * Retrieves a paginated list of reservations for staff with filtering and sorting.
   */
  static async listReservations(
    filters: ReservationListFilters,
    tenantId = 'default-library'
  ): Promise<{
    items: ReservationEntity[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const pool = getPool();
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['r.tenant_id = ?'];
    const queryParams: any[] = [tenantId];

    if (filters.search && filters.search.trim().length > 0) {
      const searchClean = `%${filters.search.trim()}%`;
      whereClauses.push(
        '(r.reservation_number LIKE ? OR r.member_name LIKE ? OR r.book_title LIKE ?)'
      );
      queryParams.push(searchClean, searchClean, searchClean);
    }

    if (filters.status) {
      whereClauses.push('r.status = ?');
      queryParams.push(filters.status);
    }

    if (filters.bookId) {
      whereClauses.push('r.book_id = ?');
      queryParams.push(filters.bookId);
    }

    if (filters.memberId) {
      whereClauses.push('r.member_id = ?');
      queryParams.push(filters.memberId);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countSql = `SELECT COUNT(*) AS total FROM reservations r ${whereSql}`;
    const [countRows] = await pool.query<any[]>(countSql, queryParams);
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;

    const sortClause = filters.sortBy && RESERVATION_SORT_WHITELIST[filters.sortBy]
      ? RESERVATION_SORT_WHITELIST[filters.sortBy]
      : 'r.created_at DESC';

    const dataSql = `SELECT r.* FROM reservations r ${whereSql} ORDER BY ${sortClause} LIMIT ? OFFSET ?`;
    const [rows] = await pool.query<any[]>(dataSql, [...queryParams, limit, offset]);

    return {
      items: (rows || []).map(mapReservationRow),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Retrieves single reservation by ID with member ownership verification.
   */
  static async getReservationById(
    reservationId: string,
    actorContext: { role: string; userId: string; memberId?: string },
    tenantId = 'default-library'
  ): Promise<ReservationEntity> {
    const pool = getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM reservations WHERE tenant_id = ? AND id = ? LIMIT 1',
      [tenantId, reservationId]
    );

    if (!rows || rows.length === 0) {
      throw ApiError.notFound(`Reservation with ID "${reservationId}" was not found.`, 'RESERVATION_NOT_FOUND');
    }

    const res = mapReservationRow(rows[0]);

    if (actorContext.role === 'MEMBER') {
      const isOwner =
        res.memberId === actorContext.memberId ||
        res.memberId === actorContext.userId;
      if (!isOwner) {
        throw ApiError.forbidden(
          'Access forbidden: Members may only inspect their own reservation records.',
          'MEMBER_ACCESS_DENIED'
        );
      }
    }

    return res;
  }
}
