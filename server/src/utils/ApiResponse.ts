/**
 * LIBFLOW — Standard API Success Response Envelope
 * 
 * Complies with ARCHITECTURE.md Section 8 format.
 */

export interface ApiResponseMeta {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export class ApiResponse<T = unknown> {
  public readonly success: boolean;
  public readonly message: string;
  public readonly data?: T;
  public readonly meta?: ApiResponseMeta;

  constructor(message = 'Operation completed successfully', data?: T, meta?: ApiResponseMeta) {
    this.success = true;
    this.message = message;
    if (data !== undefined) {
      this.data = data;
    }
    if (meta !== undefined) {
      this.meta = meta;
    }
  }

  static success<T>(message: string, data?: T, meta?: ApiResponseMeta): ApiResponse<T> {
    return new ApiResponse(message, data, meta);
  }
}
