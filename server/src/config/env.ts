/**
 * LIBFLOW — Environment Configuration & Validation
 * 
 * Centralized, validated environment configuration for MySQL 8+ and Express.
 * Prevents insecure defaults in production and protects credentials from leaking into logs.
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from server root if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface DatabaseEnvConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  connectionLimit: number;
}

export interface SanitizedDatabaseEnvConfig {
  host: string;
  port: number;
  user: string;
  database: string;
  connectionLimit: number;
}

export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  API_PREFIX: string;
  CORS_ORIGIN: string | string[];
  CLIENT_URL: string;
  REQUEST_LIMIT: string;
  LOG_LEVEL: string;
  DB: DatabaseEnvConfig;
}

/**
 * Validates database environment variables.
 * Returns boolean and an array of diagnostic messages.
 */
export const validateDatabaseConfig = (
  dbConfig: DatabaseEnvConfig,
  nodeEnv: string
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!dbConfig.host || typeof dbConfig.host !== 'string' || dbConfig.host.trim().length === 0) {
    errors.push('DB_HOST is missing or invalid.');
  }

  if (
    !Number.isFinite(dbConfig.port) ||
    dbConfig.port <= 0 ||
    dbConfig.port > 65535 ||
    !Number.isInteger(dbConfig.port)
  ) {
    errors.push(`DB_PORT must be an integer between 1 and 65535 (received: ${dbConfig.port}).`);
  }

  if (!dbConfig.user || typeof dbConfig.user !== 'string' || dbConfig.user.trim().length === 0) {
    errors.push('DB_USER is missing or invalid.');
  }

  if (!dbConfig.database || typeof dbConfig.database !== 'string' || dbConfig.database.trim().length === 0) {
    errors.push('DB_NAME is missing or invalid.');
  }

  if (
    !Number.isFinite(dbConfig.connectionLimit) ||
    dbConfig.connectionLimit < 1 ||
    dbConfig.connectionLimit > 1000
  ) {
    errors.push(`DB_CONNECTION_LIMIT must be a number between 1 and 1000 (received: ${dbConfig.connectionLimit}).`);
  }

  if (nodeEnv === 'production') {
    if (!dbConfig.password || dbConfig.password.trim().length === 0) {
      errors.push('DB_PASSWORD is mandatory in production environment.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Returns a sanitized copy of database configuration suitable for telemetry and logs.
 * Never includes DB_PASSWORD.
 */
export const getSanitizedDatabaseConfig = (dbConfig: DatabaseEnvConfig): SanitizedDatabaseEnvConfig => {
  return {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database,
    connectionLimit: dbConfig.connectionLimit,
  };
};

const nodeEnv = (process.env.NODE_ENV || 'development').trim().toLowerCase() as
  | 'development'
  | 'production'
  | 'test';

const port = Number.parseInt(process.env.PORT || '5000', 10);
const safePort = Number.isFinite(port) && port > 0 && port < 65536 ? port : 5000;

const apiPrefix = (process.env.API_PREFIX || '/api/v1').trim();

// Parse CORS Origin
const rawCorsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
let corsOrigin: string | string[];

if (rawCorsOrigin.includes(',')) {
  corsOrigin = rawCorsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
} else {
  corsOrigin = rawCorsOrigin.trim();
}

// In production, reject wildcard CORS origin
if (nodeEnv === 'production') {
  if (corsOrigin === '*' || (Array.isArray(corsOrigin) && corsOrigin.includes('*'))) {
    console.warn(
      '[SECURITY WARNING] Wildcard CORS_ORIGIN ("*") is prohibited in production. Defaulting to strict localhost.'
    );
    corsOrigin = 'http://localhost:5173';
  }
}

// Parse MySQL database environment variables
const dbPortParsed = Number.parseInt(process.env.DB_PORT || '3306', 10);
const dbPort = Number.isFinite(dbPortParsed) && dbPortParsed > 0 && dbPortParsed < 65536 ? dbPortParsed : 3306;

const dbConnectionLimitParsed = Number.parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10);
const dbConnectionLimit =
  Number.isFinite(dbConnectionLimitParsed) && dbConnectionLimitParsed > 0 ? dbConnectionLimitParsed : 10;

const dbConfig: DatabaseEnvConfig = {
  host: (process.env.DB_HOST || 'localhost').trim(),
  port: dbPort,
  user: (process.env.DB_USER || 'libflow_user').trim(),
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: (process.env.DB_NAME || 'libflow_db').trim(),
  connectionLimit: dbConnectionLimit,
};

// Validate database config
const validation = validateDatabaseConfig(dbConfig, nodeEnv);
if (!validation.valid) {
  if (nodeEnv === 'production') {
    throw new Error(`[Configuration FATAL] Database configuration invalid:\n- ${validation.errors.join('\n- ')}`);
  } else {
    console.warn(`[Configuration WARNING] Database configuration warnings:\n- ${validation.errors.join('\n- ')}`);
  }
}

export const env: EnvConfig = {
  NODE_ENV: nodeEnv,
  PORT: safePort,
  API_PREFIX: apiPrefix.startsWith('/') ? apiPrefix : `/${apiPrefix}`,
  CORS_ORIGIN: corsOrigin,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  REQUEST_LIMIT: process.env.REQUEST_LIMIT || '1mb',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  DB: dbConfig,
};
