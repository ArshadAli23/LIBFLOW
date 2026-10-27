/**
 * LIBFLOW — Barcode Scan Controller
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { BarcodeService } from '../services/BarcodeService.js';

export class BarcodeController {
  /**
   * GET /api/v1/barcodes/lookup/:barcode
   * Scans a physical book copy or member ID card barcode.
   */
  static async lookupBarcode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED');
      }

      const actorContext = {
        actorId: req.user.id,
        actorRole: req.user.role,
        fullName: req.user.fullName,
        memberId: (req.memberProfile as any)?.id || undefined,
      };

      const result = await BarcodeService.scanBarcode(req.params.barcode, actorContext);

      res.status(200).json(ApiResponse.success('Barcode scan resolved successfully', result));
    } catch (error) {
      next(error);
    }
  }
}
