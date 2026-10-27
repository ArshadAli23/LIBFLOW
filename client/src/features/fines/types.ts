/**
 * LIBFLOW — Fines & Financial Obligation Domain Type Definitions
 * 
 * CORE DOMAIN RULE:
 * - FINE: A financial obligation assessed from circulation events (overdue loans, damaged copies, lost items).
 * - Strictly separated from LOAN and MEMBER entities.
 * - Deterministic policy calculation based on grace periods and daily rate caps.
 */

export type FineStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'WAIVED';

export type FineReason = 'OVERDUE' | 'DAMAGED_ITEM' | 'LOST_ITEM' | 'PROCESSING_FEE' | 'OTHER';

export type FinePaymentMethod = 'CASH' | 'CAMPUS_CARD' | 'UPI_ONLINE' | 'CARD' | 'ONLINE' | 'WAIVER' | 'BANK_TRANSFER';

export interface FinePaymentRecord {
  id: string;
  fineId: string;
  amount: number;
  method: FinePaymentMethod;
  transactionReference?: string;
  collectedBy: string;
  paidAt: string; // ISO Date
  notes?: string;
}

export interface FineWaiverRecord {
  fineId: string;
  amount: number;
  reason: string;
  waivedBy: string;
  waivedAt: string; // ISO Date
}

export interface Fine {
  id: string;                     // e.g. "fine_001"
  fineNumber: string;             // e.g. "FN-2026-0042"
  memberId: string;               // references Member.id
  memberBarcode: string;          // e.g. "MB-2026-081"
  memberName: string;
  memberEmail: string;
  memberType: string;
  loanId?: string;                // references Loan.id if generated from circulation
  loanNumber?: string;            // e.g. "LN-2026-0081"
  bookId?: string;                // references Book.id
  bookTitle: string;
  bookCoverUrl?: string;
  bookCopyId?: string;            // references BookCopy.id
  copyBarcode?: string;           // e.g. "LC-00422"
  reason: FineReason;
  status: FineStatus;
  originalAmount: number;         // Initial assessed penalty
  amountPaid: number;             // Cumulative payments recorded
  waivedAmount: number;           // Cumulative authorized waivers
  balance: number;                // Outstanding debt (original - paid - waived)
  daysOverdue: number;
  finePerDay: number;
  gracePeriodDays: number;
  maxFineCap: number;
  dueDate: string;                // ISO Date
  returnDate?: string;            // ISO Date if already returned
  issuedDate: string;             // ISO Date when penalty logged
  payments: FinePaymentRecord[];
  waivers: FineWaiverRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface FineFilterState {
  search: string;
  status: FineStatus | 'ALL';
  reason: FineReason | 'ALL';
  memberId?: string;
}

export type FineSortOption =
  | 'balance_desc'
  | 'balance_asc'
  | 'issued_desc'
  | 'issued_asc'
  | 'member_asc'
  | 'book_asc';
