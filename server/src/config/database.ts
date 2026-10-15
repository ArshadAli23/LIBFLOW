/**
 * LIBFLOW — MySQL Database Connection & Lifecycle Manager
 * 
 * Provides robust connection pooling via mysql2/promise, health telemetry,
 * transaction orchestration, and graceful shutdown without leaking credentials.
 */

import mysql, { type Pool, type PoolConnection } from 'mysql2/promise';
import { env, getSanitizedDatabaseConfig, type SanitizedDatabaseEnvConfig } from './env.js';

export interface DatabaseHealth {
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR';
  connected: boolean;
  host: string;
  port: number;
  database: string;
  sanitizedConfig: SanitizedDatabaseEnvConfig;
  activeConnections?: number;
  idleConnections?: number;
  lastPingAt?: string | null;
  latencyMs?: number | null;
  error?: string | null;
}

let pool: Pool | null = null;
let lastConnectionError: string | null = null;
let lastPingTime: Date | null = null;
let lastPingLatency: number | null = null;
let isConnected = false;

/**
 * Returns or initializes the shared MySQL connection pool.
 */
export const getPool = (): Pool => {
  if (!pool) {
    pool = mysql.createPool({
      host: env.DB.host,
      port: env.DB.port,
      user: env.DB.user,
      password: env.DB.password,
      database: env.DB.database,
      waitForConnections: true,
      connectionLimit: env.DB.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      charset: 'utf8mb4',
    });
  }
  return pool;
};

/**
 * Sets or clears the active database pool for test suites.
 */
export const setPoolForTesting = (customPool: Pool | null): void => {
  pool = customPool;
};


/**
 * Sanitizes any raw database error message to prevent accidental credential leakage.
 */
export const sanitizeDatabaseError = (error: unknown, customPassword?: string): string => {
  if (!error) return 'Unknown database error';
  let message = error instanceof Error ? error.message : String(error);

  const pwd = customPassword || env.DB.password;
  if (pwd && pwd.length > 0) {
    message = message.split(pwd).join('***');
  }

  // Common pattern replacements: password=secret, password: secret, password secret
  message = message.replace(/(password[:=\s]+)(['"]?)([^\s'";,]+)\2/gi, '$1$2***$2');
  return message;
};

/**
 * Validates connectivity to the MySQL database instance.
 * Never throws — updates internal telemetry and returns connection success boolean.
 */
export const pingDatabase = async (): Promise<boolean> => {
  const currentPool = getPool();
  const startTime = Date.now();

  try {
    const connection = await currentPool.getConnection();
    try {
      await connection.ping();
      const latency = Date.now() - startTime;
      isConnected = true;
      lastConnectionError = null;
      lastPingTime = new Date();
      lastPingLatency = latency;
      return true;
    } finally {
      connection.release();
    }
  } catch (error: unknown) {
    isConnected = false;
    lastPingLatency = null;
    const safeMsg = sanitizeDatabaseError(error);
    lastConnectionError = safeMsg;
    return false;
  }
};

/**
 * Returns real-time database connection telemetry and health status.
 * Strictly reflects actual MySQL state — never claims connected unless verified.
 */
export const getDatabaseHealth = (): DatabaseHealth => {
  const sanitized = getSanitizedDatabaseConfig(env.DB);

  return {
    status: isConnected ? 'CONNECTED' : lastConnectionError ? 'ERROR' : 'DISCONNECTED',
    connected: isConnected,
    host: sanitized.host,
    port: sanitized.port,
    database: sanitized.database,
    sanitizedConfig: sanitized,
    lastPingAt: lastPingTime ? lastPingTime.toISOString() : null,
    latencyMs: lastPingLatency,
    error: lastConnectionError,
  };
};

/**
 * Initializes the MySQL database connection pool and verifies connectivity.
 * 
 * Startup behavior:
 * - Production: Fails fast if connection cannot be established.
 * - Development & Test: Starts in degraded state (API UP, Database DISCONNECTED)
 *   so health diagnostics, offline tests, and documentation routes remain accessible.
 */
export const connectDatabase = async (): Promise<boolean> => {
  const sanitized = getSanitizedDatabaseConfig(env.DB);
  console.log(
    `[Database] Initializing MySQL connection pool for "${sanitized.user}@${sanitized.host}:${sanitized.port}/${sanitized.database}" (limit: ${sanitized.connectionLimit})...`
  );

  const currentPool = getPool();
  const startTime = Date.now();

  try {
    const connection = await currentPool.getConnection();
    try {
      await connection.query('SELECT 1 AS connected');
      isConnected = true;
      lastConnectionError = null;
      lastPingTime = new Date();
      lastPingLatency = Date.now() - startTime;
      console.log(
        `[Database] Successfully established MySQL connection to "${sanitized.database}" at ${sanitized.host}:${sanitized.port} (${lastPingLatency}ms).`
      );
      return true;
    } finally {
      connection.release();
    }
  } catch (error: unknown) {
    isConnected = false;
    const safeError = sanitizeDatabaseError(error);
    lastConnectionError = safeError;

    if (env.NODE_ENV === 'production') {
      console.error(`[Database FATAL] Failed to connect to MySQL: ${safeError}`);
      throw new Error(`Failed to connect to MySQL: ${safeError}`);
    }

    console.warn(
      `[Database WARNING] Failed to connect to MySQL (${safeError}). Running in degraded state (API UP, Database DISCONNECTED).`
    );
    return false;
  }
};

/**
 * Closes the MySQL pool cleanly during graceful shutdown.
 */
export const disconnectDatabase = async (): Promise<void> => {
  if (pool) {
    try {
      console.log('[Database] Draining and closing MySQL connection pool...');
      await pool.end();
      pool = null;
      isConnected = false;
      console.log('[Database] MySQL connection pool closed cleanly.');
    } catch (err: unknown) {
      console.error('[Database ERROR] Error occurred while closing MySQL pool:', sanitizeDatabaseError(err));
    }
  }
};

/**
 * Executes a callback within a managed MySQL transaction.
 * Automatically commits on success and rolls back on failure.
 */
export const withTransaction = async <T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> => {
  const currentPool = getPool();
  const connection = await currentPool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error: unknown) {
    try {
      await connection.rollback();
    } catch (rollbackError: unknown) {
      console.error(
        '[Database ERROR] Failed to rollback transaction:',
        sanitizeDatabaseError(rollbackError)
      );
    }
    throw error;
  } finally {
    connection.release();
  }
};
