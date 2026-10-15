/**
 * LIBFLOW — Server Entry Point
 * 
 * Binds HTTP listener, initializes database connectivity, and handles process lifecycle signals.
 */

import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

let isShuttingDown = false;

const startServer = async () => {
  // 1. Connect to MySQL (fails fast in prod, graceful degraded in dev/test)
  try {
    await connectDatabase();
  } catch (_err) {
    if (env.NODE_ENV === 'production') {
      console.error('[Server FATAL] Aborting server launch due to database connection failure.');
      process.exit(1);
    }
  }

  // 2. Start HTTP Server Listener
  const server = app.listen(env.PORT, () => {
    const line = '='.repeat(64);
    console.log(line);
    console.log(` LIBFLOW Smart Library Management Platform — API Server`);
    console.log(` Environment : ${env.NODE_ENV}`);
    console.log(` Port        : ${env.PORT}`);
    console.log(` Base API    : http://localhost:${env.PORT}${env.API_PREFIX}`);
    console.log(` Health URL  : http://localhost:${env.PORT}${env.API_PREFIX}/health`);
    console.log(` Allowed CORS: ${JSON.stringify(env.CORS_ORIGIN)}`);
    console.log(line);
  });

  // 3. Graceful Termination Handler
  const handleShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[Server] Received ${signal}. Initiating graceful termination...`);

    // Force close after 10s if connections remain open
    const forceTimer = setTimeout(() => {
      console.error('[Server] Forcefully terminating process after timeout.');
      process.exit(1);
    }, 10000);
    forceTimer.unref();

    server.close(async () => {
      console.log('[Server] HTTP server closed cleanly.');
      await disconnectDatabase();
      console.log('[Server] All services shut down cleanly. Exiting process.');
      clearTimeout(forceTimer);
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void handleShutdown('SIGTERM'));
  process.on('SIGINT', () => void handleShutdown('SIGINT'));

  return server;
};

const serverPromise = startServer();
export default serverPromise;

