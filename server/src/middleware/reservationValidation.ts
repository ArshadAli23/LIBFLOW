/**
 * LIBFLOW — Reservation Validation Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import type { ReservationStatus } from '../models/Reservation.js';

const VALID_RESERVATION_STATUSES: ReservationStatus[] = [
  'WAITING',
  'READY_FOR_PICKUP',
  'CLAIMED',
  'CANCELLED',
  'EXPIRED',
];

const RESERVATION_SORT_KEYS = [
  'created_desc',
  'created_asc',
  'queue_asc',
  'expires_asc',
];

export const validateCreateReservation = (req: Request, _res: Response, next: NextFunction): void => {
  const body = req.body || {};
  const errors: { field: string; issue: string }[] = [];

  if (!body.bookId || typeof body.bookId !== 'string' || body.bookId.trim().length === 0) {
    errors.push({ field: 'bookId', issue: 'Bibliographic book title identifier is required.' });
  }

  // If role is not MEMBER, staff must supply memberId
  if (req.user?.role !== 'MEMBER') {
    if (!body.memberId || typeof body.memberId !== 'string' || body.memberId.trim().length === 0) {
      errors.push({ field: 'memberId', issue: 'Member identifier is required when staff creates a reservation.' });
    }
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation failed for reservation creation.', 'VALIDATION_ERROR', errors));
  }

  req.body.bookId = body.bookId.trim();
  if (body.memberId) req.body.memberId = body.memberId.trim();
  if (body.pickupSlot) req.body.pickupSlot = body.pickupSlot.trim();
  if (body.notes) req.body.notes = body.notes.trim();

  next();
};

export const validateReservationQueryParams = (req: Request, _res: Response, next: NextFunction): void => {
  const { page, limit, status, sortBy } = req.query;
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

  if (status !== undefined && !VALID_RESERVATION_STATUSES.includes(status as ReservationStatus)) {
    errors.push({ field: 'status', issue: `status must be one of: ${VALID_RESERVATION_STATUSES.join(', ')}.` });
  }

  if (sortBy !== undefined && !RESERVATION_SORT_KEYS.includes(sortBy as string)) {
    errors.push({ field: 'sortBy', issue: `sortBy must be one of: ${RESERVATION_SORT_KEYS.join(', ')}.` });
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Invalid query parameters for reservation list.', 'INVALID_QUERY_PARAMS', errors));
  }

  next();
};
