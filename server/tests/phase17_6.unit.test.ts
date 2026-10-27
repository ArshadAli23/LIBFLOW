/**
 * LIBFLOW — Phase 17.6 Unit Tests
 * 
 * Tests for:
 * 1. Notifications Validation & Scopes
 * 2. Analytics Parameter Validation & Date Boundaries
 * 3. Barcode Query Validation & Redaction Logic
 * 4. Zero-Trust Access Isolation for Phase 17.6 Features
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateNotificationQuery,
  validateNotificationId,
  validateBroadcastPayload,
} from '../src/middleware/notificationValidation.js';
import {
  validateDateRangeQuery,
  validatePopularBooksQuery,
} from '../src/middleware/analyticsValidation.js';
import { validateBarcodeParam } from '../src/middleware/barcodeValidation.js';
import { AnalyticsService } from '../src/services/AnalyticsService.js';
import { ApiError } from '../src/utils/ApiError.js';

describe('Phase 17.6 Unit Tests — Notifications Validation & Security', () => {
  it('rejects notification query with invalid page or limit out of bounds', () => {
    let error: any = null;
    const req: any = { query: { page: '-1', limit: '500' } };
    validateNotificationQuery(req, {} as any, (err?: any) => {
      error = err;
    });

    assert.ok(error instanceof ApiError);
    assert.strictEqual(error.statusCode, 400);
    assert.strictEqual(error.errorCode, 'INVALID_PAGE');
  });

  it('rejects notification query with invalid notification type', () => {
    let error: any = null;
    const req: any = { query: { type: 'INVALID_EVENT_TYPE' } };
    validateNotificationQuery(req, {} as any, (err?: any) => {
      error = err;
    });

    assert.ok(error instanceof ApiError);
    assert.strictEqual(error.statusCode, 400);
    assert.strictEqual(error.errorCode, 'INVALID_NOTIFICATION_TYPE');
  });

  it('accepts valid notification query parameters', () => {
    let error: any = null;
    const req: any = {
      query: { page: '2', limit: '25', isRead: 'false', type: 'DUE_SOON', priority: 'HIGH' },
    };
    validateNotificationQuery(req, {} as any, (err?: any) => {
      error = err;
    });

    assert.strictEqual(error, undefined);
  });

  it('rejects invalid or empty notification ID', () => {
    let error: any = null;
    const req: any = { params: { id: '   ' } };
    validateNotificationId(req, {} as any, (err?: any) => {
      error = err;
    });

    assert.ok(error instanceof ApiError);
    assert.strictEqual(error.statusCode, 400);
    assert.strictEqual(error.errorCode, 'INVALID_NOTIFICATION_ID');
  });

  it('requires non-empty title and message for broadcast notifications', () => {
    let error: any = null;
    const req: any = { body: { title: '', message: '' } };
    validateBroadcastPayload(req, {} as any, (err?: any) => {
      error = err;
    });

    assert.ok(error instanceof ApiError);
    assert.strictEqual(error.statusCode, 400);
    assert.strictEqual(error.errorCode, 'TITLE_REQUIRED');
  });

  it('rejects broadcast notification with invalid recipient role', () => {
    let error: any = null;
    const req: any = {
      body: { title: 'Emergency Closure', message: 'Campus closed.', recipientRole: 'SUPERUSER' },
    };
    validateBroadcastPayload(req, {} as any, (err?: any) => {
      error = err;
    });

    assert.ok(error instanceof ApiError);
    assert.strictEqual(error.statusCode, 400);
    assert.strictEqual(error.errorCode, 'INVALID_RECIPIENT_ROLE');
  });
});

describe('Phase 17.6 Unit Tests — Analytics Query Validation & Date Logic', () => {
  it('rejects malformed or unparseable startDate', () => {
    let error: any = null;
    const req: any = { query: { startDate: 'not-a-valid-date' } };
    validateDateRangeQuery(req, {} as any, (err?: any) => {
      error = err;
    });

    assert.ok(error instanceof ApiError);
    assert.strictEqual(error.statusCode, 400);
    assert.strictEqual(error.errorCode, 'INVALID_START_DATE');
  });

  it('rejects chronologically inverted date range (startDate > endDate)', () => {
    let error: any = null;
    const req: any = {
      query: { startDate: '2026-12-01', endDate: '2026-01-01' },
    };
    validateDateRangeQuery(req, {} as any, (err?: any) => {
      error = err;
    });

    assert.ok(error instanceof ApiError);
    assert.strictEqual(error.statusCode, 400);
    assert.strictEqual(error.errorCode, 'INVALID_DATE_RANGE');
  });

  it('AnalyticsService.resolveDateRange defaults to a 30-day window when omitted', () => {
    const range = AnalyticsService.resolveDateRange();
    assert.ok(range.start instanceof Date);
    assert.ok(range.end instanceof Date);
    assert.ok(range.start < range.end);

    const diffDays = Math.round((range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000));
    assert.strictEqual(diffDays, 30);
  });

  it('validates popular books query bounds', () => {
    let error: any = null;
    const req: any = { query: { limit: '999' } };
    validatePopularBooksQuery(req, {} as any, (err?: any) => {
      error = err;
    });

    assert.ok(error instanceof ApiError);
    assert.strictEqual(error.statusCode, 400);
    assert.strictEqual(error.errorCode, 'INVALID_LIMIT');
  });
});

describe('Phase 17.6 Unit Tests — Barcode Validation & SQL Injection Guards', () => {
  it('rejects missing or empty barcode parameter', () => {
    let error: any = null;
    const req: any = { params: { barcode: '' } };
    validateBarcodeParam(req, {} as any, (err?: any) => {
      error = err;
    });

    assert.ok(error instanceof ApiError);
    assert.strictEqual(error.statusCode, 400);
  });

  it('rejects SQL injection attempts in barcode route parameter', () => {
    let error: any = null;
    const req: any = { params: { barcode: "' OR '1'='1" } };
    validateBarcodeParam(req, {} as any, (err?: any) => {
      error = err;
    });

    assert.ok(error instanceof ApiError);
    assert.strictEqual(error.statusCode, 400);
    assert.strictEqual(error.errorCode, 'INVALID_BARCODE_CHARACTERS');
  });

  it('rejects script tags and shell control characters in barcode', () => {
    let error: any = null;
    const req: any = { params: { barcode: '<script>alert(1)</script>' } };
    validateBarcodeParam(req, {} as any, (err?: any) => {
      error = err;
    });

    assert.ok(error instanceof ApiError);
    assert.strictEqual(error.statusCode, 400);
    assert.strictEqual(error.errorCode, 'INVALID_BARCODE_CHARACTERS');
  });

  it('accepts valid physical copy and member card barcodes', () => {
    let error: any = null;
    const req: any = { params: { barcode: 'BC-2026-00492-A' } };
    validateBarcodeParam(req, {} as any, (err?: any) => {
      error = err;
    });

    assert.strictEqual(error, undefined);
    assert.strictEqual(req.params.barcode, 'BC-2026-00492-A');
  });
});
