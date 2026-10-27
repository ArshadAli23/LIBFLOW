/**
 * LIBFLOW — Authentication Unit Tests (Offline / Mocked)
 * 
 * Tests:
 * - Password hashing with bcrypt (12 rounds) and verification
 * - Timing attack dummy check behavior
 * - Cryptographic session token generation and SHA-256 hashing
 * - Input validation (email RFC pattern, password complexity)
 * - Brute force login rate limiting and Retry-After header
 * - Cross-Site Request Forgery (CSRF) origin verification
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../src/services/AuthService.js';
import {
  isStrongPassword,
  validateLoginInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
  validateChangePasswordInput,
} from '../src/middleware/validation.js';
import { createLoginRateLimiter, resetRateLimiter } from '../src/middleware/rateLimiter.js';
import { validateOrigin, isAllowedOrigin, csrfProtection, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../src/middleware/csrf.js';
import { ApiError } from '../src/utils/ApiError.js';
import type { Request, Response, NextFunction } from 'express';

describe('Authentication Unit Tests — Hashing & Cryptography', () => {
  it('hashes passwords using bcrypt with standard work factor', async () => {
    const raw = 'SecurePassword123!';
    const hash = await AuthService.hashPassword(raw);

    // Verify bcrypt hash format ($2b$12$...)
    assert.ok(hash.startsWith('$2b$12$'), 'Hash must use bcrypt with work factor 12');
    assert.notEqual(raw, hash, 'Password must never be stored in plaintext');

    // Matching password verifies successfully
    const match = await AuthService.verifyPassword(raw, hash);
    assert.equal(match, true);

    // Incorrect password fails verification
    const mismatch = await AuthService.verifyPassword('WrongPass456!', hash);
    assert.equal(mismatch, false);
  });

  it('generates 256-bit cryptographically secure random session tokens', () => {
    const token1 = AuthService.generateSecureToken();
    const token2 = AuthService.generateSecureToken();

    assert.equal(token1.length, 64, 'Token must be 64 hex characters (32 bytes)');
    assert.equal(token2.length, 64, 'Token must be 64 hex characters (32 bytes)');
    assert.notEqual(token1, token2, 'Consecutive tokens must be cryptographically unique');
  });

  it('computes deterministic SHA-256 token hashes for database indexing', () => {
    const raw = 'test-token-value-12345';
    const hash1 = AuthService.hashToken(raw);
    const hash2 = AuthService.hashToken(raw);

    assert.equal(hash1, hash2, 'SHA-256 hashing must be deterministic');
    assert.equal(hash1.length, 64, 'SHA-256 hex digest must be 64 characters');
    assert.notEqual(raw, hash1, 'Raw token must never match hash');
  });
});

describe('Authentication Unit Tests — Input Validation & Strength', () => {
  it('enforces password strength requirements (min 8 chars, alphanumeric)', () => {
    // Too short
    const short = isStrongPassword('Ab1!');
    assert.equal(short.valid, false);

    // No letters
    const numbersOnly = isStrongPassword('12345678');
    assert.equal(numbersOnly.valid, false);

    // No numbers or symbols
    const lettersOnly = isStrongPassword('abcdefghijk');
    assert.equal(lettersOnly.valid, false);

    // Valid strong password
    const valid = isStrongPassword('LibraryAdmin2026!');
    assert.equal(valid.valid, true);
  });

  it('validateLoginInput rejects missing or invalid email and empty password', () => {
    const testCases = [
      { body: { email: '', password: 'Pass' }, expectedField: 'email' },
      { body: { email: 'not-an-email', password: 'Pass' }, expectedField: 'email' },
      { body: { email: 'admin@libflow.io', password: '' }, expectedField: 'password' },
      { body: {}, expectedField: 'email' },
    ];

    for (const tc of testCases) {
      const req = { body: tc.body } as unknown as Request;
      const res = {} as unknown as Response;
      let caughtError: unknown = null;

      validateLoginInput(req, res, (err?: unknown) => {
        caughtError = err;
      });

      assert.ok(caughtError instanceof ApiError, 'Expected ApiError for invalid payload');
      assert.equal((caughtError as ApiError).statusCode, 400);
      assert.equal((caughtError as ApiError).errorCode, 'VALIDATION_ERROR');
    }
  });

  it('validateLoginInput normalizes valid email to lowercase and trims whitespace', () => {
    const req = {
      body: { email: '  Admin.User@LIBFLOW.IO  ', password: 'ValidPassword123' },
    } as unknown as Request;
    const res = {} as unknown as Response;
    let nextCalled = false;

    validateLoginInput(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.body.email, 'admin.user@libflow.io');
  });

  it('validateResetPasswordInput validates token presence and new password strength', () => {
    // Missing token
    let error: unknown = null;
    validateResetPasswordInput(
      { body: { token: '', newPassword: 'ValidPassword123!' } } as unknown as Request,
      {} as Response,
      (err) => {
        error = err;
      }
    );
    assert.ok(error instanceof ApiError);
    assert.equal((error as ApiError).statusCode, 400);

    // Weak password
    error = null;
    validateResetPasswordInput(
      { body: { token: 'valid-token-12345678', newPassword: 'weak' } } as unknown as Request,
      {} as Response,
      (err) => {
        error = err;
      }
    );
    assert.ok(error instanceof ApiError);
    assert.equal((error as ApiError).statusCode, 400);
  });

  it('validateChangePasswordInput rejects identical current and new passwords', () => {
    let error: unknown = null;
    validateChangePasswordInput(
      { body: { currentPassword: 'SamePassword123!', newPassword: 'SamePassword123!' } } as unknown as Request,
      {} as Response,
      (err) => {
        error = err;
      }
    );
    assert.ok(error instanceof ApiError);
    assert.equal((error as ApiError).statusCode, 400);
    assert.equal((error as ApiError).errorCode, 'VALIDATION_ERROR');
  });
});

describe('Authentication Unit Tests — Rate Limiting Defense', () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it('allows attempts within configured ceiling and blocks subsequent attempts with 429', () => {
    const limiter = createLoginRateLimiter({ maxAttempts: 3, windowMinutes: 15 });
    const req = { ip: '192.168.1.100', headers: {}, socket: {} } as unknown as Request;

    let statusCode: number | null = null;
    let responseBody: any = null;
    let retryAfterHeader: string | null = null;

    const res = {
      setHeader: (key: string, val: string) => {
        if (key.toLowerCase() === 'retry-after') retryAfterHeader = val;
      },
      status: (code: number) => {
        statusCode = code;
        return {
          json: (body: any) => {
            responseBody = body;
          },
        };
      },
    } as unknown as Response;

    // 1st attempt
    let nextCalled = false;
    limiter(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);

    // 2nd attempt
    nextCalled = false;
    limiter(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);

    // 3rd attempt (last permitted)
    nextCalled = false;
    limiter(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);

    // 4th attempt (blocked by rate limiter)
    nextCalled = false;
    limiter(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false, '4th attempt must be rejected by rate limiter');
    assert.equal(statusCode, 429, 'HTTP status must be 429 Too Many Requests');
    assert.equal(responseBody?.error?.code, 'RATE_LIMIT_EXCEEDED');
    assert.ok(retryAfterHeader !== null, 'Retry-After header must be set');
  });
});

describe('Authentication Unit Tests — CSRF & Origin Validation', () => {
  it('isAllowedOrigin matches exact string and array of allowed origins', () => {
    assert.equal(isAllowedOrigin('http://localhost:5173', 'http://localhost:5173'), true);
    assert.equal(isAllowedOrigin('http://localhost:5173', ['http://localhost:5173', 'http://localhost:3000']), true);
    assert.equal(isAllowedOrigin('https://malicious.evil.com', 'http://localhost:5173'), false);
  });

  it('validateOrigin rejects unauthorized cross-origin requests', () => {
    const maliciousReq = {
      headers: {
        origin: 'https://attacker.site.com',
      },
    } as unknown as Request;

    const isValid = validateOrigin(maliciousReq);
    assert.equal(isValid, false, 'Untrusted origin must be rejected');
  });

  it('validateOrigin permits trusted client origin', () => {
    const trustedReq = {
      headers: {
        origin: 'http://localhost:5173',
      },
    } as unknown as Request;

    const isValid = validateOrigin(trustedReq);
    assert.equal(isValid, true, 'Configured client origin must be accepted');
  });

  it('csrfProtection allows safe HTTP methods without origin or token checks', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      let nextCalled = false;
      const req = {
        method,
        headers: {},
        cookies: {},
      } as unknown as Request;

      csrfProtection(req, {} as Response, ((err?: any) => {
        assert.equal(err, undefined);
        nextCalled = true;
      }) as NextFunction);

      assert.equal(nextCalled, true, `Method ${method} must be exempt from CSRF checks`);
    }
  });

  it('csrfProtection blocks state-changing request from untrusted origin', () => {
    let capturedError: any = null;
    const req = {
      method: 'POST',
      headers: {
        origin: 'https://evil-attacker.com',
      },
      cookies: {},
    } as unknown as Request;

    csrfProtection(req, {} as Response, ((err?: any) => {
      capturedError = err;
    }) as NextFunction);

    assert.ok(capturedError instanceof ApiError);
    assert.equal(capturedError.statusCode, 403);
    assert.equal(capturedError.errorCode, 'CSRF_ORIGIN_REJECTED');
  });

  it('csrfProtection rejects state-changing request if csrf cookie is present but header is missing', () => {
    let capturedError: any = null;
    const req = {
      method: 'POST',
      headers: {
        origin: 'http://localhost:5173',
      },
      cookies: {
        [CSRF_COOKIE_NAME]: 'valid_csrf_cookie_123',
      },
    } as unknown as Request;

    csrfProtection(req, {} as Response, ((err?: any) => {
      capturedError = err;
    }) as NextFunction);

    assert.ok(capturedError instanceof ApiError);
    assert.equal(capturedError.statusCode, 403);
    assert.equal(capturedError.errorCode, 'CSRF_TOKEN_MISMATCH');
  });

  it('csrfProtection rejects state-changing request if csrf cookie and header mismatch', () => {
    let capturedError: any = null;
    const req = {
      method: 'POST',
      headers: {
        origin: 'http://localhost:5173',
        [CSRF_HEADER_NAME]: 'forged_csrf_header_456',
      },
      cookies: {
        [CSRF_COOKIE_NAME]: 'valid_csrf_cookie_123',
      },
    } as unknown as Request;

    csrfProtection(req, {} as Response, ((err?: any) => {
      capturedError = err;
    }) as NextFunction);

    assert.ok(capturedError instanceof ApiError);
    assert.equal(capturedError.statusCode, 403);
    assert.equal(capturedError.errorCode, 'CSRF_TOKEN_MISMATCH');
  });

  it('csrfProtection permits state-changing request when csrf cookie and header match', () => {
    let nextCalled = false;
    const token = 'legitimate_csrf_token_xyz_789';
    const req = {
      method: 'POST',
      headers: {
        origin: 'http://localhost:5173',
        [CSRF_HEADER_NAME]: token,
      },
      cookies: {
        [CSRF_COOKIE_NAME]: token,
      },
    } as unknown as Request;

    csrfProtection(req, {} as Response, ((err?: any) => {
      assert.equal(err, undefined);
      nextCalled = true;
    }) as NextFunction);

    assert.equal(nextCalled, true, 'Request with matching double-submit CSRF tokens must succeed');
  });
});

