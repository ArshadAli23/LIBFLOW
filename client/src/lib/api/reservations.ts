/**
 * LIBFLOW — Reservations & Hold Queue API Service
 * 
 * Interacts with /api/v1/reservations endpoints.
 * Provides typed mapping between backend reservation entities and frontend domain models.
 * 
 * BACKEND ROUTE CONTRACT:
 * - GET  /api/v1/reservations                 (Staff only: ADMIN, LIBRARIAN)
 * - GET  /api/v1/reservations/me              (Authenticated member's own holds)
 * - GET  /api/v1/reservations/:id             (Staff or reservation owner)
 * - POST /api/v1/reservations                 (Place reservation hold)
 * - POST /api/v1/reservations/:id/cancel      (Cancel active reservation hold)
 * - POST /api/v1/reservations/:id/claim       (Claim ready pickup reservation into active loan)
 * - POST /api/v1/reservations/process-expired (Batch sweep expired pickup holds, staff only)
 */

import { apiClient } from './client.ts';
import type {
  ApiResponse,
  ApiReservation,
  ApiClaimReservationData,
  ApiProcessExpiredData,
  ReservationStatus,
} from './types.ts';
import type { Reservation } from '../../features/reservations/types.ts';

export interface ReservationListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReservationStatus | 'ALL' | string;
  bookId?: string;
  memberId?: string;
  sortBy?: 'created_desc' | 'created_asc' | 'queue_asc' | 'expires_asc' | string;
}

export interface CreateReservationPayload {
  bookId: string;
  memberId?: string;
  pickupSlot?: string;
  notes?: string;
}

/**
 * Maps a backend ApiReservation entity to the frontend Reservation domain model.
 */
export function mapApiReservationToReservation(
  apiRes: any,
  bookLookup?: (bookId: string) => any
): Reservation {
  const book = bookLookup ? bookLookup(apiRes.bookId) : undefined;
  const bookTitle = String(
    apiRes.bookTitle ||
    apiRes.book?.title ||
    book?.title ||
    'Reserved Title'
  );

  const rawAuthors =
    apiRes.bookAuthors ||
    apiRes.book?.authors ||
    (book?.authors ? book.authors : undefined);

  const bookAuthors: string[] = Array.isArray(rawAuthors) && rawAuthors.length > 0
    ? rawAuthors.map(String)
    : ['Unknown Author'];

  const bookCoverUrl =
    apiRes.bookCoverUrl ||
    apiRes.book?.coverUrl ||
    book?.coverUrl ||
    undefined;

  const bookIsbn = String(
    apiRes.bookIsbn ||
    apiRes.book?.isbn ||
    book?.isbn ||
    '978-0000000000'
  );

  const memberId = String(apiRes.memberId || apiRes.member?.id || '');
  const memberBarcode = String(
    apiRes.memberBarcode ||
    apiRes.member?.institutionalId ||
    memberId ||
    'MB-PATRON'
  );
  const memberName = String(
    apiRes.memberName ||
    (apiRes.member?.user ? `${apiRes.member.user.firstName} ${apiRes.member.user.lastName}`.trim() : null) ||
    apiRes.member?.institutionalId ||
    'Patron'
  );
  const memberEmail = String(
    apiRes.memberEmail ||
    apiRes.member?.user?.email ||
    ''
  );

  const formatIso = (val: any): string | undefined => {
    if (!val) return undefined;
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d.toISOString();
    } catch {
      return undefined;
    }
  };

  const createdAt = formatIso(apiRes.createdAt) || new Date().toISOString();
  const updatedAt = formatIso(apiRes.updatedAt) || createdAt;
  const readyAt = formatIso(apiRes.readyAt);
  const expiresAt = formatIso(apiRes.expiresAt);
  const claimedAt = formatIso(apiRes.claimedAt);
  const cancelledAt = formatIso(apiRes.cancelledAt);

  return {
    id: String(apiRes.id),
    reservationNumber: String(apiRes.reservationNumber || apiRes.id),
    memberId,
    memberBarcode,
    memberName,
    memberEmail,
    bookId: String(apiRes.bookId || ''),
    bookTitle,
    bookAuthors,
    bookCoverUrl,
    bookIsbn,
    status: (apiRes.status as ReservationStatus) || 'WAITING',
    queuePosition: Number(apiRes.queuePosition) || 1,
    createdAt,
    readyAt,
    expiresAt,
    claimedAt,
    cancelledAt,
    pickupSlot: apiRes.pickupSlot ? String(apiRes.pickupSlot) : undefined,
    notes: apiRes.notes ? String(apiRes.notes) : undefined,
    assignedCopyId: apiRes.assignedCopyId ? String(apiRes.assignedCopyId) : undefined,
    updatedAt,
  };
}

const SORT_MAP: Record<string, string> = {
  created_desc: 'created_desc',
  created_asc: 'created_asc',
  queue_asc: 'queue_asc',
  expires_asc: 'expires_asc',
};

export const reservationsApi = {
  /**
   * List reservations with pagination, search, and filters (Staff only: ADMIN, LIBRARIAN).
   */
  listReservations: async (params?: ReservationListParams): Promise<ApiResponse<ApiReservation[]>> => {
    const cleanParams: Record<string, any> = { ...params };
    if (cleanParams.status === 'ALL') {
      delete cleanParams.status;
    }
    if (cleanParams.sortBy && SORT_MAP[cleanParams.sortBy]) {
      cleanParams.sortBy = SORT_MAP[cleanParams.sortBy];
    }
    return apiClient.get<ApiReservation[]>('/reservations', {
      params: cleanParams as Record<string, string | number | boolean | undefined | null>,
    });
  },

  /**
   * Retrieve authenticated member's own reservations.
   */
  getOwnReservations: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<ApiReservation[]>> => {
    const cleanParams: Record<string, any> = { ...params };
    if (cleanParams.status === 'ALL') {
      delete cleanParams.status;
    }
    return apiClient.get<ApiReservation[]>('/reservations/me', {
      params: cleanParams as Record<string, string | number | boolean | undefined | null>,
    });
  },

  /**
   * Retrieve single reservation details by ID or hold number.
   */
  getReservationById: async (id: string): Promise<ApiResponse<ApiReservation>> => {
    return apiClient.get<ApiReservation>(`/reservations/${encodeURIComponent(id)}`);
  },

  /**
   * Place a reservation hold on a bibliographic book title.
   */
  createReservation: async (payload: CreateReservationPayload): Promise<ApiResponse<ApiReservation>> => {
    return apiClient.post<ApiReservation>('/reservations', payload);
  },

  /**
   * Cancel an eligible reservation hold.
   */
  cancelReservation: async (id: string): Promise<ApiResponse<ApiReservation>> => {
    return apiClient.post<ApiReservation>(`/reservations/${encodeURIComponent(id)}/cancel`);
  },

  /**
   * Claim a ready pickup reservation, creating an active loan for the assigned physical copy.
   */
  claimReservation: async (id: string): Promise<ApiResponse<ApiClaimReservationData>> => {
    return apiClient.post<ApiClaimReservationData>(`/reservations/${encodeURIComponent(id)}/claim`);
  },

  /**
   * Batch process expired pickup reservations (Staff only: ADMIN, LIBRARIAN).
   */
  processExpired: async (): Promise<ApiResponse<ApiProcessExpiredData>> => {
    return apiClient.post<ApiProcessExpiredData>('/reservations/process-expired');
  },
};
