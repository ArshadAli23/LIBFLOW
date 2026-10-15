/**
 * LIBFLOW — Database Unit Tests (Offline / Mock-Free)
 * 
 * Verifies environment variable validation, credential sanitization,
 * SQL schema definitions, foreign key integrity, and constraint completeness.
 * Does NOT require a running MySQL instance.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validateDatabaseConfig,
  getSanitizedDatabaseConfig,
  type DatabaseEnvConfig,
} from '../src/config/env.js';
import { sanitizeDatabaseError } from '../src/config/database.js';
import { loadMigrationFiles } from '../src/db/migrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Database Unit Tests — Configuration & Sanitization', () => {
  const validBaseConfig: DatabaseEnvConfig = {
    host: 'localhost',
    port: 3306,
    user: 'libflow_user',
    password: 'super_secret_password',
    database: 'libflow_db',
    connectionLimit: 10,
  };

  it('accepts valid database configuration in development', () => {
    const result = validateDatabaseConfig(validBaseConfig, 'development');
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('rejects invalid host, port, user, and database names', () => {
    const invalidConfig: DatabaseEnvConfig = {
      host: '',
      port: 99999,
      user: '   ',
      password: '',
      database: '',
      connectionLimit: -5,
    };

    const result = validateDatabaseConfig(invalidConfig, 'development');
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('DB_HOST')));
    assert.ok(result.errors.some((e) => e.includes('DB_PORT')));
    assert.ok(result.errors.some((e) => e.includes('DB_USER')));
    assert.ok(result.errors.some((e) => e.includes('DB_NAME')));
    assert.ok(result.errors.some((e) => e.includes('DB_CONNECTION_LIMIT')));
  });

  it('enforces mandatory DB_PASSWORD in production environment', () => {
    const configWithoutPw: DatabaseEnvConfig = {
      ...validBaseConfig,
      password: '',
    };

    const prodResult = validateDatabaseConfig(configWithoutPw, 'production');
    assert.equal(prodResult.valid, false);
    assert.ok(prodResult.errors.some((e) => e.includes('DB_PASSWORD is mandatory in production')));

    const devResult = validateDatabaseConfig(configWithoutPw, 'development');
    assert.equal(devResult.valid, true);
  });

  it('getSanitizedDatabaseConfig strips credentials and preserves connection telemetry', () => {
    const sanitized = getSanitizedDatabaseConfig(validBaseConfig);
    assert.equal(sanitized.host, 'localhost');
    assert.equal(sanitized.port, 3306);
    assert.equal(sanitized.user, 'libflow_user');
    assert.equal(sanitized.database, 'libflow_db');
    assert.equal(sanitized.connectionLimit, 10);
    assert.equal((sanitized as any).password, undefined);
  });

  it('sanitizeDatabaseError masks sensitive database passwords from error traces', () => {
    const rawError = new Error('Access denied for user libflow_user using password: super_secret_password');
    const safeError = sanitizeDatabaseError(rawError);
    assert.ok(!safeError.includes('super_secret_password'));
    assert.ok(safeError.includes('***'));
  });
});

describe('Database Schema & Migration DDL Verification', () => {
  let schemaSql = '';

  it('discovers and loads version-controlled migration files in order', async () => {
    const migrationsDir = path.resolve(__dirname, '../src/db/migrations');
    const files = await loadMigrationFiles(migrationsDir);
    assert.ok(files.length >= 1);
    assert.equal(files[0].version, '001');
    assert.equal(files[0].filename, '001_initial_schema.sql');

    schemaSql = await fs.readFile(files[0].fullPath, 'utf8');
    assert.ok(schemaSql.length > 500);
  });

  it('contains DDL for all 9 required relational domain tables and version tracker', () => {
    const requiredTables = [
      'schema_migrations',
      'users',
      'books',
      'book_copies',
      'members',
      'loans',
      'reservations',
      'fines',
      'notifications',
      'audit_logs',
    ];

    for (const table of requiredTables) {
      const pattern = new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, 'i');
      assert.ok(
        pattern.test(schemaSql),
        `Migration DDL must include CREATE TABLE statement for "${table}"`
      );
    }
  });

  it('enforces foreign key constraints between relational entities', () => {
    const expectedForeignKeys = [
      'CONSTRAINT fk_book_copies_book FOREIGN KEY (book_id) REFERENCES books(id)',
      'CONSTRAINT fk_copy_events_copy FOREIGN KEY (copy_id) REFERENCES book_copies(id)',
      'CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(id)',
      'CONSTRAINT fk_loans_member FOREIGN KEY (member_id) REFERENCES members(id)',
      'CONSTRAINT fk_loans_book FOREIGN KEY (book_id) REFERENCES books(id)',
      'CONSTRAINT fk_loans_book_copy FOREIGN KEY (book_copy_id) REFERENCES book_copies(id)',
      'CONSTRAINT fk_reservations_member FOREIGN KEY (member_id) REFERENCES members(id)',
      'CONSTRAINT fk_reservations_book FOREIGN KEY (book_id) REFERENCES books(id)',
      'CONSTRAINT fk_reservations_assigned_copy FOREIGN KEY (assigned_copy_id) REFERENCES book_copies(id)',
      'CONSTRAINT fk_fines_member FOREIGN KEY (member_id) REFERENCES members(id)',
      'CONSTRAINT fk_fines_loan FOREIGN KEY (loan_id) REFERENCES loans(id)',
      'CONSTRAINT fk_fine_payments_fine FOREIGN KEY (fine_id) REFERENCES fines(id)',
      'CONSTRAINT fk_fine_waivers_fine FOREIGN KEY (fine_id) REFERENCES fines(id)',
    ];

    for (const fk of expectedForeignKeys) {
      assert.ok(
        schemaSql.includes(fk),
        `Migration DDL must include foreign key definition: ${fk}`
      );
    }
  });

  it('enforces compound tenant uniqueness and performance indexes', () => {
    const expectedIndexes = [
      'uq_users_tenant_email (tenant_id, email)',
      'uq_books_tenant_isbn (tenant_id, isbn)',
      'uq_book_copies_tenant_barcode (tenant_id, barcode)',
      'uq_members_tenant_member_id (tenant_id, member_id)',
      'uq_members_tenant_email (tenant_id, email)',
      'uq_loans_tenant_loan_number (tenant_id, loan_number)',
      'uq_reservations_tenant_res_number (tenant_id, reservation_number)',
      'uq_fines_tenant_fine_number (tenant_id, fine_number)',
      'ft_books_search (title, description, publisher)',
    ];

    for (const idx of expectedIndexes) {
      assert.ok(
        schemaSql.includes(idx),
        `Migration DDL must include unique/compound index: ${idx}`
      );
    }
  });

  it('SECURITY CHECK: members table strictly excludes passwords and password hashes', () => {
    // Extract members CREATE TABLE block
    const membersTableMatch = schemaSql.match(/CREATE TABLE IF NOT EXISTS members\s*\(([\s\S]*?)\)\s*ENGINE=InnoDB/i);
    assert.ok(membersTableMatch, 'members table block must be found in DDL');
    const membersDdl = membersTableMatch[1].toLowerCase();

    assert.equal(
      membersDdl.includes('password'),
      false,
      'SECURITY VIOLATION: members table must never contain password column'
    );
    assert.equal(
      membersDdl.includes('password_hash'),
      false,
      'SECURITY VIOLATION: members table must never contain password_hash column'
    );

    // Verify users table DOES contain password_hash
    const usersTableMatch = schemaSql.match(/CREATE TABLE IF NOT EXISTS users\s*\(([\s\S]*?)\)\s*ENGINE=InnoDB/i);
    assert.ok(usersTableMatch, 'users table block must be found in DDL');
    assert.ok(
      usersTableMatch[1].toLowerCase().includes('password_hash'),
      'users table must hold password_hash for authentication'
    );
  });
});
