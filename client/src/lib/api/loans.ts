/**
 * LIBFLOW — Loans & Circulation API Service
 * 
 * Interacts with /api/v1/loans endpoints.
 * Provides typed mapping between backend loan entities and frontend domain models.
 * 
 * BACKEND ROUTE CONTRACT:
 * - GET  /api/v1/loans             (Staff only: ADMIN, LIBRARIAN)
 * - GET  /api/v1/loans/me          (Authenticated member's own loans)
 * - GET  /api/v1/loans/:id         (Staff or loan owner)
 * - POST /api/v1/loans/checkout    (Checkout physical copy)
 * - POST /api/v1/loans/:id/return  (Return borrowed physical copy)
 * - POST /api/v1/loans/:id/renew   (Renew active loan)
 */

import { apiClient } from './client.ts';
import type { ApiResponse, ApiLoan } from './types.ts';
import type { Loan, LoanStatus } from '../../features/circulation/types.ts';

export interface LoanListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: LoanStatus | string;
  memberId?: string;
  bookId?: string;
  bookCopyId?: string;
  overdueOnly?: boolean;
  sortBy?: string;
}

export interface CheckoutPayload {
  memberId: string;       // PK id, institutional member_id, or member_barcode
  bookCopyId: string;     // PK id or copy barcode
  borrowDurationDays?: number;
  notes?: string;
}

/**
 * Maps a backend ApiLoan entity to the frontend Loan domain model.
 */
export function mapApiLoanToLoan(apiLoan: any): Loan {
  const checkoutDate = apiLoan.checkoutDate
    ? String(apiLoan.checkoutDate).split('T')[0]
    : new Date().toISOString().split('T')[0];

  const dueDate = apiLoan.dueDate
    ? String(apiLoan.dueDate).split('T')[0]
    : new Date().toISOString().split('T')[0];

  const returnDate = apiLoan.returnDate
    ? String(apiLoan.returnDate).split('T')[0]
    : undefined;

  const memberId = String(apiLoan.memberId || apiLoan.member?.id || '');
  const memberBarcode = String(apiLoan.memberBarcode || apiLoan.member?.institutionalId || memberId);
  const memberName = String(
    apiLoan.memberName ||
    (apiLoan.member?.user ? `${apiLoan.member.user.firstName} ${apiLoan.member.user.lastName}`.trim() : (apiLoan.member?.institutionalId || 'Patron'))
  );
  const bookId = String(apiLoan.bookId || apiLoan.bookCopy?.book?.id || '');
  const bookTitle = String(apiLoan.bookTitle || apiLoan.bookCopy?.book?.title || 'Library Title');
  const bookCopyId = String(apiLoan.bookCopyId || apiLoan.bookCopy?.id || '');
  const copyBarcode = String(apiLoan.copyBarcode || apiLoan.bookCopy?.barcode || '');
  const copyShelf = String(apiLoan.copyShelf || apiLoan.bookCopy?.shelfLocation || 'A-01-01');

  return {
    id: String(apiLoan.id),
    loanNumber: String(apiLoan.loanNumber || apiLoan.id),
    memberId,
    memberBarcode,
    memberName,
    memberEmail: String(apiLoan.memberEmail || ''),
    bookId,
    bookTitle,
    bookCoverUrl: apiLoan.bookCoverUrl || undefined,
    bookCopyId,
    copyBarcode,
    copyShelf,
    checkoutDate,
    dueDate,
    returnDate,
    status: (apiLoan.status as LoanStatus) || 'ACTIVE',
    renewalCount: Number(apiLoan.renewalCount) || 0,
    maxRenewals: Number(apiLoan.maxRenewals) || 2,
    issuedBy: String(apiLoan.issuedBy || 'Circulation Terminal'),
    returnedTo: apiLoan.returnedTo || undefined,
    notes: apiLoan.notes || undefined,
    createdAt: apiLoan.createdAt || new Date().toISOString(),
    updatedAt: apiLoan.updatedAt || new Date().toISOString(),
  };
}

const SORT_MAP: Record<string, string> = {
  due_date_asc: 'due_asc',
  due_date_desc: 'due_desc',
  checkout_date_desc: 'checkout_desc',
  checkout_date_asc: 'checkout_asc',
  return_date_desc: 'return_desc',
};

export const loansApi = {
  /**
   * List circulation loans with pagination, search, and filters (Staff only: ADMIN, LIBRARIAN).
   */
  listLoans: async (params?: LoanListParams): Promise<ApiResponse<ApiLoan[]>> => {
    const cleanParams: Record<string, any> = { ...params };
    if (cleanParams.status === 'ALL') {
      delete cleanParams.status;
    }
    if (cleanParams.sortBy && SORT_MAP[cleanParams.sortBy]) {
      cleanParams.sortBy = SORT_MAP[cleanParams.sortBy];
    }
    return apiClient.get<ApiLoan[]>('/loans', {
      params: cleanParams as Record<string, string | number | boolean | undefined | null>,
    });
  },

  /**
   * Retrieve authenticated member's own circulation loans.
   */
  getOwnLoans: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<ApiLoan[]>> => {
    const cleanParams: Record<string, any> = { ...params };
    if (cleanParams.status === 'ALL') {
      delete cleanParams.status;
    }
    return apiClient.get<ApiLoan[]>('/loans/me', {
      params: cleanParams as Record<string, string | number | boolean | undefined | null>,
    });
  },

  /**
   * Retrieve single loan details by ID or loan number.
   */
  getLoanById: async (id: string): Promise<ApiResponse<ApiLoan>> => {
    return apiClient.get<ApiLoan>(`/loans/${encodeURIComponent(id)}`);
  },

  /**
   * Checkout an available physical copy to an eligible library member.
   */
  checkout: async (payload: CheckoutPayload): Promise<ApiResponse<ApiLoan>> => {
    return apiClient.post<ApiLoan>('/loans/checkout', payload);
  },

  /**
   * Return a borrowed book copy to circulation.
   */
  returnLoan: async (id: string): Promise<ApiResponse<ApiLoan>> => {
    return apiClient.post<ApiLoan>(`/loans/${encodeURIComponent(id)}/return`);
  },

  /**
   * Renew an active loan.
   */
  renewLoan: async (id: string): Promise<ApiResponse<ApiLoan>> => {
    return apiClient.post<ApiLoan>(`/loans/${encodeURIComponent(id)}/renew`);
  },
};
