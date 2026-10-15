/**
 * LIBFLOW — Domain Logic Unit Tests
 * 
 * Verifies centralized fine penalty calculations, ledger arithmetic,
 * FIFO reservation queue seniority, and state machine transition guards.
 * Completely offline — does NOT require a running MySQL instance.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { FineService } from '../src/services/FineService.js';
import { ReservationQueueService, type QueueItem } from '../src/services/ReservationQueueService.js';
import {
  type ReservationStatus,
  VALID_RESERVATION_TRANSITIONS,
} from '../src/models/Reservation.js';

describe('Domain Unit Tests — Centralized Fine & Penalty Calculation Engine', () => {
  it('charges $0 when returned on or before due date', () => {
    const dueDate = new Date('2026-10-10T12:00:00Z');
    const returnDate = new Date('2026-10-09T10:00:00Z');

    const result = FineService.calculateOverdue({
      dueDate,
      returnDate,
      gracePeriodDays: 2,
      finePerDay: 5,
      maxFineCap: 100,
    });

    assert.equal(result.daysOverdue, 0);
    assert.equal(result.billableDays, 0);
    assert.equal(result.fineAmount, 0);
    assert.equal(result.withinGracePeriod, true);
  });

  it('charges $0 when returned within grace period (e.g., 2 days)', () => {
    const dueDate = new Date('2026-10-10T12:00:00Z');
    const returnDate = new Date('2026-10-12T10:00:00Z'); // 2 days overdue

    const result = FineService.calculateOverdue({
      dueDate,
      returnDate,
      gracePeriodDays: 2,
      finePerDay: 5,
      maxFineCap: 100,
    });

    assert.equal(result.daysOverdue, 2);
    assert.equal(result.billableDays, 0);
    assert.equal(result.fineAmount, 0);
    assert.equal(result.withinGracePeriod, true);
  });

  it('bills all overdue days once exceeding grace period (e.g. 5 days overdue at $5/day = $25)', () => {
    const dueDate = new Date('2026-10-10T12:00:00Z');
    const returnDate = new Date('2026-10-15T12:00:00Z'); // 5 days overdue

    const result = FineService.calculateOverdue({
      dueDate,
      returnDate,
      gracePeriodDays: 2,
      finePerDay: 5,
      maxFineCap: 100,
    });

    assert.equal(result.daysOverdue, 5);
    assert.equal(result.billableDays, 5);
    assert.equal(result.fineAmount, 25);
    assert.equal(result.withinGracePeriod, false);
  });

  it('caps overdue fine strictly at maxFineCap ceiling (e.g. $100 cap)', () => {
    const dueDate = new Date('2026-08-01T12:00:00Z');
    const returnDate = new Date('2026-10-01T12:00:00Z'); // 61 days overdue -> 61 * $5 = $305

    const result = FineService.calculateOverdue({
      dueDate,
      returnDate,
      gracePeriodDays: 2,
      finePerDay: 5,
      maxFineCap: 100,
    });

    assert.equal(result.daysOverdue, 61);
    assert.equal(result.billableDays, 61);
    assert.equal(result.fineAmount, 100); // capped at 100
  });

  it('computes exact balance and status: UNPAID -> PARTIALLY_PAID -> PAID', () => {
    // Initial unpaid fine: $50
    const initial = FineService.resolveBalanceAndStatus(50, 0, 0);
    assert.equal(initial.balance, 50);
    assert.equal(initial.status, 'UNPAID');

    // Partial payment: $20
    const partial = FineService.processPayment({
      currentOriginalAmount: 50,
      currentAmountPaid: 0,
      currentWaivedAmount: 0,
      paymentAmount: 20,
      method: 'CASH',
      collectedBy: 'staff-01',
    });
    assert.equal(partial.newAmountPaid, 20);
    assert.equal(partial.newBalance, 30);
    assert.equal(partial.newStatus, 'PARTIALLY_PAID');

    // Remaining payment: $30
    const paidInFull = FineService.processPayment({
      currentOriginalAmount: 50,
      currentAmountPaid: 20,
      currentWaivedAmount: 0,
      paymentAmount: 30,
      method: 'UPI_ONLINE',
      collectedBy: 'staff-01',
    });
    assert.equal(paidInFull.newAmountPaid, 50);
    assert.equal(paidInFull.newBalance, 0);
    assert.equal(paidInFull.newStatus, 'PAID');
  });

  it('rejects payments exceeding outstanding balance or non-positive amounts', () => {
    assert.throws(
      () =>
        FineService.processPayment({
          currentOriginalAmount: 20,
          currentAmountPaid: 0,
          currentWaivedAmount: 0,
          paymentAmount: 25, // exceeds 20
          method: 'CASH',
          collectedBy: 'staff-01',
        }),
      /cannot exceed outstanding balance/i
    );

    assert.throws(
      () =>
        FineService.processPayment({
          currentOriginalAmount: 20,
          currentAmountPaid: 0,
          currentWaivedAmount: 0,
          paymentAmount: 0,
          method: 'CASH',
          collectedBy: 'staff-01',
        }),
      /positive number/i
    );
  });

  it('enforces mandatory audited reason and authorization for fine waivers', () => {
    assert.throws(
      () =>
        FineService.processWaiver({
          currentOriginalAmount: 40,
          currentAmountPaid: 0,
          currentWaivedAmount: 0,
          waiverAmount: 40,
          waiverReason: '', // missing reason
          waivedBy: 'admin-01',
        }),
      /justification/i
    );

    assert.throws(
      () =>
        FineService.processWaiver({
          currentOriginalAmount: 40,
          currentAmountPaid: 0,
          currentWaivedAmount: 0,
          waiverAmount: 40,
          waiverReason: 'Approved by Dean of Students',
          waivedBy: '', // missing authorizer
        }),
      /authorizing administrator/i
    );

    const fullWaiver = FineService.processWaiver({
      currentOriginalAmount: 40,
      currentAmountPaid: 0,
      currentWaivedAmount: 0,
      waiverAmount: 40,
      waiverReason: 'Medical leave approved by Dean',
      waivedBy: 'admin-01',
    });
    assert.equal(fullWaiver.newWaivedAmount, 40);
    assert.equal(fullWaiver.newBalance, 0);
    assert.equal(fullWaiver.newStatus, 'WAIVED');
  });
});

describe('Domain Unit Tests — Reservation State Machine & FIFO Queue', () => {
  it('enforces deterministic reservation state transitions', () => {
    // Valid: WAITING -> READY_FOR_PICKUP
    assert.equal(ReservationQueueService.canTransition('WAITING', 'READY_FOR_PICKUP'), true);
    // Valid: WAITING -> CANCELLED
    assert.equal(ReservationQueueService.canTransition('WAITING', 'CANCELLED'), true);
    // Valid: READY_FOR_PICKUP -> CLAIMED
    assert.equal(ReservationQueueService.canTransition('READY_FOR_PICKUP', 'CLAIMED'), true);
    // Valid: READY_FOR_PICKUP -> EXPIRED
    assert.equal(ReservationQueueService.canTransition('READY_FOR_PICKUP', 'EXPIRED'), true);

    // Invalid: WAITING -> CLAIMED (skips ready check-in)
    assert.equal(ReservationQueueService.canTransition('WAITING', 'CLAIMED'), false);
    assert.throws(
      () => ReservationQueueService.validateTransition('WAITING', 'CLAIMED'),
      /Invalid reservation state transition/
    );

    // Invalid: READY_FOR_PICKUP -> CANCELLED (cannot cancel after copy held)
    assert.equal(ReservationQueueService.canTransition('READY_FOR_PICKUP', 'CANCELLED'), false);

    // Terminal states cannot transition to anything
    const terminalStates: ReservationStatus[] = ['CLAIMED', 'CANCELLED', 'EXPIRED'];
    for (const state of terminalStates) {
      assert.deepEqual(VALID_RESERVATION_TRANSITIONS[state], []);
      assert.equal(ReservationQueueService.canTransition(state, 'WAITING'), false);
    }
  });

  it('computes FIFO queue seniority and next queue position', () => {
    const existingQueue: QueueItem[] = [
      { id: 'res-1', memberId: 'm-1', bookId: 'b-1', queuePosition: 1, status: 'WAITING' },
      { id: 'res-2', memberId: 'm-2', bookId: 'b-1', queuePosition: 2, status: 'WAITING' },
      { id: 'res-3', memberId: 'm-3', bookId: 'b-1', queuePosition: 3, status: 'CANCELLED' },
    ];

    const nextPos = ReservationQueueService.calculateNextQueuePosition(existingQueue);
    assert.equal(nextPos, 3); // 2 active waiting holds, so next is 3
  });

  it('re-indexes remaining queue positions when a waiting hold is cancelled', () => {
    const queue: QueueItem[] = [
      { id: 'res-1', memberId: 'm-1', bookId: 'b-1', queuePosition: 1, status: 'WAITING' },
      { id: 'res-2', memberId: 'm-2', bookId: 'b-1', queuePosition: 2, status: 'WAITING' },
      { id: 'res-3', memberId: 'm-3', bookId: 'b-1', queuePosition: 3, status: 'WAITING' },
    ];

    // res-1 cancels
    const updates = ReservationQueueService.reindexWaitingQueue(queue, 'res-1');
    assert.equal(updates.length, 2);
    assert.deepEqual(updates, [
      { id: 'res-2', oldPosition: 2, newPosition: 1 },
      { id: 'res-3', oldPosition: 3, newPosition: 2 },
    ]);
  });

  it('selects senior candidate (Queue Position #1) when copy becomes available', () => {
    const queue: QueueItem[] = [
      { id: 'res-2', memberId: 'm-2', bookId: 'b-1', queuePosition: 2, status: 'WAITING' },
      { id: 'res-1', memberId: 'm-1', bookId: 'b-1', queuePosition: 1, status: 'WAITING' },
      { id: 'res-3', memberId: 'm-3', bookId: 'b-1', queuePosition: 3, status: 'WAITING' },
    ];

    const senior = ReservationQueueService.selectSeniorCandidateForPickup(queue);
    assert.ok(senior);
    assert.equal(senior.id, 'res-1');
    assert.equal(senior.queuePosition, 1);
  });

  it('computes default 48-hour claim window expiration timestamp', () => {
    const start = new Date('2026-10-15T10:00:00Z');
    const expiry = ReservationQueueService.computeClaimWindowExpiry(48, start);

    const diffHours = (expiry.getTime() - start.getTime()) / (1000 * 60 * 60);
    assert.equal(diffHours, 48);
    assert.equal(expiry.toISOString(), '2026-10-17T10:00:00.000Z');
  });
});
