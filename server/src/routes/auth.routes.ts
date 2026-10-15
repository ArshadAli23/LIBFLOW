/**
 * LIBFLOW — Authentication Router
 * 
 * Versioned endpoints under /api/v1/auth:
 * - POST /login            (Rate-limited, input-validated)
 * - POST /logout           (Terminates server session & clears cookies)
 * - GET  /me               (Protected: returns authenticated user profile & role)
 * - POST /forgot-password  (Rate-limited, timing-safe reset token generation)
 * - POST /reset-password   (Rate-limited, single-use token consumption)
 * - POST /change-password  (Protected, CSRF-guarded, revokes other sessions)
 */

import { Router } from 'express';
import {
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';
import { csrfProtection } from '../middleware/csrf.js';
import {
  validateLoginInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
  validateChangePasswordInput,
} from '../middleware/validation.js';

const router = Router();

// 1. Login with credential validation and brute-force rate limiting
router.post('/login', loginRateLimiter, validateLoginInput, login);

// 2. Logout and invalidate server session
router.post('/logout', logout);

// 3. Current authenticated session telemetry
router.get('/me', authenticate, getMe);

// 4. Request password reset (anti-enumeration)
router.post('/forgot-password', loginRateLimiter, validateForgotPasswordInput, forgotPassword);

// 5. Submit password reset with single-use expiring token
router.post('/reset-password', loginRateLimiter, validateResetPasswordInput, resetPassword);

// 6. Authenticated password change (requires valid session & CSRF protection)
router.post('/change-password', authenticate, csrfProtection, validateChangePasswordInput, changePassword);

export default router;
