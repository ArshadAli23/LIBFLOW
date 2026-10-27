/**
 * LIBFLOW — Circulation & Loan Validation Middleware
 * 
 * CORE RULES:
 * - Validates checkout, return, renewal, and loan query payloads.
 * - Prevents SQL injection via strict sort key whitelisting and numeric bounds.
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import type { LoanStatus } from '../models/Loan.js';

const VALID_LOAN_STATUSES: LoanStatus[] = ['ACTIVE', 'OVERDUE', 'RETURNED', 'LOST', 'DAMAGED'];

const LOAN_SORT_KEYS = [
  'checkout_desc',
  'checkout_asc',
  'due_asc',
  'due_desc',
  'return_desc',
];

export const validateCheckout = (req: Request, _res: Response, next: NextFunction): void => {
  const body = req.body || {};
  const errors: { field: string; issue: string }[] = [];

  // If role is MEMBER, memberId can be omitted from body and will be inferred from session
  if (req.user?.role !== 'MEMBER') {
    if (!body.memberId || typeof body.memberId !== 'string' || body.memberId.trim().length === 0) {
      errors.push({ field: 'memberId', issue: 'Member identifier (ID, card number, or barcode) is required.' });
    }
  }

  if (!body.bookCopyId || typeof body.bookCopyId !== 'string' || body.bookCopyId.trim().length === 0) {
    errors.push({ field: 'bookCopyId', issue: 'Physical book copy identifier or barcode is required.' });
  }

  if (body.borrowDurationDays !== undefined) {
    const days = Number(body.borrowDurationDays);
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      errors.push({ field: 'borrowDurationDays', issue: 'Borrow duration must be an integer between 1 and 90 days.' });
    }
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation failed for checkout payload.', 'VALIDATION_ERROR', errors));
  }

  if (body.memberId) req.body.memberId = body.memberId.trim();
  req.body.bookCopyId = body.bookCopyId.trim();
  if (body.borrowDurationDays) req.body.borrowDurationDays = Number(body.borrowDurationDays);

  next();
};

export const validateLoanQueryParams = (req: Request, _res: Response, next: NextFunction): void => {
  const { page, limit, status, overdueOnly, sortBy } = req.query;
  const errors: { field: string; issue: string }[] = [];

  if (page !== undefined) {
    const pageNum = Number(page);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      errors.push({ field: 'page', issue: 'Page must be an integer greater than or equal to 1.' });
    }
  }

  if (limit !== undefined) {
    const limitNum = Number(limit);
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push({ field: 'limit', issue: 'Limit must be an integer between 1 and 100.' });
    }
  }

  if (status !== undefined && !VALID_LOAN_STATUSES.includes(status as LoanStatus)) {
    errors.push({ field: 'status', issue: `status must be one of: ${VALID_LOAN_STATUSES.join(', ')}.` });
  }

  if (sortBy !== undefined && !LOAN_SORT_KEYS.includes(sortBy as string)) {
    errors.push({ field: 'sortBy', issue: `sortBy must be one of: ${LOAN_SORT_KEYS.join(', ')}.` });
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Invalid query parameters for loan list.', 'INVALID_QUERY_PARAMS', errors));
  }

  next();
};
