/**
 * LIBFLOW — Authentication Controller
 * 
 * HTTP Request Handler for /api/v1/auth routes:
 * - POST /login
 * - POST /logout
 * - GET  /me
 * - POST /forgot-password
 * - POST /reset-password
 * - POST /change-password
 */

import type { Request, Response, NextFunction, CookieOptions } from 'express';
import { env } from '../config/env.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AuthService } from '../services/AuthService.js';
import { extractSessionToken } from '../middleware/auth.js';
import { generateCsrfToken, CSRF_COOKIE_NAME } from '../middleware/csrf.js';
import { sanitizeUser } from '../models/User.js';

/**
 * Returns standard cookie configuration for server sessions.
 */
const getSessionCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: env.AUTH.sessionTtlHours * 3600 * 1000,
  path: '/',
});

/**
 * Returns cookie configuration for double-submit anti-CSRF token.
 * Note: httpOnly must be false so the client single-page app can read and send it in headers.
 */
const getCsrfCookieOptions = (): CookieOptions => ({
  httpOnly: false,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: env.AUTH.sessionTtlHours * 3600 * 1000,
  path: '/',
});

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    const userAgent = req.headers['user-agent'] as string | undefined;

    const result = await AuthService.login(email, password, { ipAddress, userAgent });

    // Set secure HttpOnly session cookie
    res.cookie(env.AUTH.sessionCookieName, result.sessionToken, getSessionCookieOptions());

    // Set client-accessible CSRF cookie for state-changing requests
    const csrfToken = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());

    res.status(200).json(
      ApiResponse.success('Authentication successful', {
        user: result.user,
        memberProfile: result.memberProfile || null,
        csrfToken,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionToken = req.sessionToken || extractSessionToken(req);
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    const userAgent = req.headers['user-agent'] as string | undefined;

    if (sessionToken) {
      await AuthService.logout(sessionToken, ipAddress, userAgent);
    }

    // Invalidate cookies on client
    res.clearCookie(env.AUTH.sessionCookieName, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.clearCookie(CSRF_COOKIE_NAME, {
      httpOnly: false,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.status(200).json(ApiResponse.success('Logged out successfully'));
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: { code: 'UNAUTHORIZED' },
      });
      return;
    }

    res.status(200).json(
      ApiResponse.success('Current session verified', {
        user: sanitizeUser(req.user),
        memberProfile: req.memberProfile || null,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    const userAgent = req.headers['user-agent'] as string | undefined;

    const result = await AuthService.forgotPassword(email, { ipAddress, userAgent });

    // Response is generic to prevent account enumeration
    const payload: Record<string, unknown> = {
      message: 'If an account matches that email, a password reset link has been dispatched.',
    };

    if (env.NODE_ENV !== 'production' && result.resetTokenForDev) {
      payload.devResetToken = result.resetTokenForDev;
    }

    res.status(200).json(
      ApiResponse.success(
        'If an account matches that email, a password reset link has been dispatched.',
        payload
      )
    );
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    const userAgent = req.headers['user-agent'] as string | undefined;

    await AuthService.resetPassword(token, newPassword, { ipAddress, userAgent });

    // Invalidate any existing cookies on caller
    res.clearCookie(env.AUTH.sessionCookieName, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.status(200).json(
      ApiResponse.success('Password has been reset successfully. Please log in with your new credentials.')
    );
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;
    const sessionToken = req.sessionToken;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    const userAgent = req.headers['user-agent'] as string | undefined;

    await AuthService.changePassword(userId, currentPassword, newPassword, sessionToken, {
      ipAddress,
      userAgent,
    });

    res.status(200).json(ApiResponse.success('Password changed successfully.'));
  } catch (error) {
    next(error);
  }
};
