/**
 * LIBFLOW — Analytics & Reporting Query Validation Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';

export const validateDateRangeQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { startDate, endDate } = req.query;

  let parsedStart: Date | undefined;
  let parsedEnd: Date | undefined;

  if (startDate !== undefined && startDate !== '') {
    parsedStart = new Date(String(startDate));
    if (isNaN(parsedStart.getTime())) {
      return next(
        ApiError.badRequest(
          'Query parameter "startDate" must be a valid ISO-8601 date format (e.g. YYYY-MM-DD or full timestamp).',
          'INVALID_START_DATE'
        )
      );
    }
  }

  if (endDate !== undefined && endDate !== '') {
    parsedEnd = new Date(String(endDate));
    if (isNaN(parsedEnd.getTime())) {
      return next(
        ApiError.badRequest(
          'Query parameter "endDate" must be a valid ISO-8601 date format (e.g. YYYY-MM-DD or full timestamp).',
          'INVALID_END_DATE'
        )
      );
    }
  }

  if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
    return next(
      ApiError.badRequest(
        'Parameter "startDate" cannot be chronologically later than "endDate".',
        'INVALID_DATE_RANGE'
      )
    );
  }

  next();
};

export const validatePopularBooksQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { limit, category } = req.query;

  if (limit !== undefined && limit !== '') {
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      return next(
        ApiError.badRequest('Query parameter "limit" must be an integer between 1 and 50.', 'INVALID_LIMIT')
      );
    }
  }

  if (category !== undefined && typeof category === 'string' && category.length > 100) {
    return next(
      ApiError.badRequest('Query parameter "category" must not exceed 100 characters.', 'INVALID_CATEGORY')
    );
  }

  next();
};
