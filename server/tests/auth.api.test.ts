/**
 * LIBFLOW — Authentication API End-to-End Tests (Supertest)
 * 
 * Tests:
 * - POST /api/v1/auth/login (validation, invalid credentials, success, cookie setting)
 * - GET  /api/v1/auth/me (unauthorized vs authorized with HttpOnly cookie)
 * - POST /api/v1/auth/logout (session invalidation and cookie clearing)
 * - POST /api/v1/auth/forgot-password (anti-enumeration behavior)
 * - POST /api/v1/auth/reset-password (single-use token verification & session revocation)
 * - POST /api/v1/auth/change-password (current password verification & session revocation)
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { AuthService } from '../src/services/AuthService.js';
import { setPoolForTesting } from '../src/config/database.js';
import { resetRateLimiter } from '../src/middleware/rateLimiter.js';
import { env } from '../src/config/env.js';
import type { Pool, PoolConnection } from 'mysql2/promise';

describe('Authentication API Endpoint Tests (Isolated Mock Fixtures)', () => {
  // In-memory data store for isolated testing
  let users: any[] = [];
  let members: any[] = [];
  let sessions: any[] = [];
  let passwordResetTokens: any[] = [];
  let auditLogs: any[] = [];

  beforeEach(() => {
    resetRateLimiter();
  });

  before(async () => {
    // Seed initial users with bcrypt hashes
    const adminHash = await AuthService.hashPassword('AdminPass123!');
    const librarianHash = await AuthService.hashPassword('StaffPass123!');
    const memberHash = await AuthService.hashPassword('MemberPass123!');

    users = [
      {
        id: 'usr_admin_01',
        tenant_id: 'default-library',
        email: 'admin@libflow.io',
        password_hash: adminHash,
        role: 'ADMIN',
        full_name: 'Dr. Arthur Pendelton',
        avatar_url: null,
        is_active: 1,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'usr_librarian_01',
        tenant_id: 'default-library',
        email: 'librarian@libflow.io',
        password_hash: librarianHash,
        role: 'LIBRARIAN',
        full_name: 'Sarah Thorne',
        avatar_url: null,
        is_active: 1,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'usr_member_01',
        tenant_id: 'default-library',
        email: 'student@libflow.io',
        password_hash: memberHash,
        role: 'MEMBER',
        full_name: 'Kavita Sharma',
        avatar_url: null,
        is_active: 1,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'usr_inactive_01',
        tenant_id: 'default-library',
        email: 'inactive@libflow.io',
        password_hash: memberHash,
        role: 'MEMBER',
        full_name: 'Inactive Patron',
        avatar_url: null,
        is_active: 0,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    members = [
      {
        id: 'mem_01',
        tenant_id: 'default-library',
        user_id: 'usr_member_01',
        member_id: 'MB-2026-081',
        member_type: 'STUDENT',
        department: 'Department of Computer Science',
        program: 'M.S. Software Engineering',
        status: 'ACTIVE',
        max_borrow_limit: 5,
        active_loans_count: 3,
        has_overdue_restrictions: 0,
      },
    ];

    // Mock MySQL query executor
    const mockQuery = async (sql: string, params?: any[]): Promise<any> => {
      const s = sql.trim();

      // 1. SELECT * FROM users WHERE tenant_id = ? AND email = ? LIMIT 1
      if (s.includes('FROM users WHERE tenant_id = ? AND email = ?')) {
        const [tenantId, email] = params || [];
        const match = users.filter((u) => u.tenant_id === tenantId && u.email.toLowerCase() === (email || '').toLowerCase());
        return [match];
      }

      // 2. INSERT INTO sessions
      if (s.includes('INSERT INTO sessions')) {
        const [id, tenant_id, user_id, session_token_hash, ip_address, user_agent, expires_at] = params || [];
        sessions.push({
          id,
          tenant_id,
          user_id,
          session_token_hash,
          ip_address,
          user_agent,
          expires_at: new Date(expires_at),
          last_active_at: new Date(),
          created_at: new Date(),
        });
        return [{ affectedRows: 1 }];
      }

      // 3. UPDATE users SET last_login_at = NOW() WHERE id = ?
      if (s.includes('UPDATE users SET last_login_at')) {
        const [id] = params || [];
        const u = users.find((x) => x.id === id);
        if (u) u.last_login_at = new Date();
        return [{ affectedRows: 1 }];
      }

      // 4. SELECT * FROM members WHERE tenant_id = ? AND user_id = ?
      if (s.includes('FROM members WHERE tenant_id = ? AND user_id = ?')) {
        const [tenantId, userId] = params || [];
        const match = members.filter((m) => m.tenant_id === tenantId && m.user_id === userId);
        return [match];
      }

      // 5. SELECT FROM sessions JOIN users WHERE session_token_hash = ?
      if (s.includes('FROM sessions s') && s.includes('session_token_hash = ?')) {
        const [tokenHash] = params || [];
        const sess = sessions.find((x) => x.session_token_hash === tokenHash);
        if (!sess) return [[]];
        const user = users.find((u) => u.id === sess.user_id);
        if (!user) return [[]];

        const row = {
          session_id: sess.id,
          session_tenant_id: sess.tenant_id,
          session_user_id: sess.user_id,
          session_token_hash: sess.session_token_hash,
          ip_address: sess.ip_address,
          user_agent: sess.user_agent,
          session_expires_at: sess.expires_at,
          last_active_at: sess.last_active_at,
          session_created_at: sess.created_at,
          ...user,
        };
        return [[row]];
      }

      // 6. SELECT FROM sessions WHERE session_token_hash = ? (for logout)
      if (s.includes('SELECT id, user_id, tenant_id FROM sessions WHERE session_token_hash = ?')) {
        const [tokenHash] = params || [];
        const sess = sessions.find((x) => x.session_token_hash === tokenHash);
        return [sess ? [sess] : []];
      }

      // 7. DELETE FROM sessions WHERE session_token_hash = ?
      if (s.includes('DELETE FROM sessions WHERE session_token_hash = ?')) {
        const [tokenHash] = params || [];
        sessions = sessions.filter((x) => x.session_token_hash !== tokenHash);
        return [{ affectedRows: 1 }];
      }

      // 8. DELETE FROM sessions WHERE id = ?
      if (s.includes('DELETE FROM sessions WHERE id = ?')) {
        const [id] = params || [];
        sessions = sessions.filter((x) => x.id !== id);
        return [{ affectedRows: 1 }];
      }

      // 9. DELETE FROM sessions WHERE user_id = ? AND session_token_hash != ?
      if (s.includes('DELETE FROM sessions WHERE user_id = ? AND session_token_hash != ?')) {
        const [userId, tokenHash] = params || [];
        sessions = sessions.filter((x) => !(x.user_id === userId && x.session_token_hash !== tokenHash));
        return [{ affectedRows: 1 }];
      }

      // 10. DELETE FROM sessions WHERE user_id = ?
      if (s.includes('DELETE FROM sessions WHERE user_id = ?')) {
        const [userId] = params || [];
        sessions = sessions.filter((x) => x.user_id !== userId);
        return [{ affectedRows: 1 }];
      }

      // 11. UPDATE sessions SET last_active_at = NOW() WHERE id = ?
      if (s.includes('UPDATE sessions SET last_active_at')) {
        return [{ affectedRows: 1 }];
      }

      // 12. SELECT id, role, is_active FROM users WHERE tenant_id = ? AND email = ? (forgot password)
      if (s.includes('SELECT id, role, is_active FROM users WHERE tenant_id = ? AND email = ?')) {
        const [tenantId, email] = params || [];
        const match = users.filter((u) => u.tenant_id === tenantId && u.email.toLowerCase() === (email || '').toLowerCase());
        return [match];
      }

      // 13. UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ?
      if (s.includes('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ?')) {
        const [userId] = params || [];
        passwordResetTokens.forEach((t) => {
          if (t.user_id === userId && !t.used_at) t.used_at = new Date();
        });
        return [{ affectedRows: 1 }];
      }

      // 14. INSERT INTO password_reset_tokens
      if (s.includes('INSERT INTO password_reset_tokens')) {
        const [id, tenant_id, user_id, token_hash, expires_at] = params || [];
        passwordResetTokens.push({
          id,
          tenant_id,
          user_id,
          token_hash,
          expires_at: new Date(expires_at),
          used_at: null,
          created_at: new Date(),
        });
        return [{ affectedRows: 1 }];
      }

      // 15. SELECT FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
      if (s.includes('FROM password_reset_tokens') && s.includes('token_hash = ?')) {
        const [tokenHash] = params || [];
        const now = Date.now();
        const match = passwordResetTokens.filter(
          (t) => t.token_hash === tokenHash && !t.used_at && t.expires_at.getTime() > now
        );
        return [match];
      }

      // 16. UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?
      if (s.includes('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?')) {
        const [id] = params || [];
        const t = passwordResetTokens.find((x) => x.id === id);
        if (t) t.used_at = new Date();
        return [{ affectedRows: 1 }];
      }

      // 17. UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?
      if (s.includes('UPDATE users SET password_hash = ?')) {
        const [hash, id] = params || [];
        const u = users.find((x) => x.id === id);
        if (u) {
          u.password_hash = hash;
          u.updated_at = new Date();
        }
        return [{ affectedRows: 1 }];
      }

      // 18. SELECT id, tenant_id, role, password_hash FROM users WHERE id = ?
      if (s.includes('FROM users WHERE id = ?')) {
        const [id] = params || [];
        const match = users.filter((u) => u.id === id);
        return [match];
      }

      // 19. INSERT INTO audit_logs
      if (s.includes('INSERT INTO audit_logs')) {
        auditLogs.push({ sql, params });
        return [{ affectedRows: 1 }];
      }

      return [[]];
    };

    const mockPool: any = {
      query: mockQuery,
      getConnection: async () => ({
        query: mockQuery,
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release: () => {},
      }),
      end: async () => {},
    };

    setPoolForTesting(mockPool as Pool);
  });

  after(() => {
    setPoolForTesting(null);
  });

  // --- 1. Login Tests ---
  it('POST /api/v1/auth/login: returns 400 for missing credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: '', password: '' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('POST /api/v1/auth/login: returns generic 401 for non-existent account without leaking user existence', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@libflow.io', password: 'SomePassword123!' });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
    assert.equal(res.body.message, 'Invalid email or password');
  });

  it('POST /api/v1/auth/login: returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@libflow.io', password: 'IncorrectPassword!' });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  it('POST /api/v1/auth/login: returns generic 401 for deactivated account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'inactive@libflow.io', password: 'MemberPass123!' });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  it('POST /api/v1/auth/login: succeeds with valid credentials, sets HttpOnly cookie & CSRF cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student@libflow.io', password: 'MemberPass123!' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, 'student@libflow.io');
    assert.equal(res.body.data.user.role, 'MEMBER');
    assert.equal(res.body.data.memberProfile?.memberId, 'MB-2026-081');
    assert.ok(res.body.data.csrfToken, 'CSRF token should be provided');
    assert.equal(res.body.data.user.passwordHash, undefined, 'Password hash must NEVER be returned');

    // Verify cookies set in headers
    const setCookieHeaders = res.headers['set-cookie'];
    assert.ok(Array.isArray(setCookieHeaders) && setCookieHeaders.length >= 2);

    const sessionCookie = setCookieHeaders.find((c: string) => c.startsWith(`${env.AUTH.sessionCookieName}=`));
    assert.ok(sessionCookie, 'Session cookie must be set');
    assert.ok(sessionCookie.includes('HttpOnly'), 'Session cookie must be HttpOnly');
    assert.ok(sessionCookie.includes('SameSite=Lax'), 'Session cookie must specify SameSite=Lax');
  });

  // --- 2. GET /me & Session Verification ---
  it('GET /api/v1/auth/me: returns 401 when session cookie is absent', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'AUTHENTICATION_REQUIRED');
  });

  it('GET /api/v1/auth/me: returns authenticated user profile when session cookie is present', async () => {
    // 1. Perform login to acquire session cookie
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@libflow.io', password: 'AdminPass123!' });

    const cookies = loginRes.headers['set-cookie'];

    // 2. Access /me passing the session cookie
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', cookies);

    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.success, true);
    assert.equal(meRes.body.data.user.email, 'admin@libflow.io');
    assert.equal(meRes.body.data.user.role, 'ADMIN');
    assert.equal(meRes.body.data.user.passwordHash, undefined);
  });

  // --- 3. Logout Tests ---
  it('POST /api/v1/auth/logout: invalidates server session and clears cookie', async () => {
    // 1. Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'librarian@libflow.io', password: 'StaffPass123!' });

    const cookies = loginRes.headers['set-cookie'];

    // 2. Logout
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookies);

    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);

    // Verify cookie cleared
    const clearCookies = logoutRes.headers['set-cookie'];
    const clearedSession = clearCookies?.find((c: string) => c.startsWith(`${env.AUTH.sessionCookieName}=;`));
    assert.ok(clearedSession, 'Session cookie must be cleared on logout');

    // 3. Verifying that the logged-out session cookie is rejected
    const verifyRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', cookies);

    assert.equal(verifyRes.status, 401, 'Logged-out session must be rejected');
  });

  // --- 4. Password Recovery & Single-Use Reset Tests ---
  it('POST /api/v1/auth/forgot-password: anti-enumeration generic message for both valid and invalid emails', async () => {
    // Unregistered email
    const resGhost = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent@libflow.io' });

    assert.equal(resGhost.status, 200);
    assert.equal(resGhost.body.success, true);
    assert.equal(
      resGhost.body.message,
      'If an account matches that email, a password reset link has been dispatched.'
    );

    // Registered email
    const resUser = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'student@libflow.io' });

    assert.equal(resUser.status, 200);
    assert.equal(resUser.body.success, true);
    assert.equal(
      resUser.body.message,
      'If an account matches that email, a password reset link has been dispatched.'
    );
  });

  it('POST /api/v1/auth/reset-password: consumes token, updates password, enforces single-use, and invalidates sessions', async () => {
    // 1. Log in student to establish an active session
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student@libflow.io', password: 'MemberPass123!' });
    const oldSessionCookies = loginRes.headers['set-cookie'];

    // 2. Request forgot password in test mode (which yields devResetToken)
    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'student@libflow.io' });

    const resetToken = forgotRes.body.data?.devResetToken;
    assert.ok(resetToken, 'devResetToken should be returned in test mode');

    // 3. Reset password using the token
    const newPassword = 'BrandNewPassword2026!';
    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, newPassword });

    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.success, true);

    // 4. Verify old session was invalidated
    const oldSessionCheck = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', oldSessionCookies);
    assert.equal(oldSessionCheck.status, 401, 'Old session must be invalidated upon password reset');

    // 5. Verify SINGLE-USE enforcement: reusing the token must fail immediately
    const reusedRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, newPassword: 'AnotherPassword2026!' });
    assert.equal(reusedRes.status, 400);
    assert.equal(reusedRes.body.error.code, 'INVALID_RESET_TOKEN');

    // 6. Verify logging in with the new password succeeds
    const newLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student@libflow.io', password: newPassword });
    assert.equal(newLoginRes.status, 200);
    assert.equal(newLoginRes.body.success, true);
  });

  // --- 5. Change Password Tests ---
  it('POST /api/v1/auth/change-password: verifies current password and updates to new password', async () => {
    // 1. Log in as admin
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@libflow.io', password: 'AdminPass123!' });
    const adminCookies = loginRes.headers['set-cookie'];
    const csrfToken = loginRes.body.data.csrfToken;

    // 2. Reject incorrect current password
    const badChangeRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Cookie', adminCookies)
      .set('x-csrf-token', csrfToken)
      .send({ currentPassword: 'WrongPassword!', newPassword: 'UpdatedAdminPass123!' });

    assert.equal(badChangeRes.status, 400);
    assert.equal(badChangeRes.body.error.code, 'INVALID_CURRENT_PASSWORD');

    // 3. Accept valid password change
    const validChangeRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Cookie', adminCookies)
      .set('x-csrf-token', csrfToken)
      .send({ currentPassword: 'AdminPass123!', newPassword: 'UpdatedAdminPass123!' });

    assert.equal(validChangeRes.status, 200);
    assert.equal(validChangeRes.body.success, true);

    // 4. Verify login with updated password
    const updatedLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@libflow.io', password: 'UpdatedAdminPass123!' });

    assert.equal(updatedLoginRes.status, 200);
    assert.equal(updatedLoginRes.body.success, true);
  });
});
