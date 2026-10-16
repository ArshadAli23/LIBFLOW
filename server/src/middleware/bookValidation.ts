/**
 * LIBFLOW — Book & Copy Validation Middleware
 * 
 * CORE RULES:
 * - Sanitizes, normalizes, and validates all bibliographic and inventory payloads.
 * - Enforces ISBN standards (ISBN-10 or ISBN-13).
 * - Prevents manual manipulation of circulation-locked states (BORROWED, RESERVED).
 * - Strict parameter type validation for pagination and whitelisted sorting.
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import type { BookFormat, BookStatus } from '../models/Book.js';
import type { CopyCondition, CopyStatus } from '../models/BookCopy.js';

const VALID_BOOK_FORMATS: BookFormat[] = ['HARDCOVER', 'PAPERBACK', 'DIGITAL', 'PERIODICAL'];
const VALID_BOOK_STATUSES: BookStatus[] = ['ACTIVE', 'ARCHIVED'];
const VALID_COPY_CONDITIONS: CopyCondition[] = ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];
const VALID_COPY_STATUSES: CopyStatus[] = ['AVAILABLE', 'BORROWED', 'RESERVED', 'MAINTENANCE', 'LOST', 'DAMAGED', 'WITHDRAWN'];

const BOOK_SORT_KEYS = [
  'recently_added',
  'title_asc',
  'title_desc',
  'publication_year_desc',
  'publication_year_asc',
  'most_borrowed',
  'most_available',
];

/**
 * Standard ISBN-10 or ISBN-13 format validation
 */
export const isValidISBN = (isbn: string): boolean => {
  if (typeof isbn !== 'string') return false;
  const clean = isbn.replace(/[-\s]/g, '');
  if (clean.length === 10) {
    return /^[0-9]{9}[0-9X]$/i.test(clean);
  }
  if (clean.length === 13) {
    return /^(978|979)[0-9]{10}$/.test(clean);
  }
  return false;
};

/**
 * Middleware: Validates query parameters for listing books.
 */
export const validateBookQueryParams = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { page, limit, publicationYear, format, availability, sortBy } = req.query;
  const errors: { field: string; issue: string }[] = [];

  if (page !== undefined) {
    const pageNum = Number(page);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      errors.push({ field: 'page', issue: 'Page must be a positive integer greater than or equal to 1.' });
    }
  }

  if (limit !== undefined) {
    const limitNum = Number(limit);
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push({ field: 'limit', issue: 'Limit must be an integer between 1 and 100.' });
    }
  }

  if (publicationYear !== undefined) {
    const yearNum = Number(publicationYear);
    if (!Number.isInteger(yearNum) || yearNum < 1000 || yearNum > new Date().getFullYear() + 5) {
      errors.push({ field: 'publicationYear', issue: 'Publication year must be a realistic 4-digit year.' });
    }
  }

  if (format !== undefined && !VALID_BOOK_FORMATS.includes(format as BookFormat)) {
    errors.push({
      field: 'format',
      issue: `Format must be one of: ${VALID_BOOK_FORMATS.join(', ')}.`,
    });
  }

  if (availability !== undefined && !['ALL', 'AVAILABLE', 'BORROWED'].includes(availability as string)) {
    errors.push({
      field: 'availability',
      issue: 'Availability filter must be ALL, AVAILABLE, or BORROWED.',
    });
  }

  if (sortBy !== undefined && !BOOK_SORT_KEYS.includes(sortBy as string)) {
    errors.push({
      field: 'sortBy',
      issue: `sortBy must be one of: ${BOOK_SORT_KEYS.join(', ')}.`,
    });
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Invalid query parameters for book list.', 'INVALID_QUERY_PARAMS', errors));
  }

  next();
};

/**
 * Middleware: Validates payload for creating a new bibliographic book record.
 */
export const validateCreateBook = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const body = req.body || {};
  const errors: { field: string; issue: string }[] = [];

  if (!body.isbn || typeof body.isbn !== 'string' || !isValidISBN(body.isbn)) {
    errors.push({ field: 'isbn', issue: 'A valid 10 or 13-digit ISBN is required.' });
  }

  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    errors.push({ field: 'title', issue: 'Title is required and must not be empty.' });
  }

  if (!Array.isArray(body.authors) || body.authors.length === 0) {
    errors.push({ field: 'authors', issue: 'At least one author must be specified in the authors array.' });
  } else {
    const nonStringAuthors = body.authors.some(
      (a: unknown) => typeof a !== 'string' || a.trim().length === 0
    );
    if (nonStringAuthors) {
      errors.push({ field: 'authors', issue: 'All authors must be non-empty strings.' });
    }
  }

  if (!body.publisher || typeof body.publisher !== 'string' || body.publisher.trim().length === 0) {
    errors.push({ field: 'publisher', issue: 'Publisher is required.' });
  }

  const currentYear = new Date().getFullYear();
  if (
    body.publicationYear === undefined ||
    !Number.isInteger(Number(body.publicationYear)) ||
    Number(body.publicationYear) < 1000 ||
    Number(body.publicationYear) > currentYear + 5
  ) {
    errors.push({ field: 'publicationYear', issue: `Publication year must be between 1000 and ${currentYear + 5}.` });
  }

  if (!body.category || typeof body.category !== 'string' || body.category.trim().length === 0) {
    errors.push({ field: 'category', issue: 'Category is required.' });
  }

  if (!body.description || typeof body.description !== 'string' || body.description.trim().length === 0) {
    errors.push({ field: 'description', issue: 'Description is required.' });
  }

  if (body.format !== undefined && !VALID_BOOK_FORMATS.includes(body.format)) {
    errors.push({ field: 'format', issue: `Format must be one of: ${VALID_BOOK_FORMATS.join(', ')}.` });
  }

  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    errors.push({ field: 'tags', issue: 'Tags must be an array of strings.' });
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation failed for creating book record.', 'VALIDATION_ERROR', errors));
  }

  // Normalize
  req.body.isbn = body.isbn.trim().replace(/[-\s]/g, '');
  req.body.title = body.title.trim();
  req.body.publisher = body.publisher.trim();
  req.body.publicationYear = Number(body.publicationYear);
  req.body.category = body.category.trim();
  req.body.description = body.description.trim();
  req.body.authors = body.authors.map((a: string) => a.trim());
  if (body.tags) {
    req.body.tags = body.tags.map((t: any) => String(t).trim()).filter(Boolean);
  }

  next();
};

/**
 * Middleware: Validates payload for updating an existing book record.
 */
export const validateUpdateBook = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const body = req.body || {};
  const errors: { field: string; issue: string }[] = [];

  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim().length === 0)) {
    errors.push({ field: 'title', issue: 'Title cannot be empty.' });
  }

  if (body.authors !== undefined) {
    if (!Array.isArray(body.authors) || body.authors.length === 0) {
      errors.push({ field: 'authors', issue: 'Authors must be a non-empty array of strings.' });
    } else {
      const nonString = body.authors.some((a: unknown) => typeof a !== 'string' || a.trim().length === 0);
      if (nonString) {
        errors.push({ field: 'authors', issue: 'All authors must be non-empty strings.' });
      }
    }
  }

  if (body.publicationYear !== undefined) {
    const currentYear = new Date().getFullYear();
    const year = Number(body.publicationYear);
    if (!Number.isInteger(year) || year < 1000 || year > currentYear + 5) {
      errors.push({ field: 'publicationYear', issue: `Publication year must be between 1000 and ${currentYear + 5}.` });
    }
  }

  if (body.format !== undefined && !VALID_BOOK_FORMATS.includes(body.format)) {
    errors.push({ field: 'format', issue: `Format must be one of: ${VALID_BOOK_FORMATS.join(', ')}.` });
  }

  if (body.status !== undefined && !VALID_BOOK_STATUSES.includes(body.status)) {
    errors.push({ field: 'status', issue: `Status must be one of: ${VALID_BOOK_STATUSES.join(', ')}.` });
  }

  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    errors.push({ field: 'tags', issue: 'Tags must be an array of strings.' });
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation failed for updating book record.', 'VALIDATION_ERROR', errors));
  }

  next();
};

/**
 * Middleware: Validates payload for adding a physical copy.
 */
export const validateAddCopy = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const body = req.body || {};
  const errors: { field: string; issue: string }[] = [];

  if (!body.barcode || typeof body.barcode !== 'string' || body.barcode.trim().length < 3) {
    errors.push({ field: 'barcode', issue: 'Barcode is required and must be at least 3 characters long.' });
  }

  if (!body.shelf || typeof body.shelf !== 'string' || body.shelf.trim().length === 0) {
    errors.push({ field: 'shelf', issue: 'Shelf classification/location is required.' });
  }

  if (body.conditionRating !== undefined && !VALID_COPY_CONDITIONS.includes(body.conditionRating)) {
    errors.push({ field: 'conditionRating', issue: `conditionRating must be one of: ${VALID_COPY_CONDITIONS.join(', ')}.` });
  }

  if (body.acquisitionCost !== undefined && body.acquisitionCost !== null) {
    const cost = Number(body.acquisitionCost);
    if (isNaN(cost) || cost < 0) {
      errors.push({ field: 'acquisitionCost', issue: 'Acquisition cost must be a non-negative number.' });
    }
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation failed for adding book copy.', 'VALIDATION_ERROR', errors));
  }

  req.body.barcode = body.barcode.trim().toUpperCase();
  req.body.shelf = body.shelf.trim();
  if (body.location) req.body.location = body.location.trim();

  next();
};

/**
 * Middleware: Validates payload for updating a physical copy.
 */
export const validateUpdateCopy = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const body = req.body || {};
  const errors: { field: string; issue: string }[] = [];

  if (body.shelf !== undefined && (typeof body.shelf !== 'string' || body.shelf.trim().length === 0)) {
    errors.push({ field: 'shelf', issue: 'Shelf cannot be empty.' });
  }

  if (body.conditionRating !== undefined && !VALID_COPY_CONDITIONS.includes(body.conditionRating)) {
    errors.push({ field: 'conditionRating', issue: `conditionRating must be one of: ${VALID_COPY_CONDITIONS.join(', ')}.` });
  }

  if (body.status !== undefined) {
    if (!VALID_COPY_STATUSES.includes(body.status)) {
      errors.push({ field: 'status', issue: `Status must be one of: ${VALID_COPY_STATUSES.join(', ')}.` });
    } else if (body.status === 'BORROWED' || body.status === 'RESERVED') {
      errors.push({
        field: 'status',
        issue: `Direct transition to "${body.status}" is disallowed. This status is circulation-controlled by loan checkout and hold placement.`,
      });
    }
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation failed for updating book copy.', 'VALIDATION_ERROR', errors));
  }

  next();
};

/**
 * Middleware: Validates safe withdrawal payload.
 */
export const validateWithdrawCopy = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const body = req.body || {};
  const errors: { field: string; issue: string }[] = [];

  if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length < 3) {
    errors.push({
      field: 'reason',
      issue: 'A justifiable reason (minimum 3 characters) is required to deaccession or withdraw a physical copy.',
    });
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation failed for copy withdrawal.', 'VALIDATION_ERROR', errors));
  }

  req.body.reason = body.reason.trim();
  next();
};
