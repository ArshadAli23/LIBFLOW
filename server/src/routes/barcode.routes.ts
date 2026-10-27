/**
 * LIBFLOW — Barcode Routes
 * 
 * Versioned endpoints under /api/v1/barcodes
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBarcodeParam } from '../middleware/barcodeValidation.js';
import { BarcodeController } from '../controllers/barcode.controller.js';

export const barcodeRouter: Router = Router();

barcodeRouter.get('/lookup/:barcode', authenticate, validateBarcodeParam, BarcodeController.lookupBarcode);
barcodeRouter.get('/scan/:barcode', authenticate, validateBarcodeParam, BarcodeController.lookupBarcode);

export default barcodeRouter;
