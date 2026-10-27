/**
 * LIBFLOW — Notification Request Validation Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import type {
  NotificationType,
  NotificationPriority,
  NotificationRecipientRole,
} from '../models/Notification.js';

const VALID_NOTIFICATION_TYPES: Set<string> = new Set([
  'DUE_SOON',
  'OVERDUE',
  'RESERVATION_READY',
  'RESERVATION_EXPIRING',
  'FINE_CREATED',
  'FINE_UPDATED',
  'FINE_PAID',
  'MEMBERSHIP_EXPIRING',
  'SYSTEM_BROADCAST',
  'BOOK_ISSUED',
  'GENERAL',
]);

const VALID_PRIORITIES: Set<string> = new Set(['LOW', 'NORMAL', 'HIGH', 'URGENT']);
const VALID_ROLES: Set<string> = new Set(['ADMIN', 'LIBRARIAN', 'MEMBER', 'ALL']);

export const validateNotificationQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { page, limit, isRead, type, priority, search } = req.query;

  if (page !== undefined) {
    const parsedPage = Number(page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      return next(ApiError.badRequest('Query parameter "page" must be a positive integer >= 1.', 'INVALID_PAGE'));
    }
  }

  if (limit !== undefined) {
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return next(ApiError.badRequest('Query parameter "limit" must be between 1 and 100.', 'INVALID_LIMIT'));
    }
  }

  if (isRead !== undefined && isRead !== '') {
    if (isRead !== 'true' && isRead !== 'false' && typeof isRead !== 'boolean') {
      return next(ApiError.badRequest('Query parameter "isRead" must be a boolean (true or false).', 'INVALID_IS_READ'));
    }
  }

  if (type !== undefined && type !== '') {
    if (!VALID_NOTIFICATION_TYPES.has(String(type))) {
      return next(
        ApiError.badRequest(
          `Invalid notification type "${type}". Allowed: ${Array.from(VALID_NOTIFICATION_TYPES).join(', ')}.`,
          'INVALID_NOTIFICATION_TYPE'
        )
      );
    }
  }

  if (priority !== undefined && priority !== '') {
    if (!VALID_PRIORITIES.has(String(priority))) {
      return next(
        ApiError.badRequest(
          `Invalid priority "${priority}". Allowed: LOW, NORMAL, HIGH, URGENT.`,
          'INVALID_PRIORITY'
        )
      );
    }
  }

  if (search !== undefined && typeof search === 'string' && search.length > 200) {
    return next(ApiError.badRequest('Search term must not exceed 200 characters.', 'SEARCH_TOO_LONG'));
  }

  next();
};

export const validateNotificationId = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { id } = req.params;
  if (!id || typeof id !== 'string' || id.trim().length === 0 || id.length > 64) {
    return next(ApiError.badRequest('Invalid or missing notification ID in route parameter.', 'INVALID_NOTIFICATION_ID'));
  }
  next();
};

export const validateBroadcastPayload = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { title, message, recipientRole, priority } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return next(ApiError.badRequest('Broadcast notification "title" is required and cannot be empty.', 'TITLE_REQUIRED'));
  }

  if (title.length > 255) {
    return next(ApiError.badRequest('Broadcast notification "title" cannot exceed 255 characters.', 'TITLE_TOO_LONG'));
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return next(ApiError.badRequest('Broadcast notification "message" is required and cannot be empty.', 'MESSAGE_REQUIRED'));
  }

  if (recipientRole !== undefined && !VALID_ROLES.has(String(recipientRole))) {
    return next(
      ApiError.badRequest(
        `Invalid recipient role "${recipientRole}". Allowed roles: ADMIN, LIBRARIAN, MEMBER, ALL.`,
        'INVALID_RECIPIENT_ROLE'
      )
    );
  }

  if (priority !== undefined && !VALID_PRIORITIES.has(String(priority))) {
    return next(
      ApiError.badRequest(
        `Invalid priority "${priority}". Allowed: LOW, NORMAL, HIGH, URGENT.`,
        'INVALID_PRIORITY'
      )
    );
  }

  next();
};
