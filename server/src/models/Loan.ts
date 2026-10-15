/**
 * LIBFLOW — Loan Model (Circulation Transaction)
 * 
 * CORE DOMAIN RULE:
 * - A Loan represents the active or historical circulation contract binding
 *   a library Member to an exact physical BookCopy.
 * - Enforces due dates, renewal limits, and tracks return status.
 */

export type LoanStatus = 'ACTIVE' | 'OVERDUE' | 'RETURNED' | 'LOST' | 'DAMAGED';

export interface LoanEntity {
  id: string;
  tenantId: string;
  loanNumber: string;
  memberId: string;
  memberBarcode?: string | null;
  memberName?: string | null;
  memberEmail?: string | null;
  bookId: string;
  bookTitle?: string | null;
  bookCopyId: string;
  copyBarcode: string;
  copyShelf?: string | null;
  checkoutDate: Date;
  dueDate: Date;
  returnDate?: Date | null;
  status: LoanStatus;
  renewalCount: number;
  maxRenewals: number;
  issuedBy: string;
  returnedTo?: string | null;
  fineCalculated: number;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const mapLoanRow = (row: Record<string, any>): LoanEntity => {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || 'default-library'),
    loanNumber: String(row.loan_number),
    memberId: String(row.member_id),
    memberBarcode: row.member_barcode ? String(row.member_barcode) : null,
    memberName: row.member_name ? String(row.member_name) : null,
    memberEmail: row.member_email ? String(row.member_email) : null,
    bookId: String(row.book_id),
    bookTitle: row.book_title ? String(row.book_title) : null,
    bookCopyId: String(row.book_copy_id),
    copyBarcode: String(row.copy_barcode),
    copyShelf: row.copy_shelf ? String(row.copy_shelf) : null,
    checkoutDate: new Date(row.checkout_date),
    dueDate: new Date(row.due_date),
    returnDate: row.return_date ? new Date(row.return_date) : null,
    status: (row.status || 'ACTIVE') as LoanStatus,
    renewalCount: Number(row.renewal_count || 0),
    maxRenewals: Number(row.max_renewals || 2),
    issuedBy: String(row.issued_by || 'SYSTEM'),
    returnedTo: row.returned_to ? String(row.returned_to) : null,
    fineCalculated: Number(row.fine_calculated || 0),
    notes: row.notes ? String(row.notes) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};
