/**
 * LIBFLOW — Server-Side Role-Based Access Control (RBAC) Unit Tests
 * 
 * Tests:
 * - Deny-by-default access control
 * - Server-side authentication enforcement on protected endpoints
 * - Role permission checks (ADMIN, LIBRARIAN, MEMBER)
 * - Fine-grained patron resource isolation (MEMBER-to-MEMBER access denial)
 * - Prevention of client-side role forgery
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { requireRole, requireMemberOwnership, extractSessionToken } from '../src/middleware/auth.js';
import { ApiError } from '../src/utils/ApiError.js';
import type { Request, Response } from 'express';
import type { UserEntity } from '../src/models/User.js';

// Fixture factory for mock user entities
const createMockUser = (overrides: Partial<UserEntity> = {}): UserEntity => ({
  id: 'usr_mock_01',
  tenantId: 'default-library',
  email: 'user@libflow.io',
  passwordHash: '$2b$12$dummyhash',
  role: 'MEMBER',
  fullName: 'Test User',
  avatarUrl: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('RBAC Unit Tests — Deny-by-Default & Authentication Guards', () => {
  it('extractSessionToken extracts from HttpOnly cookie primarily', () => {
    const req = {
      cookies: { libflow_session: 'cookie-session-token-123' },
      headers: { authorization: 'Bearer header-session-token-456' },
    } as unknown as Request;

    const token = extractSessionToken(req);
    assert.equal(token, 'cookie-session-token-123', 'Cookie must take precedence over header');
  });

  it('extractSessionToken falls back to Bearer header when cookie is absent', () => {
    const req = {
      cookies: {},
      headers: { authorization: 'Bearer header-session-token-456' },
    } as unknown as Request;

    const token = extractSessionToken(req);
    assert.equal(token, 'header-session-token-456');
  });

  it('requireRole denies unauthenticated requests by default (401)', () => {
    const req = {} as Request; // req.user is undefined
    const res = {} as Response;
    let caughtError: unknown = null;

    const guard = requireRole('ADMIN', 'LIBRARIAN');
    guard(req, res, (err) => {
      caughtError = err;
    });

    assert.ok(caughtError instanceof ApiError);
    assert.equal((caughtError as ApiError).statusCode, 401);
    assert.equal((caughtError as ApiError).errorCode, 'AUTHENTICATION_REQUIRED');
  });
});

describe('RBAC Unit Tests — Role Permission Verification', () => {
  it('requireRole strictly permits authorized roles and denies unauthorized roles (403)', () => {
    const adminUser = createMockUser({ role: 'ADMIN' });
    const librarianUser = createMockUser({ role: 'LIBRARIAN' });
    const memberUser = createMockUser({ role: 'MEMBER' });

    const adminGuard = requireRole('ADMIN');
    const staffGuard = requireRole('ADMIN', 'LIBRARIAN');

    // 1. Admin accessing Admin-only endpoint
    let error: unknown = undefined;
    let nextCalled = false;
    adminGuard({ user: adminUser } as Request, {} as Response, (err) => {
      if (err) error = err;
      else nextCalled = true;
    });
    assert.equal(nextCalled, true, 'ADMIN must be allowed on Admin-only routes');
    assert.equal(error, undefined);

    // 2. Librarian accessing Admin-only endpoint (must be denied)
    error = null;
    adminGuard({ user: librarianUser } as Request, {} as Response, (err) => {
      error = err;
    });
    assert.ok(error instanceof ApiError);
    assert.equal((error as ApiError).statusCode, 403);
    assert.equal((error as ApiError).errorCode, 'FORBIDDEN');

    // 3. Member accessing Admin-only endpoint (must be denied)
    error = null;
    adminGuard({ user: memberUser } as Request, {} as Response, (err) => {
      error = err;
    });
    assert.ok(error instanceof ApiError);
    assert.equal((error as ApiError).statusCode, 403);

    // 4. Librarian accessing Staff (Admin + Librarian) endpoint
    error = undefined;
    nextCalled = false;
    staffGuard({ user: librarianUser } as Request, {} as Response, (err) => {
      if (err) error = err;
      else nextCalled = true;
    });
    assert.equal(nextCalled, true, 'LIBRARIAN must be allowed on staff routes');
    assert.equal(error, undefined);

    // 5. Member accessing Staff endpoint (must be denied)
    error = null;
    staffGuard({ user: memberUser } as Request, {} as Response, (err) => {
      error = err;
    });
    assert.ok(error instanceof ApiError);
    assert.equal((error as ApiError).statusCode, 403);
  });

  it('rejects client-side role forgery attempted via body or headers', () => {
    // Authenticated user in server session has role MEMBER
    const memberUser = createMockUser({ role: 'MEMBER' });

    // Attacker sends role: 'ADMIN' in request body and headers
    const maliciousReq = {
      user: memberUser, // Server-resolved identity
      body: { role: 'ADMIN' },
      headers: { 'x-user-role': 'ADMIN' },
    } as unknown as Request;

    const adminGuard = requireRole('ADMIN');
    let error: unknown = null;

    adminGuard(maliciousReq, {} as Response, (err) => {
      error = err;
    });

    assert.ok(error instanceof ApiError, 'Must reject client-side role manipulation');
    assert.equal((error as ApiError).statusCode, 403);
  });
});

describe('RBAC Unit Tests — Member Resource Isolation', () => {
  it('allows MEMBER to access their own resources', () => {
    const member = createMockUser({ id: 'usr_student_01', role: 'MEMBER' });
    const req = {
      user: member,
      memberProfile: { memberId: 'MB-2026-001' },
      params: { memberId: 'MB-2026-001' },
    } as unknown as Request;

    const isolationGuard = requireMemberOwnership((r) => r.params.memberId);
    let error: unknown = undefined;
    let nextCalled = false;

    isolationGuard(req, {} as Response, (err) => {
      if (err) error = err;
      else nextCalled = true;
    });

    assert.equal(nextCalled, true, 'Member must have access to their own data');
    assert.equal(error, undefined);
  });

  it('DENIES MEMBER trying to access ANOTHER member’s resources (403)', () => {
    const studentA = createMockUser({ id: 'usr_student_01', role: 'MEMBER' });
    const req = {
      user: studentA,
      memberProfile: { memberId: 'MB-2026-001' },
      params: { memberId: 'MB-2026-999' }, // Student B's identifier
    } as unknown as Request;

    const isolationGuard = requireMemberOwnership((r) => r.params.memberId);
    let error: unknown = null;

    isolationGuard(req, {} as Response, (err) => {
      error = err;
    });

    assert.ok(error instanceof ApiError, 'Must reject member cross-patron inspection');
    assert.equal((error as ApiError).statusCode, 403);
    assert.equal((error as ApiError).errorCode, 'MEMBER_ACCESS_DENIED');
  });

  it('allows ADMIN and LIBRARIAN staff to inspect any member’s records for circulation duties', () => {
    const librarian = createMockUser({ id: 'usr_staff_01', role: 'LIBRARIAN' });
    const admin = createMockUser({ id: 'usr_admin_01', role: 'ADMIN' });

    const reqForLibrarian = {
      user: librarian,
      params: { memberId: 'MB-2026-999' },
    } as unknown as Request;

    const reqForAdmin = {
      user: admin,
      params: { memberId: 'MB-2026-999' },
    } as unknown as Request;

    const isolationGuard = requireMemberOwnership((r) => r.params.memberId);

    let error: unknown = undefined;
    let nextCalled = false;
    isolationGuard(reqForLibrarian, {} as Response, (err) => {
      if (err) error = err;
      else nextCalled = true;
    });
    assert.equal(nextCalled, true, 'Librarian must have access to patron records');
    assert.equal(error, undefined);

    error = undefined;
    nextCalled = false;
    isolationGuard(reqForAdmin, {} as Response, (err) => {
      if (err) error = err;
      else nextCalled = true;
    });
    assert.equal(nextCalled, true, 'Admin must have access to patron records');
    assert.equal(error, undefined);
  });
});
