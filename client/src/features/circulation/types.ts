/**
 * LIBFLOW — Circulation Domain Type Definitions
 * 
 * CORE DOMAIN RULE:
 * - LOAN: Circulation transaction binding a MEMBER to a physical BOOK COPY
 *   with checkout date, due date, return date, and renewal allowances.
 * - Stricly separated from BOOK (bibliographic record) and FINE (future financial engine).
 */

export type LoanStatus = 'ACTIVE' | 'OVERDUE' | 'RETURNED' | 'LOST';

export interface Loan {
  id: string;                    // e.g. "loan_001"
  loanNumber: string;            // e.g. "LN-2026-0042"
  memberId: string;              // references Member.id
  memberBarcode: string;         // e.g. "MB-2026-081"
  memberName: string;
  memberEmail: string;
  bookId: string;                // references Book.id
  bookTitle: string;
  bookCoverUrl?: string;
  bookCopyId: string;            // references BookCopy.id
  copyBarcode: string;           // e.g. "LC-00422"
  copyShelf: string;             // e.g. "A-03-04"
  checkoutDate: string;          // ISO Date
  dueDate: string;               // ISO Date
  returnDate?: string;           // ISO Date
  status: LoanStatus;
  renewalCount: number;
  maxRenewals: number;
  issuedBy: string;              // Staff member or self-kiosk
  returnedTo?: string;           // Staff member who inspected return
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CirculationPolicy {
  loanDurationDays: number;      // 14 days standard
  maxRenewals: number;           // 2 extensions
  renewalExtensionDays: number;  // +14 days per renewal
  studentLoanQuota: number;      // 5 volumes max
  facultyLoanQuota: number;      // 25 volumes max
}

export interface CirculationFilterState {
  search: string;
  status: LoanStatus | 'ALL';
}

export type CirculationSortOption =
  | 'due_date_asc'
  | 'due_date_desc'
  | 'checkout_date_desc'
  | 'member_name_asc'
  | 'book_title_asc';
