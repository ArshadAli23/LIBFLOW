/**
 * LIBFLOW — Member Validation Middleware
 * 
 * CORE RULES:
 * - Validates patron registration, updates, and filtering parameters.
 * - Prevents injection of invalid roles or administrative state.
 * - Enforces RFC email format and institutional department constraints.
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import type { MemberStatus, MemberType } from '../models/Member.js';

const VALID_MEMBER_TYPES: MemberType[] = [
  'STUDENT',
  'FACULTY',
  'STAFF',
  'RESEARCHER',
  'EXTERNAL',
  'GENERAL',
];

const VALID_MEMBER_STATUSES: MemberStatus[] = ['ACTIVE', 'SUSPENDED', 'EXPIRED', 'PENDING'];

const MEMBER_SORT_KEYS = [
  'recently_registered',
  'oldest_registered',
  'name_asc',
  'name_desc',
  'member_id_asc',
  'expiry_asc',
  'expiry_desc',
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Middleware: Validates query parameters for listing members.
 */
export const validateMemberQueryParams = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { page, limit, memberType, status, sortBy } = req.query;
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

  if (memberType !== undefined && !VALID_MEMBER_TYPES.includes(memberType as MemberType)) {
    errors.push({
      field: 'memberType',
      issue: `memberType must be one of: ${VALID_MEMBER_TYPES.join(', ')}.`,
    });
  }

  if (status !== undefined && !VALID_MEMBER_STATUSES.includes(status as MemberStatus)) {
    errors.push({
      field: 'status',
      issue: `status must be one of: ${VALID_MEMBER_STATUSES.join(', ')}.`,
    });
  }

  if (sortBy !== undefined && !MEMBER_SORT_KEYS.includes(sortBy as string)) {
    errors.push({
      field: 'sortBy',
      issue: `sortBy must be one of: ${MEMBER_SORT_KEYS.join(', ')}.`,
    });
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Invalid query parameters for member list.', 'INVALID_QUERY_PARAMS', errors));
  }

  next();
};

/**
 * Middleware: Validates payload for registering a new patron profile.
 */
export const validateCreateMember = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const body = req.body || {};
  const errors: { field: string; issue: string }[] = [];

  if (!body.firstName || typeof body.firstName !== 'string' || body.firstName.trim().length === 0) {
    errors.push({ field: 'firstName', issue: 'First name is required.' });
  }

  if (!body.lastName || typeof body.lastName !== 'string' || body.lastName.trim().length === 0) {
    errors.push({ field: 'lastName', issue: 'Last name is required.' });
  }

  if (!body.email || typeof body.email !== 'string' || !EMAIL_REGEX.test(body.email.trim())) {
    errors.push({ field: 'email', issue: 'A valid email address is required.' });
  }

  if (!body.phone || typeof body.phone !== 'string' || body.phone.trim().length < 3) {
    errors.push({ field: 'phone', issue: 'Phone number is required.' });
  }

  if (!body.department || typeof body.department !== 'string' || body.department.trim().length === 0) {
    errors.push({ field: 'department', issue: 'Institutional department is required.' });
  }

  if (body.memberType !== undefined && !VALID_MEMBER_TYPES.includes(body.memberType)) {
    errors.push({
      field: 'memberType',
      issue: `memberType must be one of: ${VALID_MEMBER_TYPES.join(', ')}.`,
    });
  }

  if (body.maxBorrowLimit !== undefined) {
    const limitNum = Number(body.maxBorrowLimit);
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 50) {
      errors.push({ field: 'maxBorrowLimit', issue: 'maxBorrowLimit must be an integer between 1 and 50.' });
    }
  }

  if (body.membershipExpiryDate !== undefined) {
    const date = new Date(body.membershipExpiryDate);
    if (isNaN(date.getTime())) {
      errors.push({ field: 'membershipExpiryDate', issue: 'membershipExpiryDate must be a valid date.' });
    }
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation failed for creating member.', 'VALIDATION_ERROR', errors));
  }

  req.body.firstName = body.firstName.trim();
  req.body.lastName = body.lastName.trim();
  req.body.email = body.email.trim().toLowerCase();
  req.body.phone = body.phone.trim();
  req.body.department = body.department.trim();
  if (body.address) req.body.address = body.address.trim();
  if (body.program) req.body.program = body.program.trim();
  if (body.academicYear) req.body.academicYear = body.academicYear.trim();
  if (body.memberId) req.body.memberId = body.memberId.trim().toUpperCase();
  if (body.membershipExpiryDate) req.body.membershipExpiryDate = new Date(body.membershipExpiryDate);

  next();
};

/**
 * Middleware: Validates payload for updating member profiles.
 */
export const validateUpdateMember = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const body = req.body || {};
  const errors: { field: string; issue: string }[] = [];

  if (body.firstName !== undefined && (typeof body.firstName !== 'string' || body.firstName.trim().length === 0)) {
    errors.push({ field: 'firstName', issue: 'First name cannot be empty.' });
  }

  if (body.lastName !== undefined && (typeof body.lastName !== 'string' || body.lastName.trim().length === 0)) {
    errors.push({ field: 'lastName', issue: 'Last name cannot be empty.' });
  }

  if (body.phone !== undefined && (typeof body.phone !== 'string' || body.phone.trim().length < 3)) {
    errors.push({ field: 'phone', issue: 'Phone number must be at least 3 characters.' });
  }

  if (body.memberType !== undefined && !VALID_MEMBER_TYPES.includes(body.memberType)) {
    errors.push({
      field: 'memberType',
      issue: `memberType must be one of: ${VALID_MEMBER_TYPES.join(', ')}.`,
    });
  }

  if (body.status !== undefined && !VALID_MEMBER_STATUSES.includes(body.status)) {
    errors.push({
      field: 'status',
      issue: `status must be one of: ${VALID_MEMBER_STATUSES.join(', ')}.`,
    });
  }

  if (body.maxBorrowLimit !== undefined) {
    const limitNum = Number(body.maxBorrowLimit);
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 50) {
      errors.push({ field: 'maxBorrowLimit', issue: 'maxBorrowLimit must be an integer between 1 and 50.' });
    }
  }

  if (body.membershipExpiryDate !== undefined) {
    const date = new Date(body.membershipExpiryDate);
    if (isNaN(date.getTime())) {
      errors.push({ field: 'membershipExpiryDate', issue: 'membershipExpiryDate must be a valid date.' });
    }
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation failed for updating member.', 'VALIDATION_ERROR', errors));
  }

  if (body.membershipExpiryDate) {
    req.body.membershipExpiryDate = new Date(body.membershipExpiryDate);
  }

  next();
};
