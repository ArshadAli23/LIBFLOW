/**
 * LIBFLOW — Barcode Scan Validation Middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';

const BARCODE_REGEX = /^[a-zA-Z0-9_\-:\/.#]+$/;

export const validateBarcodeParam = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { barcode } = req.params;

  if (!barcode || typeof barcode !== 'string') {
    return next(ApiError.badRequest('Barcode parameter is required in route URL.', 'BARCODE_REQUIRED'));
  }

  const trimmed = barcode.trim();

  if (trimmed.length < 2 || trimmed.length > 64) {
    return next(
      ApiError.badRequest('Barcode must be between 2 and 64 characters in length.', 'INVALID_BARCODE_LENGTH')
    );
  }

  if (!BARCODE_REGEX.test(trimmed)) {
    return next(
      ApiError.badRequest(
        'Barcode contains invalid characters. Only alphanumeric characters and standard separators are allowed.',
        'INVALID_BARCODE_CHARACTERS'
      )
    );
  }

  req.params.barcode = trimmed;
  next();
};
