/**
 * LIBFLOW — ReservationQueueService (FIFO Queue & State Machine Engine)
 * 
 * CORE DOMAIN RULE:
 * - Enforces the deterministic reservation state machine:
 *   WAITING -> READY_FOR_PICKUP -> CLAIMED
 *   READY_FOR_PICKUP -> EXPIRED
 *   WAITING -> CANCELLED
 * - Enforces First-In-First-Out (FIFO) queue priority seniority and reordering.
 */

import {
  type ReservationStatus,
  assertValidReservationTransition,
  isValidReservationTransition,
} from '../models/Reservation.js';

export interface QueueItem {
  id: string;
  memberId: string;
  bookId: string;
  queuePosition: number;
  status: ReservationStatus;
  createdAt?: Date;
}

export class ReservationQueueService {
  /**
   * Validates whether a proposed status transition complies with the state machine.
   */
  public static validateTransition(fromStatus: ReservationStatus, toStatus: ReservationStatus): void {
    assertValidReservationTransition(fromStatus, toStatus);
  }

  public static canTransition(fromStatus: ReservationStatus, toStatus: ReservationStatus): boolean {
    return isValidReservationTransition(fromStatus, toStatus);
  }

  /**
   * Computes the new queue position for a prospective reservation placed behind
   * existing waiting holds for the same title.
   */
  public static calculateNextQueuePosition(existingWaitingHolds: QueueItem[]): number {
    const activeWaiting = existingWaitingHolds.filter((h) => h.status === 'WAITING');
    if (activeWaiting.length === 0) return 1;

    const maxPosition = activeWaiting.reduce((max, h) => Math.max(max, h.queuePosition || 1), 0);
    return maxPosition + 1;
  }

  /**
   * Re-indexes remaining WAITING reservations sequentially after a reservation is
   * cancelled or fulfilled.
   */
  public static reindexWaitingQueue<T extends { id: string; queuePosition: number; status: ReservationStatus }>(
    queue: T[],
    removedReservationId: string
  ): { id: string; oldPosition: number; newPosition: number }[] {
    const updates: { id: string; oldPosition: number; newPosition: number }[] = [];

    const waitingItems = queue
      .filter((item) => item.status === 'WAITING' && item.id !== removedReservationId)
      .sort((a, b) => a.queuePosition - b.queuePosition);

    let nextPosition = 1;
    for (const item of waitingItems) {
      if (item.queuePosition !== nextPosition) {
        updates.push({
          id: item.id,
          oldPosition: item.queuePosition,
          newPosition: nextPosition,
        });
      }
      nextPosition++;
    }

    return updates;
  }

  /**
   * Identifies the senior reservation eligible to be staged for pickup (Queue Position #1).
   */
  public static selectSeniorCandidateForPickup<T extends QueueItem>(candidates: T[]): T | null {
    const waitingCandidates = candidates.filter((c) => c.status === 'WAITING');
    if (waitingCandidates.length === 0) return null;

    // Senior candidate is the one with smallest queuePosition (and earliest createdAt as tiebreaker)
    return waitingCandidates.sort((a, b) => {
      if (a.queuePosition !== b.queuePosition) {
        return a.queuePosition - b.queuePosition;
      }
      const timeA = a.createdAt ? a.createdAt.getTime() : 0;
      const timeB = b.createdAt ? b.createdAt.getTime() : 0;
      return timeA - timeB;
    })[0];
  }

  /**
   * Calculates the claim window expiration timestamp (default: 48 hours).
   */
  public static computeClaimWindowExpiry(hours = 48, fromDate = new Date()): Date {
    const expiry = new Date(fromDate.getTime());
    expiry.setHours(expiry.getHours() + hours);
    return expiry;
  }
}
