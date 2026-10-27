/**
 * LIBFLOW — Barcode Scan & Physical Asset Identification Service
 * 
 * CORE RESPONSIBILITIES:
 * - Scans and resolves physical barcodes for book copies and member ID cards.
 * - Enforces zero-trust role redaction: patrons cannot inspect administrative costs
 *   or other patrons' borrowing records via barcode scan.
 * - Safely handles unknown, damaged, or withdrawn physical inventory.
 * - Integrates with circulation state without bypassing checkout/return state guards.
 */

import { getPool } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { mapBookCopyRow, type BookCopyEntity } from '../models/BookCopy.js';
import { mapBookRow, type BookEntity } from '../models/Book.js';
import { mapMemberRow, type MemberEntity } from '../models/Member.js';

export interface BarcodeScanContext {
  actorId: string;
  actorRole: string;
  fullName: string;
  memberId?: string;
}

export type ScanType = 'BOOK_COPY' | 'MEMBER';

export interface BookCopyScanResult {
  scanType: 'BOOK_COPY';
  barcode: string;
  copy: {
    id: string;
    bookId: string;
    copyNumber: number;
    copyCode?: string | null;
    barcode: string;
    shelf: string;
    location: string;
    conditionRating: string;
    status: string;
    acquisitionDate: Date;
    acquisitionCost?: number | null;
    notes?: string | null;
  };
  book: {
    id: string;
    isbn: string;
    title: string;
    subtitle?: string | null;
    authors: string[];
    publisher: string;
    publicationYear: number;
    category: string;
    coverUrl?: string | null;
    callNumber?: string | null;
    status: string;
  };
  circulationEligible: boolean;
  activeLoan?: {
    loanId: string;
    loanNumber: string;
    memberId?: string;
    memberName?: string;
    checkoutDate: Date;
    dueDate: Date;
    isOverdue: boolean;
    isBorrowedByYou?: boolean;
  } | null;
  activeReservation?: {
    reservationId: string;
    reservationNumber: string;
    memberName?: string;
    readyAt?: Date | null;
    expiresAt?: Date | null;
    isReservedForYou?: boolean;
  } | null;
  withdrawalNotice?: string | null;
}

export interface MemberCardScanResult {
  scanType: 'MEMBER';
  barcode: string;
  member: {
    id: string;
    memberId: string;
    fullName: string;
    email: string;
    phone?: string;
    memberType: string;
    department: string;
    status: string;
    activeLoansCount: number;
    maxBorrowLimit: number;
    overdueCount: number;
    outstandingFine: number;
    hasOverdueRestrictions: boolean;
  };
  borrowingEligible: boolean;
  ineligibilityReason?: string | null;
}

export type BarcodeScanResult = BookCopyScanResult | MemberCardScanResult;

export class BarcodeService {
  /**
   * Identifies an item or member card by barcode with role-appropriate redaction.
   */
  static async scanBarcode(
    rawBarcode: string,
    actorContext: BarcodeScanContext,
    tenantId = 'default-library'
  ): Promise<BarcodeScanResult> {
    const barcode = rawBarcode.trim();

    // 1. Barcode format validation
    if (!barcode || barcode.length < 2 || barcode.length > 64) {
      throw ApiError.badRequest(
        'Barcode must be a non-empty string between 2 and 64 characters.',
        'INVALID_BARCODE_FORMAT'
      );
    }

    // Defensive injection & syntax validation
    const barcodeRegex = /^[a-zA-Z0-9_\-:\/.#]+$/;
    if (!barcodeRegex.test(barcode)) {
      throw ApiError.badRequest(
        'Barcode contains invalid characters. Only alphanumeric and standard separators (- _ : / . #) are permitted.',
        'INVALID_BARCODE_CHARACTERS'
      );
    }

    const pool = getPool();
    const isStaff = actorContext.actorRole === 'ADMIN' || actorContext.actorRole === 'LIBRARIAN';

    // 2. Step 1: Search book_copies
    const [copyRows] = await pool.query<any[]>(
      `SELECT 
         c.*,
         b.title, b.subtitle, b.authors, b.isbn, b.publisher, b.publication_year,
         b.category, b.call_number, b.cover_url, b.status AS book_status
       FROM book_copies c
       JOIN books b ON c.book_id = b.id
       WHERE c.tenant_id = ? AND (c.barcode = ? OR c.copy_code = ?)
       LIMIT 1`,
      [tenantId, barcode, barcode]
    );

    if (copyRows && copyRows.length > 0) {
      const row = copyRows[0];
      const copy = mapBookCopyRow(row);

      let parsedAuthors: string[] = [];
      try {
        parsedAuthors = typeof row.authors === 'string' ? JSON.parse(row.authors) : row.authors;
      } catch {
        parsedAuthors = [String(row.authors)];
      }

      const book = {
        id: String(row.book_id),
        isbn: String(row.isbn),
        title: String(row.title),
        subtitle: row.subtitle ? String(row.subtitle) : null,
        authors: Array.isArray(parsedAuthors) ? parsedAuthors : [String(parsedAuthors)],
        publisher: String(row.publisher),
        publicationYear: Number(row.publication_year),
        category: String(row.category),
        coverUrl: row.cover_url ? String(row.cover_url) : null,
        callNumber: row.call_number ? String(row.call_number) : null,
        status: String(row.book_status),
      };

      // Check circulation eligibility
      let circulationEligible = copy.status === 'AVAILABLE';
      let withdrawalNotice: string | null = null;

      if (copy.status === 'WITHDRAWN') {
        circulationEligible = false;
        withdrawalNotice = 'This physical copy has been permanently withdrawn from active circulation.';
      } else if (copy.status === 'DAMAGED' || copy.status === 'LOST' || copy.status === 'MAINTENANCE') {
        circulationEligible = false;
        withdrawalNotice = `Physical copy is unavailable due to maintenance/condition status: ${copy.status}.`;
      }

      // Check active loan details if BORROWED
      let activeLoan: BookCopyScanResult['activeLoan'] = null;
      if (copy.status === 'BORROWED') {
        circulationEligible = false;
        const [loanRows] = await pool.query<any[]>(
          `SELECT id, loan_number, member_id, member_name, checkout_date, due_date, status
           FROM loans
           WHERE tenant_id = ? AND book_copy_id = ? AND status IN ('ACTIVE', 'OVERDUE')
           LIMIT 1`,
          [tenantId, copy.id]
        );

        if (loanRows && loanRows.length > 0) {
          const l = loanRows[0];
          const isBorrower =
            actorContext.memberId === l.member_id ||
            actorContext.actorId === l.member_id;

          const isOverdue = new Date(l.due_date).getTime() < Date.now();

          activeLoan = {
            loanId: String(l.id),
            loanNumber: String(l.loan_number),
            memberId: isStaff || isBorrower ? String(l.member_id) : undefined,
            memberName: isStaff || isBorrower ? String(l.member_name) : undefined,
            checkoutDate: new Date(l.checkout_date),
            dueDate: new Date(l.due_date),
            isOverdue,
            isBorrowedByYou: isBorrower,
          };
        }
      }

      // Check active reservation hold if RESERVED
      let activeReservation: BookCopyScanResult['activeReservation'] = null;
      if (copy.status === 'RESERVED') {
        circulationEligible = false;
        const [resRows] = await pool.query<any[]>(
          `SELECT id, reservation_number, member_id, member_name, ready_at, expires_at
           FROM reservations
           WHERE tenant_id = ? AND assigned_copy_id = ? AND status = 'READY_FOR_PICKUP'
           LIMIT 1`,
          [tenantId, copy.id]
        );

        if (resRows && resRows.length > 0) {
          const r = resRows[0];
          const isReserver =
            actorContext.memberId === r.member_id ||
            actorContext.actorId === r.member_id;

          activeReservation = {
            reservationId: String(r.id),
            reservationNumber: String(r.reservation_number),
            memberName: isStaff || isReserver ? String(r.member_name) : undefined,
            readyAt: r.ready_at ? new Date(r.ready_at) : null,
            expiresAt: r.expires_at ? new Date(r.expires_at) : null,
            isReservedForYou: isReserver,
          };
        }
      }

      return {
        scanType: 'BOOK_COPY',
        barcode: copy.barcode,
        copy: {
          id: copy.id,
          bookId: copy.bookId,
          copyNumber: copy.copyNumber,
          copyCode: copy.copyCode,
          barcode: copy.barcode,
          shelf: copy.shelf,
          location: copy.location,
          conditionRating: copy.conditionRating,
          status: copy.status,
          acquisitionDate: copy.acquisitionDate,
          // Redact cost & internal notes for patrons
          acquisitionCost: isStaff ? copy.acquisitionCost : undefined,
          notes: isStaff ? copy.notes : undefined,
        },
        book,
        circulationEligible,
        activeLoan,
        activeReservation,
        withdrawalNotice,
      };
    }

    // 3. Step 2: Search members table (member card scan)
    const [memberRows] = await pool.query<any[]>(
      `SELECT * FROM members 
       WHERE tenant_id = ? AND (member_id = ? OR id = ?)
       LIMIT 1`,
      [tenantId, barcode, barcode]
    );

    if (memberRows && memberRows.length > 0) {
      const member = mapMemberRow(memberRows[0]);

      // Zero-trust verification: Patrons can ONLY scan their own member card
      if (!isStaff) {
        const isSelf =
          actorContext.memberId === member.id ||
          actorContext.actorId === member.userId ||
          actorContext.actorId === member.id;

        if (!isSelf) {
          throw ApiError.forbidden(
            'Access forbidden: Members may not inspect or scan other patrons’ library cards.',
            'MEMBER_ACCESS_DENIED'
          );
        }
      }

      // Evaluate borrowing eligibility
      let borrowingEligible = true;
      let ineligibilityReason: string | null = null;

      if (member.status !== 'ACTIVE') {
        borrowingEligible = false;
        ineligibilityReason = `Member account is ${member.status}.`;
      } else if (member.hasOverdueRestrictions) {
        borrowingEligible = false;
        ineligibilityReason = 'Member has active overdue restrictions on their profile.';
      } else if (member.activeLoansCount >= member.maxBorrowLimit) {
        borrowingEligible = false;
        ineligibilityReason = `Active loan quota reached (${member.activeLoansCount}/${member.maxBorrowLimit}).`;
      } else if (member.outstandingFine > 0) {
        borrowingEligible = false;
        ineligibilityReason = `Outstanding fines must be cleared (Balance: ₹${member.outstandingFine.toFixed(2)}).`;
      }

      return {
        scanType: 'MEMBER',
        barcode: member.memberId,
        member: {
          id: member.id,
          memberId: member.memberId,
          fullName: member.fullName,
          email: member.email,
          phone: isStaff ? member.phone : undefined,
          memberType: member.memberType,
          department: member.department,
          status: member.status,
          activeLoansCount: member.activeLoansCount,
          maxBorrowLimit: member.maxBorrowLimit,
          overdueCount: member.overdueCount,
          outstandingFine: member.outstandingFine,
          hasOverdueRestrictions: member.hasOverdueRestrictions,
        },
        borrowingEligible,
        ineligibilityReason,
      };
    }

    // 4. Not found as book copy or member
    throw ApiError.notFound(
      `No physical book copy or library member card found matching barcode "${barcode}".`,
      'BARCODE_NOT_FOUND'
    );
  }
}
