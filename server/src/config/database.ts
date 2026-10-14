/**
 * LIBFLOW — MongoDB Database Connection & Lifecycle Manager
 * 
 * Provides robust connection lifecycle management, health telemetry,
 * sanitized credential logging, and graceful shutdown.
 */

import mongoose from 'mongoose';
import { env, sanitizeMongoUri } from './env.js';

export interface DatabaseHealth {
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'DISCONNECTING';
  connected: boolean;
  readyState: number;
  host: string | null;
  name: string | null;
  sanitizedUri: string;
  error?: string | null;
}

let lastConnectionError: string | null = null;

const READY_STATE_MAP: Record<number, 'DISCONNECTED' | 'CONNECTED' | 'CONNECTING' | 'DISCONNECTING'> = {
  0: 'DISCONNECTED',
  1: 'CONNECTED',
  2: 'CONNECTING',
  3: 'DISCONNECTING',
};

/**
 * Returns real-time database connection telemetry and health status.
 * Strictly reflects Mongoose connection state — never claims connected unless readyState === 1.
 */
export const getDatabaseHealth = (): DatabaseHealth => {
  const readyState = mongoose.connection.readyState;
  const status = READY_STATE_MAP[readyState] || 'DISCONNECTED';
  const isConnected = readyState === 1;

  return {
    status,
    connected: isConnected,
    readyState,
    host: isConnected ? mongoose.connection.host || null : null,
    name: isConnected ? mongoose.connection.name || null : null,
    sanitizedUri: sanitizeMongoUri(env.MONGODB_URI),
    error: lastConnectionError,
  };
};

/**
 * Initializes the MongoDB database connection.
 * 
 * Startup behavior:
 * - Production: Fails fast if MONGODB_URI is missing or initial connection fails.
 * - Development & Test: Starts in a degraded state (API UP, Database DISCONNECTED)
 *   so health diagnostics, docs, and mocks can run without requiring local MongoDB.
 */
export const connectDatabase = async (): Promise<boolean> => {
  const mongoUri = env.MONGODB_URI;

  if (!mongoUri) {
    const message = 'MONGODB_URI environment variable is not defined.';
    lastConnectionError = message;

    if (env.NODE_ENV === 'production') {
      console.error(`[Database FATAL] ${message} Persistent storage is mandatory in production.`);
      throw new Error(message);
    }

    console.warn(`[Database WARNING] ${message} Running in degraded state (API UP, Database DISCONNECTED).`);
    return false;
  }

  try {
    lastConnectionError = null;
    const sanitized = sanitizeMongoUri(mongoUri);
    console.log(`[Database] Connecting to MongoDB at ${sanitized}...`);

    await mongoose.connect(mongoUri, {
      autoIndex: env.NODE_ENV !== 'production', // Build indexes in dev/test, manage explicitly in prod
      serverSelectionTimeoutMS: 5000,           // 5s timeout for fast feedback
    });

    const dbName = mongoose.connection.name || 'default';
    const host = mongoose.connection.host || 'unknown-host';
    console.log(`[Database] Successfully established MongoDB connection to "${dbName}" on ${host}.`);
    return true;
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    // Sanitize any accidental credentials in the error string
    const safeError = sanitizeMongoUri(rawMessage);
    lastConnectionError = safeError;

    if (env.NODE_ENV === 'production') {
      console.error(`[Database FATAL] Failed to connect to MongoDB: ${safeError}`);
      throw new Error(`Failed to connect to MongoDB: ${safeError}`);
    }

    console.warn(`[Database WARNING] Failed to connect to MongoDB (${safeError}). Running in degraded state.`);
    return false;
  }
};

/**
 * Closes the MongoDB database connection cleanly during graceful shutdown.
 */
export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      console.log('[Database] MongoDB connection closed cleanly.');
    } catch (err) {
      console.error('[Database ERROR] Error occurred while closing MongoDB connection:', err);
    }
  }
};

// Listen for connection events to maintain telemetry accuracy
mongoose.connection.on('disconnected', () => {
  console.log('[Database] MongoDB connection dropped / disconnected.');
});

mongoose.connection.on('error', (err) => {
  const safeMsg = sanitizeMongoUri(err?.message || 'Unknown database error');
  lastConnectionError = safeMsg;
  console.error('[Database ERROR] MongoDB runtime error:', safeMsg);
});
