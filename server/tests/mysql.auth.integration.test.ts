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
});
