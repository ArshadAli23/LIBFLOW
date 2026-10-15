/**
 * LIBFLOW — Express Application Factory
 * 
 * Configures middleware, security guards, routers, and centralized error handling.
 */

import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import healthRouter from './routes/health.routes.js';
import authRouter from './routes/auth.routes.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ApiResponse } from './utils/ApiResponse.js';

export const createApp = (): Application => {
  const app: Application = express();

  // 1. Security Headers via Helmet
  app.use(helmet());

  // 2. Cross-Origin Resource Sharing (CORS)
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 3. Request Body Parsing with Strict Size Limits
  app.use(express.json({ limit: env.REQUEST_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: env.REQUEST_LIMIT }));

  // 3b. Cookie Parsing for HttpOnly Sessions & CSRF
  app.use(cookieParser());

  // 4. Root Welcome Route
  app.get('/', (_req, res) => {
    res.status(200).json(
      ApiResponse.success('LIBFLOW Smart Library Management Platform API', {
        apiPrefix: env.API_PREFIX,
        healthEndpoint: `${env.API_PREFIX}/health`,
        documentation: 'https://github.com/libflow/platform',
      })
    );
  });

  // 5. Mount API Routes
  app.use(`${env.API_PREFIX}/health`, healthRouter);
  app.use(`${env.API_PREFIX}/auth`, authRouter);

  // 6. Catch-all for Undefined Routes (404)
  app.use(notFoundHandler);

  // 7. Centralized Error Handling
  app.use(errorHandler);

  return app;
};

export const app = createApp();
