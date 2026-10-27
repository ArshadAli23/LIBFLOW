/**
 * LIBFLOW — FineService (Centralized Fine & Penalty Calculation Engine & Ledger)
 * 
 * CORE DOMAIN RULE:
 * - Centralizes all overdue fee calculations, payment allocations, and administrative waivers.
 * - Conforms to the mathematical formula defined in ARCHITECTURE.md Section 5.
 * - Enforces immutable balance ledger arithmetic.
 * - Manages financial transaction tables (fines, fine_payments, fine_waivers) transactionally.
 */

import crypto from 'node:crypto';
import { getPool, withTransaction } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { AuditService } from './AuditService.js';
import { NotificationService } from './NotificationService.js';
import {
  calculateOverdueFine,
  computeFineBalanceAndStatus,
  mapFineRow,
  mapFinePaymentRow,
  mapFineWaiverRow,
  type FineEntity,
  type FinePaymentEntity,
  type FineWaiverEntity,
  type FineStatus,
  type FineReason,
  type FinePaymentMethod,
  type OverdueCalculationParams,
  type OverdueCalculationResult,
} from '../models/Fine.js';

export interface AssessFineInput {
  tenantId?: string;
  memberId: string;
  originalAmount: number;
  reason: FineReason;
  dueDate?: Date;
  returnDate?: Date;
  gracePeriodDays?: number;
  finePerDay?: number;
  maxFineCap?: number;
}

export interface RecordPaymentInput {
  currentOriginalAmount: number;
  currentAmountPaid: number;
  currentWaivedAmount: number;
  paymentAmount: number;
  method: FinePaymentMethod;
  collectedBy: string;
  notes?: string;
}

export interface RecordWaiverInput {
  currentOriginalAmount: number;
  currentAmountPaid: number;
  currentWaivedAmount: number;
  waiverAmount: number;
  waiverReason: string;
  waivedBy: string;
}

export interface FineListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: FineStatus;
  memberId?: string;
  loanId?: string;
  reason?: FineReason;
  unpaidOnly?: boolean;
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

const FINE_SORT_WHITELIST: Record<string, string> = {
  issued_desc: 'f.issued_date DESC',
  issued_asc: 'f.issued_date ASC',
  balance_desc: 'f.balance DESC',
  balance_asc: 'f.balance ASC',
};

export class FineService {
  /**
   * Calculates overdue penalty according to library policy formulas.
   */
  public static calculateOverdue(params: OverdueCalculationParams): OverdueCalculationResult {
    return calculateOverdueFine(params);
  }

  /**
   * Evaluates financial balance and resolved status.
   */
  public static resolveBalanceAndStatus(
    originalAmount: number,
    amountPaid: number,
    waivedAmount: number
  ): { balance: number; status: FineStatus } {
    return computeFineBalanceAndStatus(originalAmount, amountPaid, waivedAmount);
  }

  /**
   * Validates and applies a payment against an existing fine balance.
   */
  public static processPayment(input: RecordPaymentInput): {
    newAmountPaid: number;
    newBalance: number;
    newStatus: FineStatus;
  } {
    if (!Number.isFinite(input.paymentAmount) || input.paymentAmount <= 0) {
      throw new Error('Payment amount must be a positive number greater than zero.');
    }

    const { balance: currentBalance } = this.resolveBalanceAndStatus(
      input.currentOriginalAmount,
      input.currentAmountPaid,
      input.currentWaivedAmount
    );

    if (input.paymentAmount > currentBalance) {
      throw new Error(
        `Payment amount ($${input.paymentAmount.toFixed(2)}) cannot exceed outstanding balance ($${currentBalance.toFixed(2)}).`
      );
    }

    if (!input.collectedBy || input.collectedBy.trim().length === 0) {
      throw new Error('Authorizing collector staff identifier is required.');
    }

    const newAmountPaid = Math.round((input.currentAmountPaid + input.paymentAmount) * 100) / 100;
    const { balance: newBalance, status: newStatus } = this.resolveBalanceAndStatus(
      input.currentOriginalAmount,
      newAmountPaid,
      input.currentWaivedAmount
    );

    return {
      newAmountPaid,
      newBalance,
      newStatus,
    };
  }

  /**
   * Validates and applies an administrative waiver against an existing fine.
   * Every waiver requires an authorizing administrator and non-empty justification.
   */
  public static processWaiver(input: RecordWaiverInput): {
    newWaivedAmount: number;
    newBalance: number;
    newStatus: FineStatus;
  } {
    if (!Number.isFinite(input.waiverAmount) || input.waiverAmount <= 0) {
      throw new Error('Waiver amount must be a positive number greater than zero.');
    }

    if (!input.waiverReason || input.waiverReason.trim().length < 3) {
      throw new Error('An audited waiver justification of at least 3 characters is mandatory.');
    }

    if (!input.waivedBy || input.waivedBy.trim().length === 0) {
      throw new Error('Authorizing administrator identifier is required to waive fines.');
    }

    const { balance: currentBalance } = this.resolveBalanceAndStatus(
      input.currentOriginalAmount,
      input.currentAmountPaid,
      input.currentWaivedAmount
    );

    if (input.waiverAmount > currentBalance) {
      throw new Error(
        `Waiver amount ($${input.waiverAmount.toFixed(2)}) cannot exceed outstanding balance ($${currentBalance.toFixed(2)}).`
      );
    }

    const newWaivedAmount = Math.round((input.currentWaivedAmount + input.waiverAmount) * 100) / 100;
    const { balance: newBalance, status: newStatus } = this.resolveBalanceAndStatus(
      input.currentOriginalAmount,
      input.currentAmountPaid,
      newWaivedAmount
    );

    return {
      newWaivedAmount,
      newBalance,
      newStatus,
    };
  }

  /**
   * Retrieves a paginated list of fine liabilities with search and status filters.
   */
  public static async listFines(
    filters: FineListFilters,
    tenantId = 'default-library'
  ): Promise<{
    items: FineEntity[];
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

    const whereClauses: string[] = ['f.tenant_id = ?'];
    const queryParams: any[] = [tenantId];

    if (filters.search && filters.search.trim().length > 0) {
      const searchClean = `%${filters.search.trim()}%`;
      whereClauses.push(
        '(f.fine_number LIKE ? OR f.member_name LIKE ? OR f.book_title LIKE ? OR f.copy_barcode LIKE ?)'
      );
      queryParams.push(searchClean, searchClean, searchClean, searchClean);
    }

    if (filters.status) {
      whereClauses.push('f.status = ?');
      queryParams.push(filters.status);
    }

    if (filters.memberId) {
      whereClauses.push('f.member_id = ?');
      queryParams.push(filters.memberId);
    }

    if (filters.loanId) {
      whereClauses.push('f.loan_id = ?');
      queryParams.push(filters.loanId);
    }

    if (filters.reason) {
      whereClauses.push('f.reason = ?');
      queryParams.push(filters.reason);
    }

    if (filters.unpaidOnly) {
      whereClauses.push("f.status IN ('UNPAID', 'PARTIALLY_PAID')");
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countSql = `SELECT COUNT(*) AS total FROM fines f ${whereSql}`;
    const [countRows] = await pool.query<any[]>(countSql, queryParams);
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;

    const sortClause = filters.sortBy && FINE_SORT_WHITELIST[filters.sortBy]
      ? FINE_SORT_WHITELIST[filters.sortBy]
      : 'f.issued_date DESC';

    const dataSql = `SELECT f.* FROM fines f ${whereSql} ORDER BY ${sortClause} LIMIT ? OFFSET ?`;
    const [rows] = await pool.query<any[]>(dataSql, [...queryParams, limit, offset]);

    return {
      items: (rows || []).map(mapFineRow),
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
   * Retrieves single fine record with member ownership isolation and payment/waiver breakdown.
   */
  public static async getFineById(
    fineId: string,
    actorContext: { role: string; userId: string; memberId?: string },
    tenantId = 'default-library'
  ): Promise<FineEntity & { payments: FinePaymentEntity[]; waivers: FineWaiverEntity[] }> {
    const pool = getPool();
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM fines WHERE tenant_id = ? AND id = ? LIMIT 1',
      [tenantId, fineId]
    );

    if (!rows || rows.length === 0) {
      throw ApiError.notFound(`Fine with ID "${fineId}" was not found.`, 'FINE_NOT_FOUND');
    }

    const fine = mapFineRow(rows[0]);

    if (actorContext.role === 'MEMBER') {
      const isOwner =
        fine.memberId === actorContext.memberId ||
        fine.memberId === actorContext.userId;
      if (!isOwner) {
        throw ApiError.forbidden(
          'Access forbidden: Members may only inspect their own financial liability records.',
          'MEMBER_ACCESS_DENIED'
        );
      }
    }

    // Fetch payments & waivers history
    const [paymentRows] = await pool.query<any[]>(
      'SELECT * FROM fine_payments WHERE tenant_id = ? AND fine_id = ? ORDER BY paid_at DESC',
      [tenantId, fine.id]
    );

    const [waiverRows] = await pool.query<any[]>(
      'SELECT * FROM fine_waivers WHERE tenant_id = ? AND fine_id = ? ORDER BY waived_at DESC',
      [tenantId, fine.id]
    );

    return {
      ...fine,
      payments: (paymentRows || []).map(mapFinePaymentRow),
      waivers: (waiverRows || []).map(mapFineWaiverRow),
    };
  }

  /**
   * Records a collected payment against an existing fine inside a managed database transaction.
   */
  public static async recordPaymentTransaction(
    fineId: string,
    paymentAmount: number,
    method: FinePaymentMethod,
    actorContext: ActorContext,
    transactionReference?: string,
    notes?: string,
    tenantId = 'default-library'
  ): Promise<FineEntity> {
    if (!paymentAmount || paymentAmount <= 0) {
      throw ApiError.badRequest('Payment amount must be a positive number greater than zero.', 'INVALID_PAYMENT_AMOUNT');
    }

    return await withTransaction(async (conn) => {
      // 1. Lock fine row
      const [fineRows] = await conn.query<any[]>(
        'SELECT * FROM fines WHERE tenant_id = ? AND id = ? LIMIT 1 FOR UPDATE',
        [tenantId, fineId]
      );

      if (!fineRows || fineRows.length === 0) {
        throw ApiError.notFound(`Fine with ID "${fineId}" was not found.`, 'FINE_NOT_FOUND');
      }

      const fine = mapFineRow(fineRows[0]);

      if (actorContext.actorRole === 'MEMBER') {
        const isOwner =
          fine.memberId === actorContext.memberId ||
          fine.memberId === actorContext.actorId;
        if (!isOwner) {
          throw ApiError.forbidden(
            'Access forbidden: Members may only pay their own fine liabilities.',
            'MEMBER_ACCESS_DENIED'
          );
        }
      }

      if (fine.status === 'PAID' || fine.status === 'WAIVED') {
        throw ApiError.badRequest(
          `Cannot apply payment to a fine with status "${fine.status}".`,
          'FINE_ALREADY_RESOLVED'
        );
      }

      let paymentResult;
      try {
        paymentResult = this.processPayment({
          currentOriginalAmount: fine.originalAmount,
          currentAmountPaid: fine.amountPaid,
          currentWaivedAmount: fine.waivedAmount,
          paymentAmount,
          method,
          collectedBy: actorContext.fullName,
          notes,
        });
      } catch (err: any) {
        throw ApiError.badRequest(err.message, 'PAYMENT_ALLOCATION_ERROR');
      }

      // 2. Insert fine payment entry
      const paymentId = `pay_${crypto.randomUUID()}`;
      const paymentNumber = `RCP-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      await conn.query(
        `INSERT INTO fine_payments (
          id, tenant_id, fine_id, payment_number, amount, method,
          transaction_reference, collected_by, paid_at, notes, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, NOW(), ?, NOW()
        )`,
        [
          paymentId,
          tenantId,
          fine.id,
          paymentNumber,
          paymentAmount,
          method,
          transactionReference || null,
          actorContext.fullName,
          notes || null,
        ]
      );

      // 3. Update fine balance and status
      await conn.query(
        `UPDATE fines SET 
          amount_paid = ?,
          balance = ?,
          status = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [paymentResult.newAmountPaid, paymentResult.newBalance, paymentResult.newStatus, fine.id]
      );

      // 4. Update member outstanding balance
      await conn.query(
        `UPDATE members SET 
          outstanding_fine = GREATEST(0, outstanding_fine - ?),
          updated_at = NOW()
        WHERE id = ?`,
        [paymentAmount, fine.memberId]
      );

      // Check if member has any other active restrictions
      const [remainingUnpaidFines] = await conn.query<any[]>(
        "SELECT id FROM fines WHERE tenant_id = ? AND member_id = ? AND status IN ('UNPAID', 'PARTIALLY_PAID') LIMIT 1",
        [tenantId, fine.memberId]
      );

      const [remainingOverdues] = await conn.query<any[]>(
        "SELECT id FROM loans WHERE tenant_id = ? AND member_id = ? AND status = 'OVERDUE' LIMIT 1",
        [tenantId, fine.memberId]
      );

      if ((!remainingUnpaidFines || remainingUnpaidFines.length === 0) && (!remainingOverdues || remainingOverdues.length === 0)) {
        await conn.query(
          'UPDATE members SET has_overdue_restrictions = FALSE, updated_at = NOW() WHERE id = ?',
          [fine.memberId]
        );
      }

      // 5. Audit log
      await AuditService.log({
        tenantId,
        actorId: actorContext.actorId,
        actorRole: actorContext.actorRole,
        action: 'FINE_PAYMENT_COLLECTED',
        entityType: 'Fine',
        entityId: fine.id,
        newValue: { paymentNumber, amount: paymentAmount, method, newBalance: paymentResult.newBalance, newStatus: paymentResult.newStatus },
        ipAddress: actorContext.ipAddress,
        userAgent: actorContext.userAgent,
      });

      // 6. Notify member of payment receipt
      try {
        await NotificationService.notifyFinePaid(
          {
            recipientId: fine.memberId,
            fineNumber: fine.fineNumber,
            amountPaid: paymentAmount,
            remainingBalance: paymentResult.newBalance,
            fineId: fine.id,
          },
          tenantId,
          conn
        );
      } catch (err) {
        console.error('[NotificationService] Failed to emit fine payment alert:', err);
      }

      const [updatedRows] = await conn.query<any[]>('SELECT * FROM fines WHERE id = ? LIMIT 1', [fine.id]);
      return mapFineRow(updatedRows[0]);
    });
  }

  /**
   * Waives an outstanding fine with staff authorization and mandatory justification reason.
   */
  public static async recordWaiverTransaction(
    fineId: string,
    waiverAmount: number,
    waiverReason: string,
    actorContext: ActorContext,
    tenantId = 'default-library'
  ): Promise<FineEntity> {
    if (actorContext.actorRole !== 'ADMIN') {
      throw ApiError.forbidden(
        'Access forbidden: Only system administrators may waive fines.',
        'ADMIN_ROLE_REQUIRED'
      );
    }

    if (!waiverAmount || waiverAmount <= 0) {
      throw ApiError.badRequest('Waiver amount must be a positive number greater than zero.', 'INVALID_WAIVER_AMOUNT');
    }

    if (!waiverReason || waiverReason.trim().length < 3) {
      throw ApiError.badRequest('An audited waiver justification reason (minimum 3 characters) is mandatory.', 'WAIVER_REASON_REQUIRED');
    }

    return await withTransaction(async (conn) => {
      // 1. Lock fine row
      const [fineRows] = await conn.query<any[]>(
        'SELECT * FROM fines WHERE tenant_id = ? AND id = ? LIMIT 1 FOR UPDATE',
        [tenantId, fineId]
      );

      if (!fineRows || fineRows.length === 0) {
        throw ApiError.notFound(`Fine with ID "${fineId}" was not found.`, 'FINE_NOT_FOUND');
      }

      const fine = mapFineRow(fineRows[0]);

      if (fine.status === 'PAID' || fine.status === 'WAIVED') {
        throw ApiError.badRequest(
          `Cannot waive a fine that is already "${fine.status}".`,
          'FINE_ALREADY_RESOLVED'
        );
      }

      let waiverResult;
      try {
        waiverResult = this.processWaiver({
          currentOriginalAmount: fine.originalAmount,
          currentAmountPaid: fine.amountPaid,
          currentWaivedAmount: fine.waivedAmount,
          waiverAmount,
          waiverReason,
          waivedBy: actorContext.fullName,
        });
      } catch (err: any) {
        throw ApiError.badRequest(err.message, 'WAIVER_ALLOCATION_ERROR');
      }

      // 2. Insert fine waiver entry
      const waiverId = `wav_${crypto.randomUUID()}`;
      const waiverNumber = `WAV-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      await conn.query(
        `INSERT INTO fine_waivers (
          id, tenant_id, fine_id, waiver_number, amount, reason,
          waived_by, waived_at, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, NOW(), NOW()
        )`,
        [
          waiverId,
          tenantId,
          fine.id,
          waiverNumber,
          waiverAmount,
          waiverReason.trim(),
          actorContext.fullName,
        ]
      );

      // 3. Update fine balance and status
      await conn.query(
        `UPDATE fines SET 
          waived_amount = ?,
          balance = ?,
          status = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [waiverResult.newWaivedAmount, waiverResult.newBalance, waiverResult.newStatus, fine.id]
      );

      // 4. Update member outstanding balance
      await conn.query(
        `UPDATE members SET 
          outstanding_fine = GREATEST(0, outstanding_fine - ?),
          updated_at = NOW()
        WHERE id = ?`,
        [waiverAmount, fine.memberId]
      );

      // Check remaining restrictions
      const [remainingUnpaidFines] = await conn.query<any[]>(
        "SELECT id FROM fines WHERE tenant_id = ? AND member_id = ? AND status IN ('UNPAID', 'PARTIALLY_PAID') LIMIT 1",
        [tenantId, fine.memberId]
      );

      const [remainingOverdues] = await conn.query<any[]>(
        "SELECT id FROM loans WHERE tenant_id = ? AND member_id = ? AND status = 'OVERDUE' LIMIT 1",
        [tenantId, fine.memberId]
      );

      if ((!remainingUnpaidFines || remainingUnpaidFines.length === 0) && (!remainingOverdues || remainingOverdues.length === 0)) {
        await conn.query(
          'UPDATE members SET has_overdue_restrictions = FALSE, updated_at = NOW() WHERE id = ?',
          [fine.memberId]
        );
      }

      // 5. Audit log
      await AuditService.log({
        tenantId,
        actorId: actorContext.actorId,
        actorRole: actorContext.actorRole,
        action: 'FINE_WAIVED',
        entityType: 'Fine',
        entityId: fine.id,
        newValue: { waiverNumber, amount: waiverAmount, reason: waiverReason.trim(), newBalance: waiverResult.newBalance, newStatus: waiverResult.newStatus },
        ipAddress: actorContext.ipAddress,
        userAgent: actorContext.userAgent,
      });

      // 6. Notify member of waiver
      try {
        await NotificationService.notifyFineWaived(
          {
            recipientId: fine.memberId,
            fineNumber: fine.fineNumber,
            waivedAmount: waiverAmount,
            reason: waiverReason.trim(),
            fineId: fine.id,
          },
          tenantId,
          conn
        );
      } catch (err) {
        console.error('[NotificationService] Failed to emit fine waiver alert:', err);
      }

      const [updatedRows] = await conn.query<any[]>('SELECT * FROM fines WHERE id = ? LIMIT 1', [fine.id]);
      return mapFineRow(updatedRows[0]);
    });
  }
}
