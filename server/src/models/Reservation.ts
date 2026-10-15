/**
 * LIBFLOW — Reservation Model (Hold Queue & State Machine)
 * 
 * CORE DOMAIN RULE:
 * - A Reservation is placed on a bibliographic Book / Title (not an individual copy)
 *   when zero copies are available.
 * 
 * DETERMINISTIC STATE MACHINE:
 * WAITING -> READY_FOR_PICKUP -> CLAIMED
 * READY_FOR_PICKUP -> EXPIRED
 * WAITING -> CANCELLED
 */

export type ReservationStatus =
  | 'WAITING'
  | 'READY_FOR_PICKUP'
  | 'CLAIMED'
  | 'CANCELLED'
  | 'EXPIRED';

export const VALID_RESERVATION_TRANSITIONS: Record<ReservationStatus, readonly ReservationStatus[]> = {
  WAITING: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['CLAIMED', 'EXPIRED'],
  CLAIMED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export const isValidReservationTransition = (
  fromStatus: ReservationStatus,
  toStatus: ReservationStatus
): boolean => {
  if (fromStatus === toStatus) return true;
  const allowed = VALID_RESERVATION_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
};

export const assertValidReservationTransition = (
  fromStatus: ReservationStatus,
  toStatus: ReservationStatus
): void => {
  if (!isValidReservationTransition(fromStatus, toStatus)) {
    const allowed = VALID_RESERVATION_TRANSITIONS[fromStatus] || [];
    throw new Error(
      `Invalid reservation state transition: Cannot change status from ${fromStatus} to ${toStatus}. Allowed transitions: [${allowed.join(', ')}]`
    );
  }
};

export interface ReservationEntity {
  id: string;
  tenantId: string;
  reservationNumber: string;
  memberId: string;
  memberBarcode?: string | null;
  memberName?: string | null;
  memberEmail?: string | null;
  bookId: string;
  bookTitle?: string | null;
  assignedCopyId?: string | null;
  status: ReservationStatus;
  queuePosition: number;
  readyAt?: Date | null;
  expiresAt?: Date | null;
  claimedAt?: Date | null;
  cancelledAt?: Date | null;
  pickupSlot?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const mapReservationRow = (row: Record<string, any>): ReservationEntity => {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id || 'default-library'),
    reservationNumber: String(row.reservation_number),
    memberId: String(row.member_id),
    memberBarcode: row.member_barcode ? String(row.member_barcode) : null,
    memberName: row.member_name ? String(row.member_name) : null,
    memberEmail: row.member_email ? String(row.member_email) : null,
    bookId: String(row.book_id),
    bookTitle: row.book_title ? String(row.book_title) : null,
    assignedCopyId: row.assigned_copy_id ? String(row.assigned_copy_id) : null,
    status: (row.status || 'WAITING') as ReservationStatus,
    queuePosition: Number(row.queue_position || 1),
    readyAt: row.ready_at ? new Date(row.ready_at) : null,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    claimedAt: row.claimed_at ? new Date(row.claimed_at) : null,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
    pickupSlot: row.pickup_slot ? String(row.pickup_slot) : null,
    notes: row.notes ? String(row.notes) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};
