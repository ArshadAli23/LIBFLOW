/**
 * LIBFLOW — Live MySQL Integration Tests
 * 
 * STRICT ARCHITECTURAL RULE:
 * - These tests require an active, running MySQL 8+ server.
 * - If MySQL is offline / unreachable, the test runner cleanly skips them with
 *   an explicit notice.
 * - Under NO circumstances will this test falsely claim live MySQL operations passed
 *   if MySQL was not reached.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';

describe('Live MySQL Database Integration Tests (Requires Running MySQL Server)', async () => {
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
      `\n[MySQL Integration Tests SKIPPED] MySQL server at ${env.DB.host}:${env.DB.port} is not reachable. Live integration tests skipped.\n`
    );

    it.skip('Live MySQL: verify server connectivity and version', () => {
      // Skipped because MySQL is offline
    });

    it.skip('Live MySQL: verify transactional rollback isolation', () => {
      // Skipped because MySQL is offline
    });

    it.skip('Live MySQL: verify foreign key constraint rejection', () => {
      // Skipped because MySQL is offline
    });

    return;
  }

  // --- Real MySQL tests only execute below if MySQL is genuinely reachable ---

  it('Live MySQL: verify server connectivity and version', async () => {
    const conn = await mysql.createConnection({
      host: env.DB.host,
      port: env.DB.port,
      user: env.DB.user,
      password: env.DB.password,
    });

    try {
      const [rows] = await conn.query<any[]>('SELECT VERSION() as version');
      assert.ok(rows && rows[0]?.version);
      console.log(`[Integration Passed] Live MySQL version: ${rows[0].version}`);
    } finally {
      await conn.end();
    }
  });

  it('Live MySQL: verify transactional rollback isolation', async () => {
    const conn = await mysql.createConnection({
      host: env.DB.host,
      port: env.DB.port,
      user: env.DB.user,
      password: env.DB.password,
      database: env.DB.database,
    });

    try {
      const rollbackUserId = `usr_tx_rollback_${Date.now()}`;
      await conn.beginTransaction();
      await conn.query(
        "INSERT INTO users (id, tenant_id, email, password_hash, role, full_name, is_active) VALUES (?, 'default-library', ?, 'hash', 'MEMBER', 'Rollback User', 1)",
        [rollbackUserId, `${rollbackUserId}@test.libflow.io`]
      );
      await conn.rollback();

      // Ensure transaction rolled back cleanly - row must not exist
      const [rows] = await conn.query<any[]>(
        'SELECT id FROM users WHERE id = ?',
        [rollbackUserId]
      );
      assert.equal(rows.length, 0, 'Inserted row must not persist after rollback');
    } finally {
      await conn.end();
    }
  });

  it('Live MySQL: verify foreign key constraint rejection', async () => {
    const conn = await mysql.createConnection({
      host: env.DB.host,
      port: env.DB.port,
      user: env.DB.user,
      password: env.DB.password,
      database: env.DB.database,
    });

    try {
      let rejected = false;
      try {
        await conn.query(
          "INSERT INTO loans (id, tenant_id, loan_number, member_id, book_id, book_copy_id, copy_barcode, checkout_date, due_date, status) VALUES ('ln_invalid', 'default-library', 'LN-0000', 'mem_nonexistent', 'book_01', 'copy_01', 'LC-9999', NOW(), NOW(), 'ACTIVE')"
        );
      } catch (err: any) {
        if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
          rejected = true;
        }
      }
      assert.ok(rejected, 'MySQL must reject insertion with invalid foreign key');
    } finally {
      await conn.end();
    }
  });
});
