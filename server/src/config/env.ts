/**
 * LIBFLOW — Environment Configuration & Validation
 * 
 * Centralized, validated environment configuration.
 * Prevents insecure defaults in production.
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from server root if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  API_PREFIX: string;
  CORS_ORIGIN: string | string[];
  CLIENT_URL: string;
  REQUEST_LIMIT: string;
  LOG_LEVEL: string;
  MONGODB_URI?: string;
}

/**
 * Sanitizes a MongoDB connection URI for safe logging without leaking credentials.
 */
export const sanitizeMongoUri = (rawUri?: string): string => {
  if (!rawUri || typeof rawUri !== 'string') return 'not configured';
  try {
    return rawUri.replace(/(mongodb(?:\+srv)?:\/\/)([^:@\s]+):([^@\s]+)@/i, '$1***:***@');
  } catch {
    return '[malformed uri]';
  }
};

/**
 * Validates whether a MongoDB URI follows acceptable URI schemes.
 */
export const isMongoUriValid = (rawUri?: string): boolean => {
  if (!rawUri || typeof rawUri !== 'string') return false;
  const trimmed = rawUri.trim();
  return trimmed.startsWith('mongodb://') || trimmed.startsWith('mongodb+srv://');
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

// Parse and validate MONGODB_URI
const rawMongoUri = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : undefined;
let validatedMongoUri: string | undefined = undefined;

if (rawMongoUri) {
  if (isMongoUriValid(rawMongoUri)) {
    validatedMongoUri = rawMongoUri;
  } else {
    console.warn(
      `[DATABASE WARNING] Invalid MONGODB_URI scheme provided (${sanitizeMongoUri(rawMongoUri)}). URI must start with mongodb:// or mongodb+srv://.`
    );
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
  MONGODB_URI: validatedMongoUri,
};

