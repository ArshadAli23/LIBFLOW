/**
 * LIBFLOW — Centralized Error Handling Middleware
 * 
 * Intercepts all operational and programming errors.
 * Produces structured error envelopes conforming to ARCHITECTURE.md Section 8.
 */

import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const errorHandler: ErrorRequestHandler = (
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'An internal server error occurred';
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let details: unknown = undefined;

  // 1. Custom structured application errors
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.errorCode;
    details = err.details;
  }
  // 2. Body Parser / Payload limits
  else if ('type' in err && (err as { type?: string }).type === 'entity.too.large') {
    statusCode = 413;
    message = `Request payload exceeds permitted ceiling (${env.REQUEST_LIMIT}).`;
    errorCode = 'PAYLOAD_TOO_LARGE';
  }
  // 3. Malformed JSON syntax in request body
  else if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
    statusCode = 400;
    message = 'Malformed JSON payload received in request body.';
    errorCode = 'MALFORMED_JSON';
  }
  // 4. Other standard HTTP status errors
  else if ('status' in err && typeof (err as { status?: number }).status === 'number') {
    statusCode = (err as { status: number }).status;
    message = err.message || 'Bad Request';
    errorCode = 'BAD_REQUEST';
  }
  // 5. Unhandled generic errors
  else {
    message = env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message;
  }

  // Build the error envelope
  const errorBody: Record<string, unknown> = {
    code: errorCode,
  };

  if (details !== undefined) {
    errorBody.details = details;
  }

  if (env.NODE_ENV !== 'production' && err.stack) {
    errorBody.stack = err.stack;
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: errorBody,
  });
};
