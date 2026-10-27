/**
 * LIBFLOW — Cross-Site Request Forgery (CSRF) & Origin Defense Middleware
 * 
 * CORE RULES:
 * - Protects cookie-authenticated state-changing operations against CSRF.
 * - Enforces Origin / Referer header validation against authorized CORS origins.
 * - Implements double-submit CSRF token validation when provided.
 * - Safe HTTP methods (GET, HEAD, OPTIONS) are exempt.
 */

import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const CSRF_COOKIE_NAME = 'libflow_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generates a cryptographically random anti-CSRF token.
 */
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(24).toString('hex');
};

/**
 * Helper to match an origin string against allowed configured origins.
 */
export const isAllowedOrigin = (origin: string, allowed: string | string[]): boolean => {
  if (allowed === '*') return true;
  if (Array.isArray(allowed)) {
    return allowed.some((o) => o.toLowerCase() === origin.toLowerCase());
  }
  return allowed.toLowerCase() === origin.toLowerCase();
};

/**
 * Validates request origin on state-changing requests.
 */
export const validateOrigin = (req: Request): boolean => {
  const origin = req.headers.origin as string | undefined;
  const referer = req.headers.referer as string | undefined;

  // Extract candidate origin from Origin header or Referer URL
  let candidateOrigin = origin;
  if (!candidateOrigin && referer) {
    try {
      const parsedUrl = new URL(referer);
      candidateOrigin = parsedUrl.origin;
    } catch {
      // Malformed referer header
      return false;
    }
  }

  // If no origin/referer header was provided (e.g. server-to-server or mobile app)
  if (!candidateOrigin) {
    return true;
  }

  return isAllowedOrigin(candidateOrigin, env.CORS_ORIGIN);
};

/**
 * CSRF Protection Middleware.
 */
export const csrfProtection = (req: Request, _res: Response, next: NextFunction): void => {
  // 1. Safe methods are idempotent and exempt from CSRF checks
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // 2. Validate Origin / Referer against authorized CORS whitelist
  if (!validateOrigin(req)) {
    return next(
      ApiError.forbidden(
        'Cross-Origin Request Blocked: Untrusted or unauthorized request origin.',
        'CSRF_ORIGIN_REJECTED'
      )
    );
  }

  // 3. Double Submit Cookie verification (if client has received a csrf cookie)
  const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];
  const csrfHeader = (req.headers[CSRF_HEADER_NAME] || req.headers['x-xsrf-token']) as string | undefined;

  if (csrfCookie) {
    if (!csrfHeader || csrfCookie !== csrfHeader) {
      return next(
        ApiError.forbidden('CSRF token missing or mismatch. State-changing request rejected.', 'CSRF_TOKEN_MISMATCH')
      );
    }
  }

  next();
};
