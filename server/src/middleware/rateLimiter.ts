/**
 * LIBFLOW — Authentication Rate Limiting Middleware
 * 
 * CORE RULES:
 * - Prevents brute force password guessing attacks on authentication endpoints.
 * - Sliding window rate limiter tracking client IP / identifier.
 * - Returns structured 429 Too Many Requests response with Retry-After header.
 */

import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory rate limiting store (keyed by IP/identifier)
const store = new Map<string, RateLimitRecord>();

/**
 * Resets all rate limit tracking. Useful for automated test suites.
 */
export const resetRateLimiter = (): void => {
  store.clear();
};

/**
 * Factory for creating an authentication rate limiting middleware.
 */
export const createLoginRateLimiter = (options?: {
  maxAttempts?: number;
  windowMinutes?: number;
}) => {
  const maxAttempts = options?.maxAttempts || env.AUTH.rateLimitMaxAttempts;
  const windowMs = (options?.windowMinutes || env.AUTH.rateLimitWindowMinutes) * 60 * 1000;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Determine client identifier (IP address)
    const ip =
      req.ip ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown-ip';

    const now = Date.now();
    const existing = store.get(ip);

    // If no existing record or window expired, initialize fresh record
    if (!existing || now > existing.resetAt) {
      store.set(ip, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    // If within window, increment attempt count
    existing.count += 1;

    if (existing.count > maxAttempts) {
      const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));

      res.status(429).json({
        success: false,
        message: `Too many login attempts. Please wait ${Math.ceil(retryAfterSec / 60)} minute(s) before trying again.`,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          details: {
            retryAfterSeconds: retryAfterSec,
            maxAllowedAttempts: maxAttempts,
          },
        },
      });
      return;
    }

    next();
  };
};

export const loginRateLimiter = createLoginRateLimiter();
