/**
 * LIBFLOW — Unknown Route Middleware
 * 
 * Intercepts unmapped endpoints and forwards structured 404 ApiError.
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(
    ApiError.notFound(
      `Cannot ${req.method} ${req.originalUrl} — route not found on this server.`,
      'ROUTE_NOT_FOUND',
      {
        method: req.method,
        path: req.originalUrl,
      }
    )
  );
};
