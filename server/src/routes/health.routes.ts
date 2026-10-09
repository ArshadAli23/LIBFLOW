/**
 * LIBFLOW — Health Check Endpoints
 * 
 * Provides system liveness and readiness monitoring.
 */

import { Router, type Request, type Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { env } from '../config/env.js';

const router = Router();

/**
 * @route   GET /api/v1/health
 * @desc    System health, liveness, and environment telemetry
 * @access  Public
 */
router.get('/', (_req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();

  const healthData = {
    status: 'UP',
    service: 'libflow-api',
    version: '1.0.0',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    memory: {
      rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
    },
  };

  res.status(200).json(ApiResponse.success('LIBFLOW Backend Service is healthy', healthData));
});

export default router;
