/**
 * LIBFLOW — Reservations & Hold Queue Domain Type Definitions
 * 
 * CORE DOMAIN RULE:
 * - RESERVATION: A patron waiting for a BOOK / TITLE (not bound directly to a physical copy
 *   until staged for pickup).
 * 
 * LIFECYCLE STATE MACHINE:
 * WAITING -> READY_FOR_PICKUP -> CLAIMED
 * WAITING -> CANCELLED
 * READY_FOR_PICKUP -> EXPIRED
 */

export type ReservationStatus =
  | 'WAITING'
  | 'READY_FOR_PICKUP'
  | 'CLAIMED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface Reservation {
  id: string;                     // e.g. "res_001"
  reservationNumber: string;     // e.g. "RES-2026-0042"
  memberId: string;               // references Member.id
  memberBarcode: string;          // e.g. "MB-2026-081"
  memberName: string;
  memberEmail: string;
  bookId: string;                 // references Book.id
  bookTitle: string;
  bookAuthors: string[];
  bookCoverUrl?: string;
  bookIsbn: string;
  status: ReservationStatus;
  queuePosition: number;          // 1, 2, 3...
  createdAt: string;              // ISO Date
  readyAt?: string;               // ISO Date when copy was restaged
  expiresAt?: string;             // ISO Date (48h pickup window)
  claimedAt?: string;             // ISO Date
  cancelledAt?: string;           // ISO Date
  pickupSlot?: string;            // e.g. "Hold Staging Slot H-04"
  assignedCopyId?: string;        // references BookCopy.id if staged for pickup
  notes?: string;
  updatedAt: string;
}

export interface ReservationFilterState {
  search: string;
  status: ReservationStatus | 'ALL';
  bookId?: string;
}
