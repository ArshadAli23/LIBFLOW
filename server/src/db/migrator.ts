/**
 * LIBFLOW — Database Migration Runner
 * 
 * Version-controlled SQL migration engine for MySQL 8+.
 * Discovers, tracks, and applies migrations transactionally.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql, { type Connection } from 'mysql2/promise';
import { env, getSanitizedDatabaseConfig } from '../config/env.js';
import { sanitizeDatabaseError } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MigrationRecord {
  id: number;
  version: string;
  name: string;
  applied_at: Date;
}

export interface MigrationFile {
  version: string;
  name: string;
  filename: string;
  fullPath: string;
}

/**
 * Creates a dedicated connection configured for schema migration operations
 * (with multipleStatements enabled).
 */
export const createMigrationConnection = async (): Promise<Connection> => {
  return await mysql.createConnection({
    host: env.DB.host,
    port: env.DB.port,
    user: env.DB.user,
    password: env.DB.password,
    database: env.DB.database,
    multipleStatements: true,
    charset: 'utf8mb4',
  });
};

/**
 * Ensures the `schema_migrations` tracking table exists.
 */
export const ensureMigrationTable = async (connection: Connection): Promise<void> => {
  const ddl = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      version VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_schema_migrations_version (version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await connection.query(ddl);
};

/**
 * Lists all migration files present in the migrations directory, sorted by version.
 */
export const loadMigrationFiles = async (migrationsDir?: string): Promise<MigrationFile[]> => {
  const targetDir = migrationsDir || path.resolve(__dirname, 'migrations');

  try {
    const entries = await fs.readdir(targetDir);
    const sqlFiles = entries.filter((f) => f.endsWith('.sql'));

    const migrations: MigrationFile[] = sqlFiles.map((filename) => {
      const match = filename.match(/^([^_]+)_(.+)\.sql$/);
      const version = match ? match[1] : filename.replace(/\.sql$/, '');
      const name = match ? match[2] : filename;
      return {
        version,
        name,
        filename,
        fullPath: path.join(targetDir, filename),
      };
    });

    migrations.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
    return migrations;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

/**
 * Fetches all migrations currently recorded in the database.
 */
export const getAppliedMigrations = async (connection: Connection): Promise<MigrationRecord[]> => {
  await ensureMigrationTable(connection);
  const [rows] = await connection.query<any[]>(
    'SELECT id, version, name, applied_at FROM schema_migrations ORDER BY id ASC'
  );
  return rows as MigrationRecord[];
};

/**
 * Executes all pending migrations in order.
 */
export const runMigrations = async (migrationsDir?: string): Promise<{
  applied: string[];
  alreadyUpToDate: boolean;
}> => {
  const sanitized = getSanitizedDatabaseConfig(env.DB);
  console.log(`[Migrator] Connecting to MySQL at ${sanitized.host}:${sanitized.port}/${sanitized.database}...`);

  let connection: Connection;
  try {
    connection = await createMigrationConnection();
  } catch (err) {
    const safeMsg = sanitizeDatabaseError(err);
    throw new Error(`Failed to establish database connection for migration: ${safeMsg}`);
  }

  const appliedVersions: string[] = [];

  try {
    await ensureMigrationTable(connection);
    const availableMigrations = await loadMigrationFiles(migrationsDir);
    const appliedRecords = await getAppliedMigrations(connection);
    const appliedSet = new Set(appliedRecords.map((r) => r.version));

    const pending = availableMigrations.filter((m) => !appliedSet.has(m.version));

    if (pending.length === 0) {
      console.log('[Migrator] Database schema is already up to date. Zero pending migrations.');
      return { applied: [], alreadyUpToDate: true };
    }

    console.log(`[Migrator] Found ${pending.length} pending migration(s) to apply.`);

    for (const migration of pending) {
      console.log(`[Migrator] Applying migration: ${migration.filename}...`);
      const sqlContent = await fs.readFile(migration.fullPath, 'utf8');

      await connection.beginTransaction();
      try {
        await connection.query(sqlContent);
        await connection.query('INSERT INTO schema_migrations (version, name) VALUES (?, ?)', [
          migration.version,
          migration.name,
        ]);
        await connection.commit();
        appliedVersions.push(migration.version);
        console.log(`[Migrator] Successfully applied ${migration.filename}`);
      } catch (migrationError: unknown) {
        await connection.rollback();
        const safeError = sanitizeDatabaseError(migrationError);
        console.error(`[Migrator ERROR] Failed while applying ${migration.filename}: ${safeError}`);
        throw new Error(`Migration ${migration.filename} failed: ${safeError}`);
      }
    }

    console.log(`[Migrator] Successfully applied ${appliedVersions.length} migration(s).`);
    return { applied: appliedVersions, alreadyUpToDate: false };
  } finally {
    await connection.end();
  }
};

/**
 * Displays current migration status.
 */
export const printMigrationStatus = async (migrationsDir?: string): Promise<void> => {
  let connection: Connection;
  try {
    connection = await createMigrationConnection();
  } catch (err) {
    const safeMsg = sanitizeDatabaseError(err);
    console.error(`[Migrator ERROR] Cannot check migration status. Database unreachable: ${safeMsg}`);
    return;
  }

  try {
    await ensureMigrationTable(connection);
    const availableMigrations = await loadMigrationFiles(migrationsDir);
    const appliedRecords = await getAppliedMigrations(connection);
    const appliedMap = new Map(appliedRecords.map((r) => [r.version, r]));

    console.log('\n--- LIBFLOW Database Migration Status ---');
    console.log(`Database: ${env.DB.database} on ${env.DB.host}:${env.DB.port}\n`);

    for (const m of availableMigrations) {
      const record = appliedMap.get(m.version);
      const status = record ? `APPLIED at ${new Date(record.applied_at).toISOString()}` : 'PENDING';
      console.log(`  [${record ? 'X' : ' '}] ${m.filename} — ${status}`);
    }
    console.log('-----------------------------------------\n');
  } finally {
    await connection.end();
  }
};

// Direct CLI invocation
const isDirectExecution =
  process.argv[1] &&
  (path.resolve(process.argv[1]) === path.resolve(__filename) ||
    process.argv[1].endsWith('migrator.ts') ||
    process.argv[1].endsWith('migrator.js'));

if (isDirectExecution) {
  const command = process.argv[2] || 'migrate';

  if (command === 'status') {
    printMigrationStatus()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  } else {
    runMigrations()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }
}
