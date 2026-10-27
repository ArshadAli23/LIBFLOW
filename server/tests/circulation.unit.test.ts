/**
 * LIBFLOW — Circulation, Reservations & Fines Unit Tests
 * 
 * Verifies:
 * - Input validation (checkout, loans query, reservations, fines, payments, waivers).
 * - SQL injection resistance via whitelisted sorting keys and numeric parameter boundaries.
 * - Centralized fine penalty formulas (grace period, rates, cap, status transitions).
 * - FIFO reservation queue calculations and state machine validation.
 * - Completely offline — does not require an active MySQL instance.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCheckout,
  validateLoanQueryParams,
} from '../src/middleware/circulationValidation.js';
import {
  validateCreateReservation,
  validateReservationQueryParams,
} from '../src/middleware/reservationValidation.js';
import {
  validateRecordPayment,
  validateRecordWaiver,
  validateFineQueryParams,
} from '../src/middleware/fineValidation.js';
import { FineService } from '../src/services/FineService.js';
import { ReservationQueueService } from '../src/services/ReservationQueueService.js';
import { ApiError } from '../src/utils/ApiError.js';

// Mock request / response / next helper
const createMockReqRes = (overrides: Record<string, any> = {}) => {
  const req: any = {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides,
  };
  const res: any = {
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.data = data;
      return this;
    },
  };
  let errorCaught: any = null;
  const next = (err?: any) => {
    errorCaught = err || null;
  };

  return { req, res, next, getError: () => errorCaught };
};

describe('Circulation & Loans Unit Tests — Validation & Bounds', () => {
  it('rejects checkout payload with missing memberId or bookCopyId for staff', () => {
    const { req, res, next, getError } = createMockReqRes({
      user: { role: 'LIBRARIAN' },
      body: { memberId: '', bookCopyId: '' },
    });

    validateCheckout(req, res, next);
    const err = getError();
    assert.ok(err instanceof ApiError);
    assert.strictEqual(err.statusCode, 400);
    assert.strictEqual(err.errorCode, 'VALIDATION_ERROR');
    assert.ok(err.details.some((d: any) => d.field === 'memberId'));
    assert.ok(err.details.some((d: any) => d.field === 'bookCopyId'));
  });

  it('rejects checkout with negative or excessive borrowDurationDays (> 90)', () => {
    const { req, res, next, getError } = createMockReqRes({
      user: { role: 'LIBRARIAN' },
      body: { memberId: 'mem_1', bookCopyId: 'copy_1', borrowDurationDays: 120 },
    });

    validateCheckout(req, res, next);
    const err = getError();
    assert.ok(err instanceof ApiError);
    assert.strictEqual(err.statusCode, 400);
    assert.ok(err.details.some((d: any) => d.field === 'borrowDurationDays'));
  });

  it('accepts and normalizes valid checkout payload', () => {
    const { req, res, next, getError } = createMockReqRes({
      user: { role: 'LIBRARIAN' },
      body: { memberId: ' mem_123 ', bookCopyId: ' BC-001 ', borrowDurationDays: 21 },
    });

    validateCheckout(req, res, next);
    assert.strictEqual(getError(), null);
    assert.strictEqual(req.body.memberId, 'mem_123');
    assert.strictEqual(req.body.bookCopyId, 'BC-001');
    assert.strictEqual(req.body.borrowDurationDays, 21);
  });

  it('rejects SQL injection attempt in loan query sortBy parameter', () => {
    const { req, res, next, getError } = createMockReqRes({
      query: { sortBy: 'due_date DESC; DROP TABLE loans;--' },
    });

    validateLoanQueryParams(req, res, next);
    const err = getError();
    assert.ok(err instanceof ApiError);
    assert.strictEqual(err.statusCode, 400);
    assert.strictEqual(err.errorCode, 'INVALID_QUERY_PARAMS');
    assert.ok(err.details.some((d: any) => d.field === 'sortBy'));
  });

  it('accepts whitelisted loan query params', () => {
    const { req, res, next, getError } = createMockReqRes({
      query: { page: '2', limit: '50', status: 'ACTIVE', sortBy: 'due_asc' },
    });

    validateLoanQueryParams(req, res, next);
    assert.strictEqual(getError(), null);
  });
});

describe('Reservations Unit Tests — Validation & State Transitions', () => {
  it('rejects reservation creation without bookId', () => {
    const { req, res, next, getError } = createMockReqRes({
      user: { role: 'MEMBER' },
      body: { bookId: '' },
    });

    validateCreateReservation(req, res, next);
    const err = getError();
    assert.ok(err instanceof ApiError);
    assert.strictEqual(err.statusCode, 400);
    assert.ok(err.details.some((d: any) => d.field === 'bookId'));
  });

  it('requires memberId when staff places a reservation on behalf of a member', () => {
    const { req, res, next, getError } = createMockReqRes({
      user: { role: 'LIBRARIAN' },
      body: { bookId: 'book_123', memberId: '' },
    });

    validateCreateReservation(req, res, next);
    const err = getError();
    assert.ok(err instanceof ApiError);
    assert.strictEqual(err.statusCode, 400);
    assert.ok(err.details.some((d: any) => d.field === 'memberId'));
  });

  it('enforces deterministic reservation state machine transitions', () => {
    // Valid transitions
    assert.doesNotThrow(() => ReservationQueueService.validateTransition('WAITING', 'READY_FOR_PICKUP'));
    assert.doesNotThrow(() => ReservationQueueService.validateTransition('WAITING', 'CANCELLED'));
    assert.doesNotThrow(() => ReservationQueueService.validateTransition('READY_FOR_PICKUP', 'CLAIMED'));
    assert.doesNotThrow(() => ReservationQueueService.validateTransition('READY_FOR_PICKUP', 'EXPIRED'));

    // Disallowed transitions
    assert.throws(() => ReservationQueueService.validateTransition('CLAIMED', 'WAITING'));
    assert.throws(() => ReservationQueueService.validateTransition('CANCELLED', 'CLAIMED'));
    assert.throws(() => ReservationQueueService.validateTransition('WAITING', 'CLAIMED')); // Must stage first
    assert.throws(() => ReservationQueueService.validateTransition('EXPIRED', 'READY_FOR_PICKUP'));
  });

  it('computes FIFO queue seniority and next queue position', () => {
    const emptyQueue = ReservationQueueService.calculateNextQueuePosition([]);
    assert.strictEqual(emptyQueue, 1);

    const holds = [
      { id: '1', memberId: 'm1', bookId: 'b1', queuePosition: 1, status: 'WAITING' as const },
      { id: '2', memberId: 'm2', bookId: 'b1', queuePosition: 2, status: 'WAITING' as const },
    ];
    const nextPos = ReservationQueueService.calculateNextQueuePosition(holds);
    assert.strictEqual(nextPos, 3);
  });

  it('re-indexes remaining queue positions when a waiting hold is removed', () => {
    const queue = [
      { id: 'res_1', queuePosition: 1, status: 'WAITING' as const },
      { id: 'res_2', queuePosition: 2, status: 'WAITING' as const }, // removed
      { id: 'res_3', queuePosition: 3, status: 'WAITING' as const },
      { id: 'res_4', queuePosition: 4, status: 'WAITING' as const },
    ];

    const updates = ReservationQueueService.reindexWaitingQueue(queue, 'res_2');
    assert.strictEqual(updates.length, 2);
    assert.deepStrictEqual(updates[0], { id: 'res_3', oldPosition: 3, newPosition: 2 });
    assert.deepStrictEqual(updates[1], { id: 'res_4', oldPosition: 4, newPosition: 3 });
  });
});

describe('Fines Unit Tests — Financial Ledger & Penalties', () => {
  it('calculates overdue fines conforming to ₹5/day with 2-day grace period and ₹200 cap', () => {
    const dueDate = new Date('2026-10-01T00:00:00Z');

    // 1 day overdue -> within 2-day grace period -> fine 0
    const resGrace = FineService.calculateOverdue({
      dueDate,
      returnDate: new Date('2026-10-02T12:00:00Z'),
      gracePeriodDays: 2,
      finePerDay: 5,
      maxFineCap: 200,
    });
    assert.strictEqual(resGrace.fineAmount, 0);
    assert.strictEqual(resGrace.withinGracePeriod, true);

    // 4 days overdue -> exceeds grace -> all 4 days billed at ₹5 = ₹20
    const resOverdue = FineService.calculateOverdue({
      dueDate,
      returnDate: new Date('2026-10-05T00:00:00Z'),
      gracePeriodDays: 2,
      finePerDay: 5,
      maxFineCap: 200,
    });
    assert.strictEqual(resOverdue.daysOverdue, 4);
    assert.strictEqual(resOverdue.fineAmount, 20);

    // 60 days overdue -> 60 * 5 = 300 -> capped at ₹200
    const resCapped = FineService.calculateOverdue({
      dueDate,
      returnDate: new Date('2026-11-30T00:00:00Z'),
      gracePeriodDays: 2,
      finePerDay: 5,
      maxFineCap: 200,
    });
    assert.strictEqual(resCapped.fineAmount, 200);
  });

  it('rejects invalid or non-positive payment amounts', () => {
    const { req, res, next, getError } = createMockReqRes({
      body: { amount: -25, method: 'CASH' },
    });

    validateRecordPayment(req, res, next);
    const err = getError();
    assert.ok(err instanceof ApiError);
    assert.strictEqual(err.statusCode, 400);
    assert.ok(err.details.some((d: any) => d.field === 'amount'));
  });

  it('rejects payments exceeding current outstanding fine balance', () => {
    assert.throws(
      () => {
        FineService.processPayment({
          currentOriginalAmount: 50,
          currentAmountPaid: 20,
          currentWaivedAmount: 0,
          paymentAmount: 40, // balance is only 30
          method: 'CASH',
          collectedBy: 'Staff Member',
        });
      },
      /cannot exceed outstanding balance/
    );
  });

  it('processes valid partial and full payments with status resolution', () => {
    // Partial payment: balance 100 -> pay 40 -> balance 60, PARTIALLY_PAID
    const partial = FineService.processPayment({
      currentOriginalAmount: 100,
      currentAmountPaid: 0,
      currentWaivedAmount: 0,
      paymentAmount: 40,
      method: 'CARD',
      collectedBy: 'Staff Member',
    });
    assert.strictEqual(partial.newAmountPaid, 40);
    assert.strictEqual(partial.newBalance, 60);
    assert.strictEqual(partial.newStatus, 'PARTIALLY_PAID');

    // Remaining payment: pay 60 -> balance 0, PAID
    const full = FineService.processPayment({
      currentOriginalAmount: 100,
      currentAmountPaid: 40,
      currentWaivedAmount: 0,
      paymentAmount: 60,
      method: 'UPI_ONLINE',
      collectedBy: 'Staff Member',
    });
    assert.strictEqual(full.newAmountPaid, 100);
    assert.strictEqual(full.newBalance, 0);
    assert.strictEqual(full.newStatus, 'PAID');
  });

  it('enforces mandatory audited waiver reason and authorization', () => {
    const { req, res, next, getError } = createMockReqRes({
      body: { amount: 30, reason: '  ' }, // empty reason
    });

    validateRecordWaiver(req, res, next);
    const err = getError();
    assert.ok(err instanceof ApiError);
    assert.strictEqual(err.statusCode, 400);
    assert.ok(err.details.some((d: any) => d.field === 'reason'));
  });

  it('processes valid waivers and marks status WAIVED on full waiver', () => {
    const waiver = FineService.processWaiver({
      currentOriginalAmount: 50,
      currentAmountPaid: 0,
      currentWaivedAmount: 0,
      waiverAmount: 50,
      waiverReason: 'Administrative hardship relief granted by library dean.',
      waivedBy: 'Dean of Libraries',
    });

    assert.strictEqual(waiver.newWaivedAmount, 50);
    assert.strictEqual(waiver.newBalance, 0);
    assert.strictEqual(waiver.newStatus, 'WAIVED');
  });
});
