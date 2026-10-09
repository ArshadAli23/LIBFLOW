import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_RESERVATIONS } from '../src/features/reservations/mockReservationsData.ts';

describe('Reservations and Queue State Machine Domain', () => {
  test('Initial seed reservations conform to valid state machine contracts', () => {
    assert.ok(INITIAL_RESERVATIONS.length > 0);
    const validStates = ['WAITING', 'READY_FOR_PICKUP', 'CLAIMED', 'CANCELLED', 'EXPIRED'];
    for (const res of INITIAL_RESERVATIONS) {
      assert.ok(res.id);
      assert.ok(res.reservationNumber.startsWith('RES-'));
      assert.ok(res.memberId);
      assert.ok(res.bookId);
      assert.ok(validStates.includes(res.status), `State ${res.status} must be valid`);
      assert.ok(typeof res.queuePosition === 'number');
    }
  });

  test('Creating holds computes FIFO queue seniority position accurately', () => {
    const existingReservations = [
      { id: 'r1', bookId: 'bk_1', memberId: 'm1', status: 'WAITING', queuePosition: 1 },
      { id: 'r2', bookId: 'bk_1', memberId: 'm2', status: 'WAITING', queuePosition: 2 },
      { id: 'r3', bookId: 'bk_2', memberId: 'm3', status: 'WAITING', queuePosition: 1 },
    ];

    function calculateNextQueuePosition(reservations, bookId) {
      const waiting = reservations.filter((r) => r.bookId === bookId && r.status === 'WAITING');
      return waiting.length + 1;
    }

    assert.equal(calculateNextQueuePosition(existingReservations, 'bk_1'), 3);
    assert.equal(calculateNextQueuePosition(existingReservations, 'bk_2'), 2);
    assert.equal(calculateNextQueuePosition(existingReservations, 'bk_3'), 1);
  });

  test('Duplicate active holds by same member on same book are rejected', () => {
    const reservations = [
      { id: 'r1', bookId: 'bk_1', memberId: 'm1', status: 'WAITING', queuePosition: 1 },
      { id: 'r2', bookId: 'bk_1', memberId: 'm2', status: 'CLAIMED', queuePosition: 0 },
    ];

    function canPlaceHold(reservations, bookId, memberId) {
      const activeHold = reservations.find(
        (r) =>
          r.bookId === bookId &&
          r.memberId === memberId &&
          (r.status === 'WAITING' || r.status === 'READY_FOR_PICKUP')
      );
      return !activeHold;
    }

    assert.equal(canPlaceHold(reservations, 'bk_1', 'm1'), false, 'Cannot place duplicate active hold');
    assert.equal(canPlaceHold(reservations, 'bk_1', 'm2'), true, 'Can place hold after previous hold was claimed');
    assert.equal(canPlaceHold(reservations, 'bk_2', 'm1'), true, 'Can place hold on different book');
  });

  test('State transition: WAITING -> READY_FOR_PICKUP configures 48-hour claim window', () => {
    const hold = {
      id: 'res_staging_test',
      status: 'WAITING',
      queuePosition: 1,
    };

    function markReadyForPickup(reservation, slot = 'Hold Staging Slot H-04') {
      if (reservation.status !== 'WAITING') return null;
      const now = new Date('2026-10-09T12:00:00Z');
      const expiry = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      return {
        ...reservation,
        status: 'READY_FOR_PICKUP',
        readyAt: now.toISOString(),
        expiresAt: expiry.toISOString(),
        pickupSlot: slot,
      };
    }

    const staged = markReadyForPickup(hold);
    assert.equal(staged.status, 'READY_FOR_PICKUP');
    assert.equal(staged.pickupSlot, 'Hold Staging Slot H-04');
    assert.equal(staged.expiresAt, '2026-10-11T12:00:00.000Z');
  });

  test('State transition: READY_FOR_PICKUP -> CLAIMED fulfills reservation', () => {
    const stagedHold = {
      id: 'res_claim_test',
      status: 'READY_FOR_PICKUP',
      pickupSlot: 'Slot H-01',
    };

    function markClaimed(reservation) {
      if (reservation.status !== 'READY_FOR_PICKUP') return null;
      const now = new Date().toISOString();
      return {
        ...reservation,
        status: 'CLAIMED',
        claimedAt: now,
      };
    }

    const claimed = markClaimed(stagedHold);
    assert.equal(claimed.status, 'CLAIMED');
    assert.ok(claimed.claimedAt);
  });

  test('Cancellation shifts remaining waitlist queue positions forward', () => {
    let queue = [
      { id: 'r1', bookId: 'bk_target', status: 'WAITING', queuePosition: 1 },
      { id: 'r2', bookId: 'bk_target', status: 'WAITING', queuePosition: 2 },
      { id: 'r3', bookId: 'bk_target', status: 'WAITING', queuePosition: 3 },
    ];

    function cancelReservation(reservations, cancelId) {
      const target = reservations.find((r) => r.id === cancelId);
      if (!target) return reservations;

      let posCounter = 1;
      return reservations.map((r) => {
        if (r.id === cancelId) {
          return { ...r, status: 'CANCELLED', queuePosition: 0 };
        }
        if (r.bookId === target.bookId && r.status === 'WAITING') {
          return { ...r, queuePosition: posCounter++ };
        }
        return r;
      });
    }

    // Cancel the first reservation in line
    const afterCancel = cancelReservation(queue, 'r1');
    const cancelled = afterCancel.find((r) => r.id === 'r1');
    const newFirst = afterCancel.find((r) => r.id === 'r2');
    const newSecond = afterCancel.find((r) => r.id === 'r3');

    assert.equal(cancelled.status, 'CANCELLED');
    assert.equal(newFirst.queuePosition, 1, 'r2 moves to position #1');
    assert.equal(newSecond.queuePosition, 2, 'r3 moves to position #2');
  });
});
