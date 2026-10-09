/**
 * LIBFLOW — Server Entry Point
 * 
 * Binds HTTP listener and handles process lifecycle signals.
 */

import { app } from './app.js';
import { env } from './config/env.js';

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

// Graceful Process Termination Handlers
const handleShutdown = (signal: string) => {
  console.log(`\n[Server] Received ${signal}. Initiating graceful termination...`);
  server.close(() => {
    console.log('[Server] HTTP server closed cleanly. Exiting process.');
    process.exit(0);
  });

  // Force close after 10s if connections remain open
  setTimeout(() => {
    console.error('[Server] Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default server;
