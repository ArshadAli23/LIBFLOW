/**
 * LIBFLOW — Authentication & RBAC Middleware
 * 
 * CORE RULES:
 * - Deny by default.
 * - Extracts and validates server-managed session from HttpOnly cookie.
 * - Enforces role-based permissions strictly on the server.
 * - Never trusts roles supplied by the frontend.
 * - Enforces member isolation (patrons can only access their own records).
 */

import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { AuthService } from '../services/AuthService.js';
import type { UserEntity, UserRole } from '../models/User.js';
import type { SessionEntity } from '../models/Session.js';

// Extend Express Request interface to include authenticated user and session
declare global {
  namespace Express {
    interface Request {
      user?: UserEntity;
      session?: SessionEntity;
      sessionToken?: string;
      memberProfile?: Record<string, unknown> | null;
    }
  }
}

/**
 * Extracts session token from HttpOnly cookie, with Authorization Bearer header fallback.
 */
export const extractSessionToken = (req: Request): string | null => {
  // 1. Primary: HttpOnly cookie
  if (req.cookies && req.cookies[env.AUTH.sessionCookieName]) {
    return req.cookies[env.AUTH.sessionCookieName];
  }

  // 2. Secondary fallback: Authorization header (Bearer <token>)
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return null;
};

/**
 * Authentication Middleware:
 * Verifies session against MySQL and populates `req.user`, `req.session`, and `req.memberProfile`.
 * Rejects with 401 if unauthenticated or session expired.
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawToken = extractSessionToken(req);

    if (!rawToken) {
      throw ApiError.unauthorized(
        'Authentication required. Please sign in to access this resource.',
        'AUTHENTICATION_REQUIRED'
      );
    }

    const { user, session, memberProfile } = await AuthService.verifySession(rawToken);

    req.user = user;
    req.session = session;
    req.sessionToken = rawToken;
    req.memberProfile = memberProfile;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-Based Access Control (RBAC) Guard:
 * Strictly verifies that the authenticated user possesses one of the allowed canonical roles.
 * Rejects with 401 if not authenticated, or 403 if role is unauthorized.
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        ApiError.unauthorized('Authentication required to verify permissions', 'AUTHENTICATION_REQUIRED')
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access forbidden: Role "${req.user.role}" does not have permission to execute this operation.`,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};

/**
 * Member Resource Isolation Guard:
 * Ensures patrons (MEMBER role) can ONLY access their own records.
 * Institutional staff (ADMIN, LIBRARIAN) are permitted cross-patron access for desk operations.
 */
export const requireMemberOwnership = (
  getResourceOwnerId: (req: Request) => string | undefined | null
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        ApiError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
      );
    }

    // Staff and administrators have authorized desk oversight
    if (req.user.role === 'ADMIN' || req.user.role === 'LIBRARIAN') {
      return next();
    }

    // For MEMBER role, verify target owner ID matches either users.id or members.member_id
    const targetOwnerId = getResourceOwnerId(req);

    if (!targetOwnerId) {
      return next(
        ApiError.badRequest('Missing resource owner identification parameter', 'INVALID_TARGET_PARAMETER')
      );
    }

    const isUserMatch = req.user.id === targetOwnerId;
    const isMemberMatch =
      req.memberProfile &&
      typeof req.memberProfile.memberId === 'string' &&
      req.memberProfile.memberId === targetOwnerId;

    if (!isUserMatch && !isMemberMatch) {
      return next(
        ApiError.forbidden(
          'Access forbidden: Members may only inspect or manage their own library records.',
          'MEMBER_ACCESS_DENIED'
        )
      );
    }

    next();
  };
};
