/**
 * LIBFLOW — Authentication Request Validation Middleware
 * 
 * CORE RULES:
 * - Sanitizes, normalizes, and validates all authentication inputs.
 * - Enforces minimum password strength and RFC 5322 email patterns.
 * - Returns structured 400 Bad Request error envelopes on invalid inputs.
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';

// Standard email validation pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates password strength:
 * - Minimum 8 characters, maximum 128 characters.
 * - At least one letter and at least one numeric digit or symbol.
 */
export const isStrongPassword = (password: string): { valid: boolean; reason?: string } => {
  if (typeof password !== 'string') {
    return { valid: false, reason: 'Password must be a string.' };
  }
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 128) {
    return { valid: false, reason: 'Password must not exceed 128 characters.' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one letter.' };
  }
  if (!/[0-9\W]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one number or symbol.' };
  }
  return { valid: true };
};

/**
 * Middleware: Validates login payload.
 */
export const validateLoginInput = (req: Request, _res: Response, next: NextFunction): void => {
  const { email, password } = req.body || {};

  const errors: { field: string; issue: string }[] = [];

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', issue: 'A valid email address is required.' });
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push({ field: 'password', issue: 'Password is required.' });
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Invalid login credentials payload.', 'VALIDATION_ERROR', errors));
  }

  // Normalize inputs
  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Middleware: Validates forgot-password payload.
 */
export const validateForgotPasswordInput = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { email } = req.body || {};

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return next(
      ApiError.badRequest('A valid institutional email address is required.', 'VALIDATION_ERROR', [
        { field: 'email', issue: 'Must provide a valid email format.' },
      ])
    );
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Middleware: Validates reset-password payload.
 */
export const validateResetPasswordInput = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { token, newPassword } = req.body || {};
  const errors: { field: string; issue: string }[] = [];

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    errors.push({ field: 'token', issue: 'Password reset token is required.' });
  }

  const passCheck = isStrongPassword(newPassword);
  if (!passCheck.valid) {
    errors.push({ field: 'newPassword', issue: passCheck.reason || 'Invalid password.' });
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Invalid password reset payload.', 'VALIDATION_ERROR', errors));
  }

  req.body.token = token.trim();
  next();
};

/**
 * Middleware: Validates change-password payload.
 */
export const validateChangePasswordInput = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { currentPassword, newPassword } = req.body || {};
  const errors: { field: string; issue: string }[] = [];

  if (!currentPassword || typeof currentPassword !== 'string' || currentPassword.length === 0) {
    errors.push({ field: 'currentPassword', issue: 'Current password is required.' });
  }

  const passCheck = isStrongPassword(newPassword);
  if (!passCheck.valid) {
    errors.push({ field: 'newPassword', issue: passCheck.reason || 'Invalid new password.' });
  }

  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.push({ field: 'newPassword', issue: 'New password cannot be identical to current password.' });
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Invalid change password payload.', 'VALIDATION_ERROR', errors));
  }

  next();
};
