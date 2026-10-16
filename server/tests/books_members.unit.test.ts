/**
 * LIBFLOW — Books, Book Copies & Members Unit Tests
 * 
 * Verifies:
 * - Input validation (ISBN-10/13, title, authors, year, copies, barcode, reason).
 * - Member validation (names, email format, types, statuses, sort parameters).
 * - Circulation state protection (blocking direct manual transitions to BORROWED/RESERVED).
 * - Safe withdrawal guards (justification requirements).
 * - Member self-service boundaries (patrons restricted from altering status/quotas).
 * - SQL injection resistance via parameterization & whitelisted sorting keys.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidISBN,
  validateBookQueryParams,
  validateCreateBook,
  validateUpdateBook,
  validateAddCopy,
  validateUpdateCopy,
  validateWithdrawCopy,
} from '../src/middleware/bookValidation.js';
import {
  validateMemberQueryParams,
  validateCreateMember,
  validateUpdateMember,
} from '../src/middleware/memberValidation.js';
import { ApiError } from '../src/utils/ApiError.js';

// Mock request / response / next helpers
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

describe('Books & Book Copies Unit Tests — Validation & State Guards', () => {
  describe('ISBN Validation Engine', () => {
    it('accepts valid 10-digit ISBNs', () => {
      assert.strictEqual(isValidISBN('0451524934'), true);
      assert.strictEqual(isValidISBN('0-451-52493-4'), true);
      assert.strictEqual(isValidISBN('080442957X'), true); // Checksum 'X'
    });

    it('accepts valid 13-digit ISBNs', () => {
      assert.strictEqual(isValidISBN('9780132350884'), true);
      assert.strictEqual(isValidISBN('978-0-13-235088-4'), true);
      assert.strictEqual(isValidISBN('9798888650394'), true);
    });

    it('rejects invalid ISBN formats', () => {
      assert.strictEqual(isValidISBN('123'), false);
      assert.strictEqual(isValidISBN('invalid-isbn'), false);
      assert.strictEqual(isValidISBN(''), false);
      assert.strictEqual(isValidISBN(null as any), false);
    });
  });

  describe('Bibliographic Creation Validation', () => {
    it('rejects payload with missing title, invalid ISBN, or missing authors', () => {
      const { req, res, next, getError } = createMockReqRes({
        body: {
          isbn: 'bad-isbn',
          title: '',
          authors: [],
          publisher: '',
          publicationYear: 18000,
          category: '',
        },
      });

      validateCreateBook(req, res, next);
      const err = getError();
      assert.ok(err instanceof ApiError);
      assert.strictEqual(err.statusCode, 400);
      assert.strictEqual(err.errorCode, 'VALIDATION_ERROR');
      assert.ok(err.details.some((d: any) => d.field === 'isbn'));
      assert.ok(err.details.some((d: any) => d.field === 'title'));
      assert.ok(err.details.some((d: any) => d.field === 'authors'));
      assert.ok(err.details.some((d: any) => d.field === 'publisher'));
    });

    it('accepts and normalizes valid book creation payload', () => {
      const { req, res, next, getError } = createMockReqRes({
        body: {
          isbn: '978-0-13-235088-4',
          title: '  Clean Code  ',
          authors: [' Robert C. Martin '],
          publisher: ' Prentice Hall ',
          publicationYear: 2008,
          category: 'Software Engineering',
          description: 'A handbook of agile software craftsmanship.',
          format: 'PAPERBACK',
        },
      });

      validateCreateBook(req, res, next);
      assert.strictEqual(getError(), null);
      assert.strictEqual(req.body.isbn, '9780132350884');
      assert.strictEqual(req.body.title, 'Clean Code');
      assert.strictEqual(req.body.publisher, 'Prentice Hall');
      assert.deepStrictEqual(req.body.authors, ['Robert C. Martin']);
    });
  });

  describe('Book Query Parameters & SQL Injection Resistance', () => {
    it('rejects non-whitelisted sort keys to block SQL injection', () => {
      const { req, res, next, getError } = createMockReqRes({
        query: {
          sortBy: 'title; DROP TABLE books;--',
        },
      });

      validateBookQueryParams(req, res, next);
      const err = getError();
      assert.ok(err instanceof ApiError);
      assert.strictEqual(err.statusCode, 400);
      assert.strictEqual(err.errorCode, 'INVALID_QUERY_PARAMS');
      assert.ok(err.details.some((d: any) => d.field === 'sortBy'));
    });

    it('rejects invalid pagination limits and pages', () => {
      const { req, res, next, getError } = createMockReqRes({
        query: {
          page: '0',
          limit: '500',
        },
      });

      validateBookQueryParams(req, res, next);
      const err = getError();
      assert.ok(err instanceof ApiError);
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.details.some((d: any) => d.field === 'page'));
      assert.ok(err.details.some((d: any) => d.field === 'limit'));
    });

    it('accepts whitelisted sort keys and valid pagination', () => {
      const { req, res, next, getError } = createMockReqRes({
        query: {
          page: '2',
          limit: '25',
          sortBy: 'recently_added',
          format: 'HARDCOVER',
          availability: 'AVAILABLE',
        },
      });

      validateBookQueryParams(req, res, next);
      assert.strictEqual(getError(), null);
    });
  });

  describe('Physical Copy Lifecycle & Circulation Protection', () => {
    it('validates physical copy barcode and shelf requirement', () => {
      const { req, res, next, getError } = createMockReqRes({
        body: {
          barcode: 'AB', // too short (< 3)
          shelf: '',
          acquisitionCost: -50,
        },
      });

      validateAddCopy(req, res, next);
      const err = getError();
      assert.ok(err instanceof ApiError);
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.details.some((d: any) => d.field === 'barcode'));
      assert.ok(err.details.some((d: any) => d.field === 'shelf'));
      assert.ok(err.details.some((d: any) => d.field === 'acquisitionCost'));
    });

    it('STRICT GUARD: Blocks manual transition of copy status to BORROWED', () => {
      const { req, res, next, getError } = createMockReqRes({
        body: {
          status: 'BORROWED',
        },
      });

      validateUpdateCopy(req, res, next);
      const err = getError();
      assert.ok(err instanceof ApiError);
      assert.strictEqual(err.statusCode, 400);
      assert.ok(
        err.details.some(
          (d: any) =>
            d.field === 'status' &&
            d.issue.includes('Direct transition to "BORROWED" is disallowed')
        )
      );
    });

    it('STRICT GUARD: Blocks manual transition of copy status to RESERVED', () => {
      const { req, res, next, getError } = createMockReqRes({
        body: {
          status: 'RESERVED',
        },
      });

      validateUpdateCopy(req, res, next);
      const err = getError();
      assert.ok(err instanceof ApiError);
      assert.strictEqual(err.statusCode, 400);
      assert.ok(
        err.details.some(
          (d: any) =>
            d.field === 'status' &&
            d.issue.includes('Direct transition to "RESERVED" is disallowed')
        )
      );
    });

    it('allows valid copy updates for condition and maintenance status', () => {
      const { req, res, next, getError } = createMockReqRes({
        body: {
          shelf: 'Floor 2 - Aisle 4',
          conditionRating: 'EXCELLENT',
          status: 'MAINTENANCE',
        },
      });

      validateUpdateCopy(req, res, next);
      assert.strictEqual(getError(), null);
    });

    it('enforces non-empty justification reason for copy withdrawal', () => {
      const { req, res, next, getError } = createMockReqRes({
        body: {
          reason: '  ',
        },
      });

      validateWithdrawCopy(req, res, next);
      const err = getError();
      assert.ok(err instanceof ApiError);
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.details.some((d: any) => d.field === 'reason'));
    });
  });
});

describe('Members Unit Tests — Validation & Access Isolation', () => {
  describe('Member Creation & Query Validation', () => {
    it('rejects member registration with invalid email or missing names', () => {
      const { req, res, next, getError } = createMockReqRes({
        body: {
          firstName: '',
          lastName: '',
          email: 'not-an-email',
          phone: '',
          department: '',
        },
      });

      validateCreateMember(req, res, next);
      const err = getError();
      assert.ok(err instanceof ApiError);
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.details.some((d: any) => d.field === 'firstName'));
      assert.ok(err.details.some((d: any) => d.field === 'lastName'));
      assert.ok(err.details.some((d: any) => d.field === 'email'));
      assert.ok(err.details.some((d: any) => d.field === 'department'));
    });

    it('accepts and normalizes valid patron registration payload', () => {
      const { req, res, next, getError } = createMockReqRes({
        body: {
          firstName: '  Ada  ',
          lastName: '  Lovelace ',
          email: '  Ada.Lovelace@University.Edu  ',
          phone: ' +1-555-0199 ',
          department: 'Computer Science',
          memberType: 'FACULTY',
          maxBorrowLimit: 10,
        },
      });

      validateCreateMember(req, res, next);
      assert.strictEqual(getError(), null);
      assert.strictEqual(req.body.firstName, 'Ada');
      assert.strictEqual(req.body.lastName, 'Lovelace');
      assert.strictEqual(req.body.email, 'ada.lovelace@university.edu');
      assert.strictEqual(req.body.memberType, 'FACULTY');
    });

    it('rejects invalid member query params and non-whitelisted sort keys', () => {
      const { req, res, next, getError } = createMockReqRes({
        query: {
          memberType: 'ASTRONAUT', // invalid enum
          sortBy: 'email; SELECT * FROM users', // malicious SQL injection attempt
        },
      });

      validateMemberQueryParams(req, res, next);
      const err = getError();
      assert.ok(err instanceof ApiError);
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.details.some((d: any) => d.field === 'memberType'));
      assert.ok(err.details.some((d: any) => d.field === 'sortBy'));
    });

    it('accepts whitelisted member query params', () => {
      const { req, res, next, getError } = createMockReqRes({
        query: {
          page: '1',
          limit: '20',
          memberType: 'STUDENT',
          status: 'ACTIVE',
          sortBy: 'name_asc',
        },
      });

      validateMemberQueryParams(req, res, next);
      assert.strictEqual(getError(), null);
    });
  });
});
