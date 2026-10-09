/**
 * LIBFLOW — Structured Application Error Class
 * 
 * Consistent HTTP error modeling compliant with ARCHITECTURE.md Section 8.
 */

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    errorCode = 'INTERNAL_SERVER_ERROR',
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errorCode = 'BAD_REQUEST', details?: unknown): ApiError {
    return new ApiError(400, message, errorCode, details);
  }

  static unauthorized(message = 'Authentication required', errorCode = 'UNAUTHORIZED', details?: unknown): ApiError {
    return new ApiError(401, message, errorCode, details);
  }

  static forbidden(message = 'Access forbidden for this role', errorCode = 'FORBIDDEN', details?: unknown): ApiError {
    return new ApiError(403, message, errorCode, details);
  }

  static notFound(message = 'Requested resource not found', errorCode = 'NOT_FOUND', details?: unknown): ApiError {
    return new ApiError(404, message, errorCode, details);
  }

  static conflict(message: string, errorCode = 'CONFLICT', details?: unknown): ApiError {
    return new ApiError(409, message, errorCode, details);
  }

  static unprocessable(message: string, errorCode = 'UNPROCESSABLE_ENTITY', details?: unknown): ApiError {
    return new ApiError(422, message, errorCode, details);
  }

  static internal(message = 'Internal server error occurred', errorCode = 'INTERNAL_SERVER_ERROR', details?: unknown): ApiError {
    return new ApiError(500, message, errorCode, details, false);
  }
}
