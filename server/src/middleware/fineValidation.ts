/**
 * LIBFLOW — Fine Validation Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import type { FineStatus, FinePaymentMethod, FineReason } from '../models/Fine.js';

const VALID_FINE_STATUSES: FineStatus[] = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'WAIVED'];
const VALID_PAYMENT_METHODS: FinePaymentMethod[] = [
  'CASH',
  'CAMPUS_CARD',
  'UPI_ONLINE',
  'CARD',
  'ONLINE',
];
const VALID_FINE_REASONS: FineReason[] = ['OVERDUE', 'DAMAGED_ITEM', 'LOST_ITEM', 'PROCESSING_FEE'];

const FINE_SORT_KEYS = [
  'issued_desc',
  'issued_asc',
  'balance_desc',
  'balance_asc',
];

export const validateRecordPayment = (req: Request, _res: Response, next: NextFunction): void => {
  const body = req.body || {};
  const errors: { field: string; issue: string }[] = [];

  const amount = Number(body.amount);
  if (isNaN(amount) || amount <= 0) {
    errors.push({ field: 'amount', issue: 'Payment amount must be a positive number greater than zero.' });
  }

  if (!body.method || !VALID_PAYMENT_METHODS.includes(body.method as FinePaymentMethod)) {
    errors.push({
      field: 'method',
      issue: `Payment method must be one of: ${VALID_PAYMENT_METHODS.join(', ')}.`,
    });
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation failed for payment record.', 'VALIDATION_ERROR', errors));
  }

  req.body.amount = Math.round(amount * 100) / 100;
  if (body.transactionReference) req.body.transactionReference = body.transactionReference.trim();
  if (body.notes) req.body.notes = body.notes.trim();

  next();
};

export const validateRecordWaiver = (req: Request, _res: Response, next: NextFunction): void => {
  const body = req.body || {};
  const errors: { field: string; issue: string }[] = [];

  const amount = Number(body.amount);
  if (isNaN(amount) || amount <= 0) {
    errors.push({ field: 'amount', issue: 'Waiver amount must be a positive number greater than zero.' });
  }

  if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length < 3) {
    errors.push({ field: 'reason', issue: 'An audited waiver reason (minimum 3 characters) is required.' });
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation failed for waiver record.', 'VALIDATION_ERROR', errors));
  }

  req.body.amount = Math.round(amount * 100) / 100;
  req.body.reason = body.reason.trim();

  next();
};

export const validateFineQueryParams = (req: Request, _res: Response, next: NextFunction): void => {
  const { page, limit, status, reason, sortBy } = req.query;
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

  if (status !== undefined && !VALID_FINE_STATUSES.includes(status as FineStatus)) {
    errors.push({ field: 'status', issue: `status must be one of: ${VALID_FINE_STATUSES.join(', ')}.` });
  }

  if (reason !== undefined && !VALID_FINE_REASONS.includes(reason as FineReason)) {
    errors.push({ field: 'reason', issue: `reason must be one of: ${VALID_FINE_REASONS.join(', ')}.` });
  }

  if (sortBy !== undefined && !FINE_SORT_KEYS.includes(sortBy as string)) {
    errors.push({ field: 'sortBy', issue: `sortBy must be one of: ${FINE_SORT_KEYS.join(', ')}.` });
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Invalid query parameters for fine list.', 'INVALID_QUERY_PARAMS', errors));
  }

  next();
};
