/**
 * LIBFLOW — Fine Model (Financial Obligation & Ledger)
 * 
 * CORE DOMAIN RULE:
 * - A Fine is a distinct financial liability incurred from circulation events
 *   (overdue return, damage, lost volume).
 * - Enforces exact balance ledger arithmetic:
 *   balance = max(0, originalAmount - amountPaid - waivedAmount).
 * - Centralizes mathematical overdue penalty calculations conforming to ARCHITECTURE.md.
 * - Every waiver requires an authorized administrator and non-empty justification.
 */

export type FineStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'WAIVED';
export type FineReason = 'OVERDUE' | 'DAMAGED_ITEM' | 'LOST_ITEM' | 'PROCESSING_FEE';
export type FinePaymentMethod = 'CASH' | 'CAMPUS_CARD' | 'UPI_ONLINE' | 'CARD' | 'ONLINE' | 'WAIVER';

export interface FinePaymentEntity {
  id: string;
  tenantId: string;
  fineId: string;
  paymentNumber: string;
  amount: number;
  method: FinePaymentMethod;
  transactionReference?: string | null;
  collectedBy: string;
  paidAt: Date;
  notes?: string | null;
  createdAt: Date;
}

export interface FineWaiverEntity {
  id: string;
  tenantId: string;
  fineId: string;
  waiverNumber: string;
  amount: number;
  reason: string;
  waivedBy: string;
  waivedAt: Date;
  createdAt: Date;
}

export interface FineEntity {
  id: string;
  tenantId: string;
  fineNumber: string;
  memberId: string;
  memberBarcode?: string | null;
  memberName?: string | null;
  memberEmail?: string | null;
  loanId?: string | null;
  loanNumber?: string | null;
  bookId?: string | null;
  bookTitle?: string | null;
  bookCopyId?: string | null;
  copyBarcode?: string | null;
  reason: FineReason;
  status: FineStatus;
  originalAmount: number;
  amountPaid: number;
  waivedAmount: number;
  balance: number;
  daysOverdue: number;
  finePerDay: number;
  gracePeriodDays: number;
  maxFineCap: number;
  dueDate?: Date | null;
  returnDate?: Date | null;
  issuedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Computes deterministic balance and resolved status given original amount,
 * cumulative payments, and authorized waivers.
 */
export const computeFineBalanceAndStatus = (
  originalAmount: number,
  amountPaid: number,
  waivedAmount: number
): { balance: number; status: FineStatus } => {
  const orig = Math.round((originalAmount || 0) * 100) / 100;
  const paid = Math.round((amountPaid || 0) * 100) / 100;
  const waived = Math.round((waivedAmount || 0) * 100) / 100;

  const balance = Math.max(0, Math.round((orig - paid - waived) * 100) / 100);

  let status: FineStatus;
  if (waived >= orig && orig > 0) {
    status = 'WAIVED';
  } else if (balance === 0) {
    status = 'PAID';
  } else if (paid > 0 || waived > 0) {
    status = 'PARTIALLY_PAID';
  } else {
    status = 'UNPAID';
  }

  return { balance, status };
};

/**
 * Centralized Fine & Penalty Calculation Engine
 * 
 * Mathematical Formula (ARCHITECTURE.md Section 5):
 * DeltaDays = max(0, ceil((T_return - T_due) / 86400000))
 * BillableDays = DeltaDays <= G ? 0 : DeltaDays
 * FineAmount = min(C, BillableDays * R)
 */
export interface OverdueCalculationParams {
  dueDate: Date;
  returnDate?: Date;
  gracePeriodDays?: number;
  finePerDay?: number;
  maxFineCap?: number;
}

export interface OverdueCalculationResult {
  daysOverdue: number;
  billableDays: number;
  fineAmount: number;
  withinGracePeriod: boolean;
}

export const calculateOverdueFine = ({
  dueDate,
  returnDate = new Date(),
  gracePeriodDays = 2,
  finePerDay = 5,
  maxFineCap = 100,
}: OverdueCalculationParams): OverdueCalculationResult => {
  const dueMs = dueDate.getTime();
  const returnMs = returnDate.getTime();

  if (returnMs <= dueMs) {
    return {
      daysOverdue: 0,
      billableDays: 0,
      fineAmount: 0,
      withinGracePeriod: true,
    };
  }

  const diffMs = returnMs - dueMs;
  const daysOverdue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysOverdue <= gracePeriodDays) {
    return {
      daysOverdue,
      billableDays: 0,
      fineAmount: 0,
      withinGracePeriod: true,
    };
  }

  // Once exceeding grace, all overdue days are billed
  const billableDays = daysOverdue;
  const rawFine = billableDays * finePerDay;
  const fineAmount = Math.min(maxFineCap, Math.round(rawFine * 100) / 100);

  return {
    daysOverdue,
    billableDays,
    fineAmount,
    withinGracePeriod: false,
  };
};

export const mapFineRow = (row: Record<string, any>): FineEntity => {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || 'default-library'),
    fineNumber: String(row.fine_number),
    memberId: String(row.member_id),
    memberBarcode: row.member_barcode ? String(row.member_barcode) : null,
    memberName: row.member_name ? String(row.member_name) : null,
    memberEmail: row.member_email ? String(row.member_email) : null,
    loanId: row.loan_id ? String(row.loan_id) : null,
    loanNumber: row.loan_number ? String(row.loan_number) : null,
    bookId: row.book_id ? String(row.book_id) : null,
    bookTitle: row.book_title ? String(row.book_title) : null,
    bookCopyId: row.book_copy_id ? String(row.book_copy_id) : null,
    copyBarcode: row.copy_barcode ? String(row.copy_barcode) : null,
    reason: (row.reason || 'OVERDUE') as FineReason,
    status: (row.status || 'UNPAID') as FineStatus,
    originalAmount: Number(row.original_amount),
    amountPaid: Number(row.amount_paid || 0),
    waivedAmount: Number(row.waived_amount || 0),
    balance: Number(row.balance),
    daysOverdue: Number(row.days_overdue || 0),
    finePerDay: Number(row.fine_per_day || 5),
    gracePeriodDays: Number(row.grace_period_days || 2),
    maxFineCap: Number(row.max_fine_cap || 100),
    dueDate: row.due_date ? new Date(row.due_date) : null,
    returnDate: row.return_date ? new Date(row.return_date) : null,
    issuedDate: new Date(row.issued_date),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};

export const mapFinePaymentRow = (row: Record<string, any>): FinePaymentEntity => {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || 'default-library'),
    fineId: String(row.fine_id),
    paymentNumber: String(row.payment_number),
    amount: Number(row.amount),
    method: row.method as FinePaymentMethod,
    transactionReference: row.transaction_reference ? String(row.transaction_reference) : null,
    collectedBy: String(row.collected_by),
    paidAt: new Date(row.paid_at),
    notes: row.notes ? String(row.notes) : null,
    createdAt: new Date(row.created_at),
  };
};

export const mapFineWaiverRow = (row: Record<string, any>): FineWaiverEntity => {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || 'default-library'),
    fineId: String(row.fine_id),
    waiverNumber: String(row.waiver_number),
    amount: Number(row.amount),
    reason: String(row.reason),
    waivedBy: String(row.waived_by),
    waivedAt: new Date(row.waived_at),
    createdAt: new Date(row.created_at),
  };
};
