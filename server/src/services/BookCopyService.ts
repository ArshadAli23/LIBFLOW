/**
 * LIBFLOW — BookCopy Service (Physical Asset Lifecycle)
 * 
 * CORE RESPONSIBILITIES:
 * - Physical asset tracking (serialized BookCopy entities).
 * - Enforcing unique barcode constraints per tenant.
 * - Transactional copy addition with automatic book counter synchronization.
 * - Strict circulation protection: disallow direct manual bypass of borrow/reserve states.
 * - Safe copy withdrawal with active loan & active reservation guards.
 * - Immutable copy timeline recording (book_copy_events).
 */

import crypto from 'node:crypto';
import { getPool, withTransaction } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { AuditService } from './AuditService.js';
import {
  mapBookCopyRow,
  mapBookCopyEventRow,
  type BookCopyEntity,
  type BookCopyEventEntity,
  type CopyCondition,
  type CopyStatus,
} from '../models/BookCopy.js';

export interface AddCopyInput {
  barcode: string;
  copyCode?: string | null;
  shelf: string;
  location?: string;
  conditionRating?: CopyCondition;
  acquisitionCost?: number | null;
  notes?: string | null;
  tenantId?: string;
}

export interface UpdateCopyInput {
  shelf?: string;
  location?: string;
  conditionRating?: CopyCondition;
  notes?: string | null;
  status?: CopyStatus;
}

export interface SanitizedBookCopyDetail {
  id: string;
  bookId: string;
  copyNumber: number;
  copyCode?: string | null;
  barcode: string;
  shelf: string;
  location: string;
  conditionRating: CopyCondition;
  status: CopyStatus;
  isAvailable: boolean;
  timeline?: BookCopyEventEntity[];
}

export class BookCopyService {
  /**
   * Retrieves a single physical copy by ID with role-aware data sanitization.
   */
  static async getCopyById(
    id: string,
    userRole: string,
    tenantId = 'default-library'
  ): Promise<BookCopyEntity | SanitizedBookCopyDetail> {
    const pool = getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM book_copies WHERE tenant_id = ? AND id = ? LIMIT 1',
      [tenantId, id]
    );

    if (!rows || rows.length === 0) {
      throw ApiError.notFound(`Physical copy with ID "${id}" was not found.`, 'COPY_NOT_FOUND');
    }

    const copy = mapBookCopyRow(rows[0]);

    // Fetch copy events timeline
    const [eventRows] = await pool.query<any[]>(
      'SELECT * FROM book_copy_events WHERE tenant_id = ? AND copy_id = ? ORDER BY created_at ASC',
      [tenantId, id]
    );
    const timeline = (eventRows || []).map(mapBookCopyEventRow);

    // If patron (MEMBER), redact administrative fields (cost, notes, holder identities)
    if (userRole === 'MEMBER') {
      return {
        id: copy.id,
        bookId: copy.bookId,
        copyNumber: copy.copyNumber,
        copyCode: copy.copyCode,
        barcode: copy.barcode,
        shelf: copy.shelf,
        location: copy.location,
        conditionRating: copy.conditionRating,
        status: copy.status,
        isAvailable: copy.status === 'AVAILABLE',
      };
    }

    return {
      ...copy,
      timeline,
    } as BookCopyEntity & { timeline: BookCopyEventEntity[] };
  }

  /**
   * Adds a new physical copy to a book transactionally.
   * Updates book copy counts and writes an immutable ACQUIRED lifecycle event.
   */
  static async addCopy(
    bookId: string,
    input: AddCopyInput,
    actorContext: { actorId: string; actorRole: string; fullName: string; ipAddress?: string; userAgent?: string }
  ): Promise<BookCopyEntity> {
    const tenantId = input.tenantId || 'default-library';
    const cleanBarcode = input.barcode.trim();

    return await withTransaction(async (conn) => {
      // 1. Verify book exists and lock row for counter update
      const [bookRows] = await conn.query<any[]>(
        'SELECT id, total_copies, available_copies FROM books WHERE tenant_id = ? AND id = ? FOR UPDATE',
        [tenantId, bookId]
      );

      if (!bookRows || bookRows.length === 0) {
        throw ApiError.notFound(`Book with ID "${bookId}" was not found.`, 'BOOK_NOT_FOUND');
      }

      // 2. Enforce unique barcode constraint
      const [existingBarcode] = await conn.query<any[]>(
        'SELECT id FROM book_copies WHERE tenant_id = ? AND barcode = ? LIMIT 1',
        [tenantId, cleanBarcode]
      );

      if (existingBarcode && existingBarcode.length > 0) {
        throw ApiError.conflict(
          `A physical copy with barcode "${cleanBarcode}" already exists in the inventory.`,
          'DUPLICATE_BARCODE'
        );
      }

      // 3. Determine next copy number for this bibliographic title
      const [copyNumRows] = await conn.query<any[]>(
        'SELECT COALESCE(MAX(copy_number), 0) + 1 AS next_copy_num FROM book_copies WHERE tenant_id = ? AND book_id = ?',
        [tenantId, bookId]
      );
      const nextCopyNumber = Number(copyNumRows[0]?.next_copy_num || 1);

      // 4. Insert physical copy record
      const copyId = `copy_${crypto.randomUUID()}`;
      const shelf = input.shelf.trim();
      const location = input.location ? input.location.trim() : 'Central University Library';
      const conditionRating = input.conditionRating || 'GOOD';
      const acquisitionCost = input.acquisitionCost !== undefined && input.acquisitionCost !== null ? Number(input.acquisitionCost) : null;
      const notes = input.notes ? input.notes.trim() : null;
      const copyCode = input.copyCode ? input.copyCode.trim() : cleanBarcode;

      await conn.query(
        `INSERT INTO book_copies (
          id, tenant_id, book_id, copy_number, copy_code, barcode, shelf,
          location, condition_rating, status, acquisition_date, acquisition_cost,
          notes, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, 'AVAILABLE', NOW(), ?,
          ?, NOW(), NOW()
        )`,
        [
          copyId,
          tenantId,
          bookId,
          nextCopyNumber,
          copyCode,
          cleanBarcode,
          shelf,
          location,
          conditionRating,
          acquisitionCost,
          notes,
        ]
      );

      // 5. Update book totals transactionally
      await conn.query(
        `UPDATE books SET 
          total_copies = total_copies + 1,
          available_copies = available_copies + 1,
          updated_at = NOW()
        WHERE id = ?`,
        [bookId]
      );

      // 6. Record copy lifecycle event
      const eventId = `ev_${crypto.randomUUID()}`;
      await conn.query(
        `INSERT INTO book_copy_events (
          id, tenant_id, copy_id, event, actor, note, created_at
        ) VALUES (?, ?, ?, 'ACQUIRED', ?, ?, NOW())`,
        [eventId, tenantId, copyId, actorContext.fullName, `Acquired and accessioned with barcode ${cleanBarcode}`]
      );

      // 7. Record enterprise audit log
      await AuditService.log({
        tenantId,
        actorId: actorContext.actorId,
        actorRole: actorContext.actorRole,
        action: 'COPY_ACQUIRED',
        entityType: 'BookCopy',
        entityId: copyId,
        newValue: { bookId, barcode: cleanBarcode, copyNumber: nextCopyNumber, shelf },
        ipAddress: actorContext.ipAddress,
        userAgent: actorContext.userAgent,
      });

      // 8. Fetch newly created copy
      const [newCopyRows] = await conn.query<any[]>(
        'SELECT * FROM book_copies WHERE id = ? LIMIT 1',
        [copyId]
      );

      return mapBookCopyRow(newCopyRows[0]);
    });
  }

  /**
   * Updates allowed copy metadata.
   * Protects circulation state invariants (BORROWED / RESERVED bypass is blocked).
   */
  static async updateCopy(
    id: string,
    updates: UpdateCopyInput,
    actorContext: { actorId: string; actorRole: string; fullName: string; ipAddress?: string; userAgent?: string },
    tenantId = 'default-library'
  ): Promise<BookCopyEntity> {
    return await withTransaction(async (conn) => {
      // 1. Fetch copy with row-level lock
      const [copyRows] = await conn.query<any[]>(
        'SELECT * FROM book_copies WHERE tenant_id = ? AND id = ? FOR UPDATE',
        [tenantId, id]
      );

      if (!copyRows || copyRows.length === 0) {
        throw ApiError.notFound(`Physical copy with ID "${id}" was not found.`, 'COPY_NOT_FOUND');
      }

      const currentCopy = mapBookCopyRow(copyRows[0]);

      // 2. CIRCULATION STATE PROTECTION GUARDS
      if (updates.status !== undefined && updates.status !== currentCopy.status) {
        const targetStatus = updates.status;

        // Banned manual transitions: cannot directly set to BORROWED or RESERVED
        if (targetStatus === 'BORROWED' || targetStatus === 'RESERVED') {
          throw ApiError.badRequest(
            `Status "${targetStatus}" can only be assigned through the circulation engine (checkout or reservation fulfillment).`,
            'CIRCULATION_BYPASS_PROHIBITED'
          );
        }

        // Active circulation lock: cannot manually change status of a currently checked-out or reserved copy
        if (currentCopy.status === 'BORROWED') {
          throw ApiError.badRequest(
            'Cannot modify status of a copy that is currently BORROWED. Check in the copy at the circulation desk first.',
            'COPY_CURRENTLY_BORROWED'
          );
        }

        if (currentCopy.status === 'RESERVED') {
          throw ApiError.badRequest(
            'Cannot modify status of a copy that is currently RESERVED for a patron pickup hold.',
            'COPY_CURRENTLY_RESERVED'
          );
        }

        // Adjust book available_copies if moving between AVAILABLE and non-available inventory states
        if (currentCopy.status === 'AVAILABLE' && ['MAINTENANCE', 'LOST', 'DAMAGED'].includes(targetStatus)) {
          await conn.query(
            'UPDATE books SET available_copies = GREATEST(0, available_copies - 1), updated_at = NOW() WHERE id = ?',
            [currentCopy.bookId]
          );
        } else if (['MAINTENANCE', 'LOST', 'DAMAGED'].includes(currentCopy.status) && targetStatus === 'AVAILABLE') {
          await conn.query(
            'UPDATE books SET available_copies = available_copies + 1, updated_at = NOW() WHERE id = ?',
            [currentCopy.bookId]
          );
        }

        // Log status change lifecycle event
        const eventId = `ev_${crypto.randomUUID()}`;
        const lifecycleEvent = targetStatus === 'MAINTENANCE' ? 'MAINTENANCE' : 'AVAILABLE';
        await conn.query(
          `INSERT INTO book_copy_events (id, tenant_id, copy_id, event, actor, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [eventId, tenantId, id, lifecycleEvent, actorContext.fullName, `Status transitioned from ${currentCopy.status} to ${targetStatus}`]
        );
      }

      // 3. Apply updates to book_copies table
      const fields: string[] = [];
      const params: any[] = [];

      if (updates.shelf !== undefined) {
        fields.push('shelf = ?');
        params.push(updates.shelf.trim());
      }
      if (updates.location !== undefined) {
        fields.push('location = ?');
        params.push(updates.location.trim());
      }
      if (updates.conditionRating !== undefined) {
        fields.push('condition_rating = ?');
        params.push(updates.conditionRating);
      }
      if (updates.notes !== undefined) {
        fields.push('notes = ?');
        params.push(updates.notes ? updates.notes.trim() : null);
      }
      if (updates.status !== undefined) {
        fields.push('status = ?');
        params.push(updates.status);
      }

      if (fields.length > 0) {
        fields.push('updated_at = NOW()');
        params.push(tenantId, id);
        await conn.query(`UPDATE book_copies SET ${fields.join(', ')} WHERE tenant_id = ? AND id = ?`, params);
      }

      // 4. Record audit log
      await AuditService.log({
        tenantId,
        actorId: actorContext.actorId,
        actorRole: actorContext.actorRole,
        action: 'COPY_UPDATED',
        entityType: 'BookCopy',
        entityId: id,
        oldValue: { shelf: currentCopy.shelf, condition: currentCopy.conditionRating, status: currentCopy.status },
        newValue: { ...updates },
        ipAddress: actorContext.ipAddress,
        userAgent: actorContext.userAgent,
      });

      const [updatedRows] = await conn.query<any[]>(
        'SELECT * FROM book_copies WHERE id = ? LIMIT 1',
        [id]
      );

      return mapBookCopyRow(updatedRows[0]);
    });
  }

  /**
   * Safely withdraws a physical copy from circulation.
   * Guarantees that copies with active loans or pending reservation holds cannot be withdrawn.
   */
  static async withdrawCopy(
    id: string,
    reason: string,
    actorContext: { actorId: string; actorRole: string; fullName: string; ipAddress?: string; userAgent?: string },
    tenantId = 'default-library'
  ): Promise<BookCopyEntity> {
    const cleanReason = (reason || '').trim();
    if (!cleanReason) {
      throw ApiError.badRequest('A non-empty withdrawal justification reason is required.', 'WITHDRAWAL_REASON_REQUIRED');
    }

    return await withTransaction(async (conn) => {
      // 1. Fetch copy with lock
      const [copyRows] = await conn.query<any[]>(
        'SELECT * FROM book_copies WHERE tenant_id = ? AND id = ? FOR UPDATE',
        [tenantId, id]
      );

      if (!copyRows || copyRows.length === 0) {
        throw ApiError.notFound(`Physical copy with ID "${id}" was not found.`, 'COPY_NOT_FOUND');
      }

      const copy = mapBookCopyRow(copyRows[0]);

      if (copy.status === 'WITHDRAWN') {
        throw ApiError.badRequest('This physical copy has already been deaccessioned / withdrawn.', 'COPY_ALREADY_WITHDRAWN');
      }

      // 2. Active Loan Guard
      if (copy.status === 'BORROWED') {
        throw ApiError.badRequest(
          'Cannot withdraw a physical copy that is currently BORROWED on an active loan.',
          'COPY_HAS_ACTIVE_LOAN'
        );
      }

      const [activeLoans] = await conn.query<any[]>(
        "SELECT id FROM loans WHERE tenant_id = ? AND book_copy_id = ? AND status IN ('ACTIVE', 'OVERDUE') LIMIT 1",
        [tenantId, id]
      );

      if (activeLoans && activeLoans.length > 0) {
        throw ApiError.badRequest(
          'Cannot withdraw a physical copy associated with an active or overdue loan transaction.',
          'COPY_HAS_ACTIVE_LOAN'
        );
      }

      // 3. Active Reservation Hold Guard
      if (copy.status === 'RESERVED') {
        throw ApiError.badRequest(
          'Cannot withdraw a physical copy that is currently RESERVED for a patron hold pickup.',
          'COPY_HAS_ACTIVE_RESERVATION'
        );
      }

      const [activeHolds] = await conn.query<any[]>(
        "SELECT id FROM reservations WHERE tenant_id = ? AND assigned_copy_id = ? AND status = 'READY_FOR_PICKUP' LIMIT 1",
        [tenantId, id]
      );

      if (activeHolds && activeHolds.length > 0) {
        throw ApiError.badRequest(
          'Cannot withdraw a physical copy currently staged for an active reservation pickup.',
          'COPY_HAS_ACTIVE_RESERVATION'
        );
      }

      // 4. Update book counters
      if (copy.status === 'AVAILABLE') {
        await conn.query(
          `UPDATE books SET 
            total_copies = GREATEST(0, total_copies - 1),
            available_copies = GREATEST(0, available_copies - 1),
            updated_at = NOW()
          WHERE id = ?`,
          [copy.bookId]
        );
      } else {
        await conn.query(
          `UPDATE books SET 
            total_copies = GREATEST(0, total_copies - 1),
            updated_at = NOW()
          WHERE id = ?`,
          [copy.bookId]
        );
      }

      // 5. Update copy status to WITHDRAWN
      const updatedNotes = copy.notes ? `${copy.notes} [Withdrawn: ${cleanReason}]` : `[Withdrawn: ${cleanReason}]`;
      await conn.query(
        "UPDATE book_copies SET status = 'WITHDRAWN', notes = ?, updated_at = NOW() WHERE id = ?",
        [updatedNotes, id]
      );

      // 6. Record WITHDRAWN event in book_copy_events
      const eventId = `ev_${crypto.randomUUID()}`;
      await conn.query(
        `INSERT INTO book_copy_events (id, tenant_id, copy_id, event, actor, note, created_at)
         VALUES (?, ?, ?, 'WITHDRAWN', ?, ?, NOW())`,
        [eventId, tenantId, id, actorContext.fullName, cleanReason]
      );

      // 7. Record immutable audit log
      await AuditService.log({
        tenantId,
        actorId: actorContext.actorId,
        actorRole: actorContext.actorRole,
        action: 'COPY_WITHDRAWN',
        entityType: 'BookCopy',
        entityId: id,
        oldValue: { status: copy.status, barcode: copy.barcode },
        newValue: { status: 'WITHDRAWN', reason: cleanReason },
        ipAddress: actorContext.ipAddress,
        userAgent: actorContext.userAgent,
      });

      const [withdrawnRows] = await conn.query<any[]>(
        'SELECT * FROM book_copies WHERE id = ? LIMIT 1',
        [id]
      );

      return mapBookCopyRow(withdrawnRows[0]);
    });
  }
}
