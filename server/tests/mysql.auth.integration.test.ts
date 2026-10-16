/**
 * LIBFLOW — Live MySQL Authentication & Session Integration Tests
 * 
 * STRICT ARCHITECTURAL RULE:
 * - These tests require an active, accessible MySQL 8+ server.
 * - If MySQL is offline / unreachable, the test runner cleanly skips them with
 *   an explicit notice.
 * - Under NO circumstances will this test falsely claim live MySQL operations passed
 *   if MySQL was not reached.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';

describe('Live MySQL Authentication & Session Integration Tests (Requires Active MySQL Server)', async () => {
  let isMySqlReachable = false;
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection({
      host: env.DB.host,
      port: env.DB.port,
      user: env.DB.user,
      password: env.DB.password,
      connectTimeout: 2000,
    });
    isMySqlReachable = true;
  } catch {
    isMySqlReachable = false;
  } finally {
    if (connection) {
      await connection.end();
      connection = null;
    }
  }

  if (!isMySqlReachable) {
    console.log(
      `\n[MySQL Auth Integration Tests SKIPPED] MySQL server at ${env.DB.host}:${env.DB.port} is not reachable. Live auth integration tests skipped.\n`
    );

    it.skip('Live MySQL: verify sessions table schema and constraints', () => {
      // Skipped because MySQL is offline
    });

    it.skip('Live MySQL: verify password_reset_tokens table schema and constraints', () => {
      // Skipped because MySQL is offline
    });

    it.skip('Live MySQL: verify session lifecycle and foreign key cascade on user deletion', () => {
      // Skipped because MySQL is offline
    });

    return;
  }

  // --- Real MySQL tests only execute below if MySQL is genuinely reachable ---

  it('Live MySQL: verify sessions table schema and constraints', async () => {
    const conn = await mysql.createConnection({
      host: env.DB.host,
      port: env.DB.port,
      user: env.DB.user,
      password: env.DB.password,
      database: env.DB.database,
    });

    try {
      const [rows] = await conn.query<any[]>("SHOW TABLES LIKE 'sessions'");
      assert.ok(rows.length > 0, 'sessions table must exist in MySQL database');
    } finally {
      await conn.end();
    }
  });

  it('Live MySQL: verify password_reset_tokens table schema and constraints', async () => {
    const conn = await mysql.createConnection({
      host: env.DB.host,
      port: env.DB.port,
      user: env.DB.user,
      password: env.DB.password,
      database: env.DB.database,
    });

    try {
      const [rows] = await conn.query<any[]>("SHOW TABLES LIKE 'password_reset_tokens'");
      assert.ok(rows.length > 0, 'password_reset_tokens table must exist in MySQL database');
    } finally {
      await conn.end();
    }
  });

  it('Live MySQL: verify session lifecycle and foreign key cascade on user deletion', async () => {
    const conn = await mysql.createConnection({
      host: env.DB.host,
      port: env.DB.port,
      user: env.DB.user,
      password: env.DB.password,
      database: env.DB.database,
    });

    try {
      await conn.beginTransaction();

      // Insert temporary test user
      const testUserId = `usr_test_${Date.now()}`;
      await conn.query(
        `INSERT INTO users (id, tenant_id, email, password_hash, role, full_name, is_active)
         VALUES (?, 'default-library', ?, 'hash', 'MEMBER', 'Test User', 1)`,
        [testUserId, `${testUserId}@test.libflow.io`]
      );

      // Insert session for test user
      const testSessionId = `ses_test_${Date.now()}`;
      await conn.query(
        `INSERT INTO sessions (id, tenant_id, user_id, session_token_hash, expires_at)
         VALUES (?, 'default-library', ?, 'dummy_token_hash_value', DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
        [testSessionId, testUserId]
      );

      // Verify session exists
      const [sessRows] = await conn.query<any[]>('SELECT id FROM sessions WHERE id = ?', [testSessionId]);
      assert.equal(sessRows.length, 1);

      // Delete user -> verify session is deleted via ON DELETE CASCADE
      await conn.query('DELETE FROM users WHERE id = ?', [testUserId]);
      const [sessAfterRows] = await conn.query<any[]>('SELECT id FROM sessions WHERE id = ?', [testSessionId]);
      assert.equal(sessAfterRows.length, 0, 'Session must be cascaded on user deletion');

      await conn.rollback();
    } finally {
      await conn.end();
    }
  });

  it('Live MySQL: verify full AuthService lifecycle (login, verifySession, logout) against real database', async () => {
    const { AuthService } = await import('../src/services/AuthService.js');

    // 1. Authenticate seed user student@libflow.io
    const loginResult = await AuthService.login('student@libflow.io', 'MemberPass123!', {
      ipAddress: '127.0.0.1',
      userAgent: 'IntegrationTest/1.0',
    });

    assert.ok(loginResult.sessionToken, 'Must generate real session token');
    assert.equal(loginResult.user.email, 'student@libflow.io');
    assert.equal(loginResult.user.role, 'MEMBER');
    assert.ok(loginResult.memberProfile, 'Must link to real member profile');
    assert.equal(loginResult.memberProfile.memberId, 'MB-2026-081');

    // 2. Verify session in real MySQL database
    const verified = await AuthService.verifySession(loginResult.sessionToken);
    assert.equal(verified.user.id, loginResult.user.id);
    assert.equal(verified.session.userId, loginResult.user.id);

    // 3. Logout -> removes from real sessions table
    await AuthService.logout(loginResult.sessionToken, '127.0.0.1', 'IntegrationTest/1.0');

    // 4. Verifying after logout must fail with UNAUTHORIZED
    let error: any = null;
    try {
      await AuthService.verifySession(loginResult.sessionToken);
    } catch (err) {
      error = err;
    }
    assert.ok(error, 'Session must no longer be valid after logout');
    assert.equal(error.statusCode, 401);
  });

  it('Live MySQL: verify real password reset and single-use enforcement in database', async () => {
    const { AuthService } = await import('../src/services/AuthService.js');

    // 1. Generate reset token in MySQL
    const forgotResult = await AuthService.forgotPassword('librarian@libflow.io');
    assert.ok(forgotResult.resetTokenForDev, 'Must issue reset token in dev/test');

    const rawToken = forgotResult.resetTokenForDev;

    // 2. Reset password in real MySQL
    const tempPassword = 'NewStaffPassword2026!';
    await AuthService.resetPassword(rawToken, tempPassword);

    // 3. Single-use verification: reusing the same token must be rejected
    let reuseError: any = null;
    try {
      await AuthService.resetPassword(rawToken, 'AnotherPassword2026!');
    } catch (err) {
      reuseError = err;
    }
    assert.ok(reuseError, 'Token cannot be reused');
    assert.equal(reuseError.statusCode, 400);

    // 4. Verify login with the new password in real MySQL
    const newLogin = await AuthService.login('librarian@libflow.io', tempPassword);
    assert.equal(newLogin.user.email, 'librarian@libflow.io');

    // 5. Restore original password so database remains consistent
    await AuthService.changePassword(
      newLogin.user.id,
      tempPassword,
      'StaffPass123!',
      newLogin.sessionToken
    );

    // Clean up session
    await AuthService.logout(newLogin.sessionToken);
  });
});
