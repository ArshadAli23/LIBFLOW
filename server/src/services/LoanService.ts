/**
 * LIBFLOW — Loan Service (Circulation & Physical Asset Lending)
 * 
 * CORE RESPONSIBILITIES:
 * - Lending lifecycle: checkout, renewal, and return.
 * - Strict eligibility guards: active member status, quota ceilings, and overdue restrictions.
 * - Multi-table transactional consistency with pessimistic row locking (FOR UPDATE).
 * - Automatic overdue fine calculation upon return via FineService.
 * - Integration with reservation queue: automatically stages copy for next waiting hold on return.
 * - Zero-trust data isolation: patrons cannot inspect or tamper with other patrons' loans.
 */

import crypto from 'node:crypto';
import { getPool, withTransaction } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { AuditService } from './AuditService.js';
import { FineService } from './FineService.js';
import { NotificationService } from './NotificationService.js';
import { mapLoanRow, type LoanEntity, type LoanStatus } from '../models/Loan.js';
import { mapMemberRow, type MemberEntity } from '../models/Member.js';
import { mapBookCopyRow, type BookCopyEntity } from '../models/BookCopy.js';
import { mapBookRow, type BookEntity } from '../models/Book.js';

export interface CheckoutInput {
  memberId: string;       // PK id, institutional member_id, or member_barcode
  bookCopyId: string;     // PK id or copy barcode
  borrowDurationDays?: number;
  notes?: string;
  tenantId?: string;
}

export interface LoanListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: LoanStatus;
  memberId?: string;
  bookId?: string;
  bookCopyId?: string;
  overdueOnly?: boolean;
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

const LOAN_SORT_WHITELIST: Record<string, string> = {
  checkout_desc: 'l.checkout_date DESC',
  checkout_asc: 'l.checkout_date ASC',
  due_asc: 'l.due_date ASC',
  due_desc: 'l.due_date DESC',
  return_desc: 'l.return_date DESC',
};

export class LoanService {
  /**
   * Checks out an available physical copy to an eligible library member.
   * Orchestrated within a strict MySQL transaction with row-level locks.
   */
  static async checkout(
    input: CheckoutInput,
    actorContext: ActorContext,
    tenantId = 'default-library'
  ): Promise<LoanEntity> {
    const borrowDays = Math.max(1, input.borrowDurationDays || 14);

    return await withTransaction(async (conn) => {
      // 1. Resolve and lock Member record
      const [memberRows] = await conn.query<any[]>(
        'SELECT * FROM members WHERE tenant_id = ? AND (id = ? OR member_id = ? OR user_id = ?) LIMIT 1 FOR UPDATE',
        [tenantId, input.memberId, input.memberId, input.memberId]
      );

      if (!memberRows || memberRows.length === 0) {
        throw ApiError.notFound(
          `Member with identifier "${input.memberId}" was not found.`,
          'MEMBER_NOT_FOUND'
        );
      }

      const member = mapMemberRow(memberRows[0]);

      // 1b. Member Eligibility Checks
      if (member.status !== 'ACTIVE') {
        throw ApiError.forbidden(
          `Member account is currently ${member.status}. Circulation privileges are suspended.`,
          'MEMBER_INACTIVE'
        );
      }

      if (member.hasOverdueRestrictions) {
        throw ApiError.forbidden(
          'Circulation blocked: Member has active overdue restriction on their account.',
          'MEMBER_OVERDUE_RESTRICTION'
        );
      }

      if (member.activeLoansCount >= member.maxBorrowLimit) {
        throw ApiError.badRequest(
          `Borrowing limit exceeded: Member has reached their maximum limit of ${member.maxBorrowLimit} books.`,
          'MAX_BORROW_LIMIT_EXCEEDED'
        );
      }

      // 2. Resolve and lock BookCopy record
      const [copyRows] = await conn.query<any[]>(
        'SELECT * FROM book_copies WHERE tenant_id = ? AND (id = ? OR barcode = ?) LIMIT 1 FOR UPDATE',
        [tenantId, input.bookCopyId, input.bookCopyId]
      );

      if (!copyRows || copyRows.length === 0) {
        throw ApiError.notFound(
          `Physical copy with identifier "${input.bookCopyId}" was not found.`,
          'COPY_NOT_FOUND'
        );
      }

      const copy = mapBookCopyRow(copyRows[0]);

      // 2b. Check if this copy is reserved
      let matchingReservationId: string | null = null;
      if (copy.status === 'RESERVED') {
        // If reserved, it can ONLY be checked out by the member it is staged for!
        const [resRows] = await conn.query<any[]>(
          "SELECT id, member_id FROM reservations WHERE tenant_id = ? AND assigned_copy_id = ? AND status = 'READY_FOR_PICKUP' LIMIT 1 FOR UPDATE",
          [tenantId, copy.id]
        );

        if (!resRows || resRows.length === 0 || resRows[0].member_id !== member.id) {
          throw ApiError.conflict(
            'This physical copy is currently staged for another patron pickup reservation.',
            'COPY_RESERVED_FOR_ANOTHER_PATRON'
          );
        }

        matchingReservationId = resRows[0].id;
      } else if (copy.status !== 'AVAILABLE') {
        throw ApiError.conflict(
          `Cannot checkout physical copy: Current inventory status is "${copy.status}".`,
          'COPY_NOT_AVAILABLE'
        );
      }

      // 2c. Check for active loan collision on this exact physical copy
      const [activeLoanRows] = await conn.query<any[]>(
        "SELECT id FROM loans WHERE tenant_id = ? AND book_copy_id = ? AND status IN ('ACTIVE', 'OVERDUE') LIMIT 1 FOR UPDATE",
        [tenantId, copy.id]
      );

      if (activeLoanRows && activeLoanRows.length > 0) {
        throw ApiError.conflict(
          'This physical copy is already bound to an active or overdue loan transaction.',
          'COPY_ALREADY_LOANED'
        );
      }

      // 3. Lock bibliographic master book record
      const [bookRows] = await conn.query<any[]>(
        'SELECT * FROM books WHERE tenant_id = ? AND id = ? LIMIT 1 FOR UPDATE',
        [tenantId, copy.bookId]
      );

      if (!bookRows || bookRows.length === 0) {
        throw ApiError.notFound('Parent bibliographic book record not found.', 'BOOK_NOT_FOUND');
      }

      const book = mapBookRow(bookRows[0]);

      // 4. Calculate due date
      const checkoutDate = new Date();
      const dueDate = new Date(checkoutDate.getTime() + borrowDays * 24 * 60 * 60 * 1000);

      // 5. Insert new loan
      const loanId = `loan_${crypto.randomUUID()}`;
      const loanNumber = `LN-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      await conn.query(
        `INSERT INTO loans (
          id, tenant_id, loan_number, member_id, member_barcode, member_name, member_email,
          book_id, book_title, book_copy_id, copy_barcode, copy_shelf, checkout_date,
          due_date, status, renewal_count, max_renewals, issued_by, fine_calculated,
          notes, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, 'ACTIVE', 0, 2, ?, 0.00,
          ?, NOW(), NOW()
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
          input.notes || null,
        ]
      );

      // 6. Update physical copy status
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

      // 7. Update parent book counters
      if (copy.status === 'RESERVED') {
        await conn.query(
          `UPDATE books SET 
            reserved_copies = GREATEST(0, reserved_copies - 1),
            borrowed_copies = borrowed_copies + 1,
            times_borrowed = times_borrowed + 1,
            updated_at = NOW()
          WHERE id = ?`,
          [book.id]
        );
      } else {
        await conn.query(
          `UPDATE books SET 
            available_copies = GREATEST(0, available_copies - 1),
            borrowed_copies = borrowed_copies + 1,
            times_borrowed = times_borrowed + 1,
            updated_at = NOW()
          WHERE id = ?`,
          [book.id]
        );
      }

      // 8. Update member circulation counters
      await conn.query(
        `UPDATE members SET 
          active_loans_count = active_loans_count + 1,
          total_books_borrowed = total_books_borrowed + 1,
          last_activity_at = NOW(),
          updated_at = NOW()
        WHERE id = ?`,
        [member.id]
      );

      // 9. If checkout fulfilled a ready pickup reservation, mark it CLAIMED
      if (matchingReservationId) {
        await conn.query(
          "UPDATE reservations SET status = 'CLAIMED', claimed_at = NOW(), updated_at = NOW() WHERE id = ?",
          [matchingReservationId]
        );
        await conn.query(
          'UPDATE members SET reservation_count = GREATEST(0, reservation_count - 1), updated_at = NOW() WHERE id = ?',
          [member.id]
        );
      }

      // 10. Record lifecycle event in book_copy_events
      const eventId = `ev_${crypto.randomUUID()}`;
      await conn.query(
        `INSERT INTO book_copy_events (id, tenant_id, copy_id, event, actor, note, created_at)
         VALUES (?, ?, ?, 'BORROWED', ?, ?, NOW())`,
        [eventId, tenantId, copy.id, actorContext.fullName, `Loan checkout #${loanNumber} to ${member.fullName}`]
      );

      // 11. Audit log
      await AuditService.log({
        tenantId,
        actorId: actorContext.actorId,
        actorRole: actorContext.actorRole,
        action: 'LOAN_CHECKOUT',
        entityType: 'Loan',
        entityId: loanId,
        newValue: { loanNumber, memberId: member.id, bookCopyId: copy.id, dueDate },
        ipAddress: actorContext.ipAddress,
        userAgent: actorContext.userAgent,
      });

      // 12. Send checkout notification to member
      try {
        const recipientId = member.userId || member.id;
        await NotificationService.notifyBookIssued(
          {
            recipientId,
            bookTitle: book.title,
            loanNumber,
            dueDate,
            loanId,
          },
          tenantId,
          conn
        );
      } catch (err) {
        console.error('[NotificationService] Failed to emit checkout alert:', err);
      }

      const [createdRows] = await conn.query<any[]>('SELECT * FROM loans WHERE id = ? LIMIT 1', [loanId]);
      return mapLoanRow(createdRows[0]);
    });
  }

  /**
   * Returns a borrowed book copy, updates counts, evaluates overdue fines,
   * and automatically stages the physical copy for the next waiting reservation hold.
   */
  static async returnLoan(
    loanId: string,
    actorContext: ActorContext,
    tenantId = 'default-library'
  ): Promise<{ loan: LoanEntity; fineAssessed?: number }> {
    return await withTransaction(async (conn) => {
      // 1. Lock Loan row
      const [loanRows] = await conn.query<any[]>(
        'SELECT * FROM loans WHERE tenant_id = ? AND id = ? LIMIT 1 FOR UPDATE',
        [tenantId, loanId]
      );

      if (!loanRows || loanRows.length === 0) {
        throw ApiError.notFound(`Loan with ID "${loanId}" was not found.`, 'LOAN_NOT_FOUND');
      }

      const loan = mapLoanRow(loanRows[0]);

      if (actorContext.actorRole === 'MEMBER') {
        const isOwner =
          loan.memberId === actorContext.memberId ||
          loan.memberId === actorContext.actorId;
        if (!isOwner) {
          throw ApiError.forbidden(
            'Access forbidden: Members may only return their own borrowed loans.',
            'MEMBER_ACCESS_DENIED'
          );
        }
      }

      if (loan.status === 'RETURNED') {
        throw ApiError.badRequest('This loan has already been marked RETURNED.', 'LOAN_ALREADY_RETURNED');
      }

      const returnDate = new Date();

      // 2. Lock physical copy and book
      const [copyRows] = await conn.query<any[]>(
        'SELECT * FROM book_copies WHERE tenant_id = ? AND id = ? LIMIT 1 FOR UPDATE',
        [tenantId, loan.bookCopyId]
      );
      const copy = copyRows && copyRows.length > 0 ? mapBookCopyRow(copyRows[0]) : null;

      // 3. Calculate overdue fines via FineService
      const overdueCalc = FineService.calculateOverdue({
        dueDate: loan.dueDate,
        returnDate,
        gracePeriodDays: 2,
        finePerDay: 5,
        maxFineCap: 200,
      });

      let fineAssessed = 0;
      if (overdueCalc.fineAmount > 0) {
        fineAssessed = overdueCalc.fineAmount;
        const fineId = `fine_${crypto.randomUUID()}`;
        const fineNumber = `FN-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        await conn.query(
          `INSERT INTO fines (
            id, tenant_id, fine_number, member_id, member_barcode, member_name, member_email,
            loan_id, loan_number, book_id, book_title, book_copy_id, copy_barcode,
            reason, status, original_amount, amount_paid, waived_amount, balance,
            days_overdue, fine_per_day, grace_period_days, max_fine_cap, due_date,
            return_date, issued_date, created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            'OVERDUE', 'UNPAID', ?, 0.00, 0.00, ?,
            ?, 5.00, 2, 200.00, ?,
            ?, NOW(), NOW(), NOW()
          )`,
          [
            fineId,
            tenantId,
            fineNumber,
            loan.memberId,
            loan.memberBarcode,
            loan.memberName,
            loan.memberEmail,
            loan.id,
            loan.loanNumber,
            loan.bookId,
            loan.bookTitle,
            loan.bookCopyId,
            loan.copyBarcode,
            fineAssessed,
            fineAssessed,
            overdueCalc.daysOverdue,
            loan.dueDate,
            returnDate,
          ]
        );

        // Update member outstanding fine balance
        await conn.query(
          `UPDATE members SET 
            outstanding_fine = outstanding_fine + ?,
            updated_at = NOW()
          WHERE id = ?`,
          [fineAssessed, loan.memberId]
        );

        try {
          await NotificationService.notifyFineCreated(
            {
              recipientId: loan.memberId,
              fineNumber,
              amount: fineAssessed,
              fineId,
              bookTitle: loan.bookTitle || undefined,
            },
            tenantId,
            conn
          );
        } catch (err) {
          console.error('[NotificationService] Failed to emit fine alert:', err);
        }
      }

      // 4. Update loan status to RETURNED
      await conn.query(
        `UPDATE loans SET 
          status = 'RETURNED',
          return_date = ?,
          returned_to = ?,
          fine_calculated = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [returnDate, actorContext.fullName, fineAssessed, loan.id]
      );

      // 5. Update member active loans count
      await conn.query(
        `UPDATE members SET 
          active_loans_count = GREATEST(0, active_loans_count - 1),
          last_activity_at = NOW(),
          updated_at = NOW()
        WHERE id = ?`,
        [loan.memberId]
      );

      // Check if member has any remaining overdue loans
      const [remainingOverdues] = await conn.query<any[]>(
        "SELECT id FROM loans WHERE tenant_id = ? AND member_id = ? AND status = 'OVERDUE' LIMIT 1",
        [tenantId, loan.memberId]
      );
      if (!remainingOverdues || remainingOverdues.length === 0) {
        await conn.query(
          'UPDATE members SET has_overdue_restrictions = FALSE, updated_at = NOW() WHERE id = ?',
          [loan.memberId]
        );
      }

      // 6. Check for active WAITING reservation holds on this book title (FIFO)
      const [waitingHoldRows] = await conn.query<any[]>(
        "SELECT * FROM reservations WHERE tenant_id = ? AND book_id = ? AND status = 'WAITING' ORDER BY queue_position ASC, created_at ASC LIMIT 1 FOR UPDATE",
        [tenantId, loan.bookId]
      );

      if (waitingHoldRows && waitingHoldRows.length > 0 && copy) {
        // Stage physical copy for the senior reservation candidate!
        const nextHold = waitingHoldRows[0];
        const claimExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48-hour pickup policy

        await conn.query(
          `UPDATE reservations SET 
            status = 'READY_FOR_PICKUP',
            assigned_copy_id = ?,
            ready_at = NOW(),
            expires_at = ?,
            updated_at = NOW()
          WHERE id = ?`,
          [copy.id, claimExpiry, nextHold.id]
        );

        // Copy transitions to RESERVED
        await conn.query(
          `UPDATE book_copies SET 
            status = 'RESERVED',
            current_holder_id = ?,
            current_holder_name = ?,
            borrowed_date = NULL,
            due_date = NULL,
            updated_at = NOW()
          WHERE id = ?`,
          [nextHold.member_id, nextHold.member_name, copy.id]
        );

        // Parent book counts: borrowed decremented, reserved incremented
        await conn.query(
          `UPDATE books SET 
            borrowed_copies = GREATEST(0, borrowed_copies - 1),
            reserved_copies = reserved_copies + 1,
            updated_at = NOW()
          WHERE id = ?`,
          [loan.bookId]
        );

        // Record copy lifecycle event
        const eventId = `ev_${crypto.randomUUID()}`;
        await conn.query(
          `INSERT INTO book_copy_events (id, tenant_id, copy_id, event, actor, note, created_at)
           VALUES (?, ?, ?, 'RESERVED', ?, ?, NOW())`,
          [eventId, tenantId, copy.id, actorContext.fullName, `Staged for pickup hold #${nextHold.reservation_number}`]
        );

        // Re-index remaining waiting queue for this book
        await conn.query(
          `UPDATE reservations SET 
            queue_position = GREATEST(1, queue_position - 1),
            updated_at = NOW()
          WHERE tenant_id = ? AND book_id = ? AND status = 'WAITING' AND id != ?`,
          [tenantId, loan.bookId, nextHold.id]
        );

        try {
          await NotificationService.notifyReservationReady(
            {
              recipientId: nextHold.member_id,
              bookTitle: loan.bookTitle || 'Reserved Title',
              reservationNumber: nextHold.reservation_number,
              reservationId: nextHold.id,
              expiresAt: claimExpiry,
            },
            tenantId,
            conn
          );
        } catch (err) {
          console.error('[NotificationService] Failed to emit reservation ready alert:', err);
        }
      } else if (copy) {
        // No waiting reservations: copy returns to AVAILABLE
        await conn.query(
          `UPDATE book_copies SET 
            status = 'AVAILABLE',
            current_holder_id = NULL,
            current_holder_name = NULL,
            borrowed_date = NULL,
            due_date = NULL,
            updated_at = NOW()
          WHERE id = ?`,
          [copy.id]
        );

        // Parent book counts: borrowed decremented, available incremented
        await conn.query(
          `UPDATE books SET 
            borrowed_copies = GREATEST(0, borrowed_copies - 1),
            available_copies = available_copies + 1,
            updated_at = NOW()
          WHERE id = ?`,
          [loan.bookId]
        );

        // Record copy lifecycle event
        const eventId = `ev_${crypto.randomUUID()}`;
        await conn.query(
          `INSERT INTO book_copy_events (id, tenant_id, copy_id, event, actor, note, created_at)
           VALUES (?, ?, ?, 'RETURNED', ?, 'Item returned to general circulation', NOW())`,
          [eventId, tenantId, copy.id, actorContext.fullName]
        );
      }

      // 7. Audit log
      await AuditService.log({
        tenantId,
        actorId: actorContext.actorId,
        actorRole: actorContext.actorRole,
        action: 'LOAN_RETURNED',
        entityType: 'Loan',
        entityId: loan.id,
        newValue: { returnDate, fineAssessed },
        ipAddress: actorContext.ipAddress,
        userAgent: actorContext.userAgent,
      });

      // 8. Return confirmation notification to member
      try {
        await NotificationService.notifyBookReturned(
          {
            recipientId: loan.memberId,
            bookTitle: loan.bookTitle || 'Book',
            loanNumber: loan.loanNumber,
            loanId: loan.id,
          },
          tenantId,
          conn
        );
      } catch (err) {
        console.error('[NotificationService] Failed to emit return alert:', err);
      }

      const [updatedRows] = await conn.query<any[]>('SELECT * FROM loans WHERE id = ? LIMIT 1', [loan.id]);
      return { loan: mapLoanRow(updatedRows[0]), fineAssessed };
    });
  }

  /**
   * Renews an active loan, enforcing renewal limits and checking reservation hold blocks.
   */
  static async renewLoan(
    loanId: string,
    actorContext: ActorContext,
    tenantId = 'default-library'
  ): Promise<LoanEntity> {
    return await withTransaction(async (conn) => {
      const [loanRows] = await conn.query<any[]>(
        'SELECT * FROM loans WHERE tenant_id = ? AND id = ? LIMIT 1 FOR UPDATE',
        [tenantId, loanId]
      );

      if (!loanRows || loanRows.length === 0) {
        throw ApiError.notFound(`Loan with ID "${loanId}" was not found.`, 'LOAN_NOT_FOUND');
      }

      const loan = mapLoanRow(loanRows[0]);

      // Ownership enforcement: Patrons can only renew their own loan
      if (actorContext.actorRole === 'MEMBER') {
        const isOwner =
          loan.memberId === actorContext.memberId ||
          loan.memberId === actorContext.actorId;
        if (!isOwner) {
          throw ApiError.forbidden('You are not authorized to renew another member’s loan.', 'FORBIDDEN');
        }
      }

      if (loan.status !== 'ACTIVE') {
        throw ApiError.badRequest(
          `Cannot renew loan with status "${loan.status}". Only ACTIVE loans may be renewed.`,
          'INVALID_LOAN_STATUS_FOR_RENEWAL'
        );
      }

      // Overdue check: cannot renew if already past due date
      if (loan.dueDate.getTime() < Date.now()) {
        throw ApiError.badRequest(
          'Cannot renew an overdue loan. Please return the book or consult the circulation desk.',
          'OVERDUE_RENEWAL_DISALLOWED'
        );
      }

      // Renewal limit check
      if (loan.renewalCount >= loan.maxRenewals) {
        throw ApiError.badRequest(
          `Maximum renewal limit of ${loan.maxRenewals} reached for this loan.`,
          'MAX_RENEWALS_REACHED'
        );
      }

      // Reservation block: If other patrons are waiting for this title, renewal is prohibited!
      const [waitingHolds] = await conn.query<any[]>(
        "SELECT id FROM reservations WHERE tenant_id = ? AND book_id = ? AND status = 'WAITING' LIMIT 1",
        [tenantId, loan.bookId]
      );

      if (waitingHolds && waitingHolds.length > 0) {
        throw ApiError.conflict(
          'Cannot renew loan: Other patrons have active reservation holds waiting for this title.',
          'RENEWAL_BLOCKED_BY_RESERVATION'
        );
      }

      // Compute new extended due date (default +14 days from previous due date or from now)
      const baseDate = loan.dueDate.getTime() > Date.now() ? loan.dueDate : new Date();
      const newDueDate = new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000);

      await conn.query(
        `UPDATE loans SET 
          renewal_count = renewal_count + 1,
          due_date = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [newDueDate, loan.id]
      );

      await conn.query(
        'UPDATE book_copies SET due_date = ?, updated_at = NOW() WHERE id = ?',
        [newDueDate, loan.bookCopyId]
      );

      await AuditService.log({
        tenantId,
        actorId: actorContext.actorId,
        actorRole: actorContext.actorRole,
        action: 'LOAN_RENEWED',
        entityType: 'Loan',
        entityId: loan.id,
        newValue: { newDueDate, renewalCount: loan.renewalCount + 1 },
        ipAddress: actorContext.ipAddress,
        userAgent: actorContext.userAgent,
      });

      const [updatedRows] = await conn.query<any[]>('SELECT * FROM loans WHERE id = ? LIMIT 1', [loan.id]);
      return mapLoanRow(updatedRows[0]);
    });
  }

  /**
   * Retrieves a paginated list of loans for staff with filtering and sorting.
   */
  static async listLoans(
    filters: LoanListFilters,
    tenantId = 'default-library'
  ): Promise<{
    items: LoanEntity[];
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

    const whereClauses: string[] = ['l.tenant_id = ?'];
    const queryParams: any[] = [tenantId];

    if (filters.search && filters.search.trim().length > 0) {
      const searchClean = `%${filters.search.trim()}%`;
      whereClauses.push(
        '(l.loan_number LIKE ? OR l.member_name LIKE ? OR l.book_title LIKE ? OR l.copy_barcode LIKE ?)'
      );
      queryParams.push(searchClean, searchClean, searchClean, searchClean);
    }

    if (filters.status) {
      whereClauses.push('l.status = ?');
      queryParams.push(filters.status);
    }

    if (filters.memberId) {
      whereClauses.push('l.member_id = ?');
      queryParams.push(filters.memberId);
    }

    if (filters.bookId) {
      whereClauses.push('l.book_id = ?');
      queryParams.push(filters.bookId);
    }

    if (filters.bookCopyId) {
      whereClauses.push('l.book_copy_id = ?');
      queryParams.push(filters.bookCopyId);
    }

    if (filters.overdueOnly) {
      whereClauses.push("(l.status = 'OVERDUE' OR (l.status = 'ACTIVE' AND l.due_date < NOW()))");
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countSql = `SELECT COUNT(*) AS total FROM loans l ${whereSql}`;
    const [countRows] = await pool.query<any[]>(countSql, queryParams);
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;

    const sortClause = filters.sortBy && LOAN_SORT_WHITELIST[filters.sortBy]
      ? LOAN_SORT_WHITELIST[filters.sortBy]
      : 'l.checkout_date DESC';

    const dataSql = `SELECT l.* FROM loans l ${whereSql} ORDER BY ${sortClause} LIMIT ? OFFSET ?`;
    const [rows] = await pool.query<any[]>(dataSql, [...queryParams, limit, offset]);

    return {
      items: (rows || []).map(mapLoanRow),
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
   * Retrieves single loan record, enforcing member ownership isolation.
   */
  static async getLoanById(
    loanId: string,
    actorContext: { role: string; userId: string; memberId?: string },
    tenantId = 'default-library'
  ): Promise<LoanEntity> {
    const pool = getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM loans WHERE tenant_id = ? AND id = ? LIMIT 1',
      [tenantId, loanId]
    );

    if (!rows || rows.length === 0) {
      throw ApiError.notFound(`Loan with ID "${loanId}" was not found.`, 'LOAN_NOT_FOUND');
    }

    const loan = mapLoanRow(rows[0]);

    if (actorContext.role === 'MEMBER') {
      const isOwner =
        loan.memberId === actorContext.memberId ||
        loan.memberId === actorContext.userId;

      if (!isOwner) {
        throw ApiError.forbidden(
          'Access forbidden: Members may only inspect their own loan records.',
          'MEMBER_ACCESS_DENIED'
        );
      }
    }

    return loan;
  }

  /**
   * Retrieves the authenticated member's own loan records and circulation history.
   */
  static async getMemberLoans(
    memberId: string,
    filters: { status?: LoanStatus; page?: number; limit?: number },
    tenantId = 'default-library'
  ): Promise<{
    items: LoanEntity[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    return await this.listLoans({
      memberId,
      status: filters.status,
      page: filters.page,
      limit: filters.limit,
      tenantId,
    });
  }
}
