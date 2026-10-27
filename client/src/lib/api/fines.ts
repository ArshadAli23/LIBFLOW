/**
 * LIBFLOW — Fines & Financial Ledger API Service
 * 
 * Interacts with /api/v1/fines endpoints.
 * Provides typed mapping between backend fine entities and frontend domain models.
 * 
 * BACKEND ROUTE CONTRACT:
 * - GET  /api/v1/fines         (Staff only: ADMIN, LIBRARIAN)
 * - GET  /api/v1/fines/me      (Authenticated member's own liabilities)
 * - GET  /api/v1/fines/:id     (Staff or fine owner)
 * - POST /api/v1/fines/:id/pay (Collect payment, Staff or fine owner)
 * - POST /api/v1/fines/:id/waive (Waive fine, ADMIN only)
 */

import { apiClient } from './client.ts';
import type {
  ApiResponse,
  ApiFine,
  FineStatus,
  FineReason,
  FinePaymentMethod,
} from './types.ts';
import type {
  Fine,
  FinePaymentRecord,
  FineWaiverRecord,
} from '../../features/fines/types.ts';

export interface FineListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: FineStatus | 'ALL' | string;
  reason?: FineReason | 'ALL' | string;
  memberId?: string;
  loanId?: string;
  unpaidOnly?: boolean;
  sortBy?: 'issued_desc' | 'issued_asc' | 'balance_desc' | 'balance_asc' | string;
}

export interface RecordPaymentPayload {
  amount: number;
  method: FinePaymentMethod;
  transactionReference?: string;
  notes?: string;
}

export interface RecordWaiverPayload {
  amount: number;
  reason: string;
}

/**
 * Normalizes ISO date string safely.
 */
function formatIso(val: any): string | undefined {
  if (!val) return undefined;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Maps a backend ApiFine entity to the frontend Fine domain model.
 */
export function mapApiFineToFine(
  apiFine: any,
  bookLookup?: (bookId: string) => any
): Fine {
  const book = (bookLookup && apiFine.bookId) ? bookLookup(apiFine.bookId) : undefined;
  const bookTitle = String(
    apiFine.bookTitle ||
    apiFine.book?.title ||
    book?.title ||
    'Library Material'
  );

  const bookCoverUrl =
    apiFine.bookCoverUrl ||
    apiFine.book?.coverUrl ||
    book?.coverUrl ||
    undefined;

  const memberId = String(apiFine.memberId || apiFine.member?.id || '');
  const memberBarcode = String(
    apiFine.memberBarcode ||
    apiFine.member?.institutionalId ||
    memberId ||
    'MB-0000'
  );

  const memberName = String(
    apiFine.memberName ||
    (apiFine.member?.user ? `${apiFine.member.user.firstName} ${apiFine.member.user.lastName}`.trim() : null) ||
    apiFine.member?.institutionalId ||
    'Patron'
  );

  const memberEmail = String(
    apiFine.memberEmail ||
    apiFine.member?.user?.email ||
    ''
  );

  const memberType = String(
    apiFine.memberType ||
    apiFine.member?.membershipCategory ||
    'STUDENT'
  );

  const createdAt = formatIso(apiFine.createdAt) || new Date().toISOString();
  const updatedAt = formatIso(apiFine.updatedAt) || createdAt;
  const dueDate = formatIso(apiFine.dueDate) || createdAt;
  const returnDate = formatIso(apiFine.returnDate);
  const issuedDate = formatIso(apiFine.issuedDate) || createdAt;

  // Map nested payment ledger
  const rawPayments = Array.isArray(apiFine.payments) ? apiFine.payments : [];
  const payments: FinePaymentRecord[] = rawPayments.map((p: any) => ({
    id: String(p.id || `pmt_${Date.now()}`),
    fineId: String(p.fineId || apiFine.id),
    amount: Number(p.amount) || 0,
    method: (p.method as FinePaymentMethod) || 'CASH',
    transactionReference: p.transactionReference ? String(p.transactionReference) : undefined,
    collectedBy: String(p.collectedBy || 'Staff'),
    paidAt: formatIso(p.paidAt) || formatIso(p.createdAt) || createdAt,
    notes: p.notes ? String(p.notes) : undefined,
  }));

  // Map nested waiver ledger
  const rawWaivers = Array.isArray(apiFine.waivers) ? apiFine.waivers : [];
  const waivers: FineWaiverRecord[] = rawWaivers.map((w: any) => ({
    fineId: String(w.fineId || apiFine.id),
    amount: Number(w.amount) || 0,
    reason: String(w.reason || ''),
    waivedBy: String(w.waivedBy || 'Library Administration'),
    waivedAt: formatIso(w.waivedAt) || formatIso(w.createdAt) || createdAt,
  }));

  const originalAmount = Number(apiFine.originalAmount) || 0;
  const amountPaid = Number(apiFine.amountPaid) || 0;
  const waivedAmount = Number(apiFine.waivedAmount) || 0;
  const balance = Number(apiFine.balance !== undefined && apiFine.balance !== null
    ? apiFine.balance
    : Math.max(0, originalAmount - amountPaid - waivedAmount));

  return {
    id: String(apiFine.id),
    fineNumber: String(apiFine.fineNumber || apiFine.id),
    memberId,
    memberBarcode,
    memberName,
    memberEmail,
    memberType,
    loanId: apiFine.loanId ? String(apiFine.loanId) : undefined,
    loanNumber: apiFine.loanNumber ? String(apiFine.loanNumber) : undefined,
    bookId: apiFine.bookId ? String(apiFine.bookId) : undefined,
    bookTitle,
    bookCoverUrl,
    bookCopyId: apiFine.bookCopyId ? String(apiFine.bookCopyId) : undefined,
    copyBarcode: apiFine.copyBarcode ? String(apiFine.copyBarcode) : undefined,
    reason: (apiFine.reason as FineReason) || 'OVERDUE',
    status: (apiFine.status as FineStatus) || 'UNPAID',
    originalAmount,
    amountPaid,
    waivedAmount,
    balance,
    daysOverdue: Number(apiFine.daysOverdue) || 0,
    finePerDay: Number(apiFine.finePerDay) || 5,
    gracePeriodDays: Number(apiFine.gracePeriodDays) || 2,
    maxFineCap: Number(apiFine.maxFineCap) || 200,
    dueDate,
    returnDate,
    issuedDate,
    payments,
    waivers,
    createdAt,
    updatedAt,
  };
}

const SORT_WHITELIST: Record<string, string> = {
  issued_desc: 'issued_desc',
  issued_asc: 'issued_asc',
  balance_desc: 'balance_desc',
  balance_asc: 'balance_asc',
};

export const finesApi = {
  /**
   * List fines with pagination, search, and filters (Staff only: ADMIN, LIBRARIAN).
   */
  listFines: async (params?: FineListParams): Promise<ApiResponse<ApiFine[]>> => {
    const cleanParams: Record<string, any> = { ...params };
    if (cleanParams.status === 'ALL') {
      delete cleanParams.status;
    }
    if (cleanParams.reason === 'ALL') {
      delete cleanParams.reason;
    }
    if (cleanParams.sortBy && SORT_WHITELIST[cleanParams.sortBy]) {
      cleanParams.sortBy = SORT_WHITELIST[cleanParams.sortBy];
    } else if (cleanParams.sortBy) {
      // Map other frontend sorts if possible or omit
      delete cleanParams.sortBy;
    }
    return apiClient.get<ApiFine[]>('/fines', {
      params: cleanParams as Record<string, string | number | boolean | undefined | null>,
    });
  },

  /**
   * Retrieve authenticated member's own liabilities.
   */
  getOwnFines: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
    unpaidOnly?: boolean;
  }): Promise<ApiResponse<ApiFine[]>> => {
    const cleanParams: Record<string, any> = { ...params };
    if (cleanParams.status === 'ALL') {
      delete cleanParams.status;
    }
    return apiClient.get<ApiFine[]>('/fines/me', {
      params: cleanParams as Record<string, string | number | boolean | undefined | null>,
    });
  },

  /**
   * Retrieve single fine record with full payments and waivers breakdown.
   */
  getFineById: async (id: string): Promise<ApiResponse<ApiFine>> => {
    return apiClient.get<ApiFine>(`/fines/${encodeURIComponent(id)}`);
  },

  /**
   * Record a collected payment against an outstanding fine.
   */
  recordPayment: async (
    id: string,
    payload: RecordPaymentPayload
  ): Promise<ApiResponse<ApiFine>> => {
    return apiClient.post<ApiFine>(`/fines/${encodeURIComponent(id)}/pay`, payload);
  },

  /**
   * Record an authorized fine waiver with mandatory justification (ADMIN only).
   */
  recordWaiver: async (
    id: string,
    payload: RecordWaiverPayload
  ): Promise<ApiResponse<ApiFine>> => {
    return apiClient.post<ApiFine>(`/fines/${encodeURIComponent(id)}/waive`, payload);
  },
};
