/**
 * LIBFLOW — Fine Routes (/api/v1/fines)
 */

import { Router } from 'express';
import { FineController } from '../controllers/fine.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  validateFineQueryParams,
  validateRecordPayment,
  validateRecordWaiver,
} from '../middleware/fineValidation.js';

export const fineRouter = Router();

fineRouter.use(authenticate);

// 1. Staff directory listing & filtering of fines
fineRouter.get('/', requireRole('ADMIN', 'LIBRARIAN'), validateFineQueryParams, FineController.listFines);

// 2. Authenticated member's own fines (Must precede :id)
fineRouter.get('/me', FineController.getOwnFines);

// 3. Retrieve single fine details
fineRouter.get('/:id', FineController.getFineById);

// 4. Record a collected payment
fineRouter.post('/:id/pay', validateRecordPayment, FineController.recordPayment);

// 5. Waive a fine with admin authorization (ADMIN only)
fineRouter.post('/:id/waive', requireRole('ADMIN'), validateRecordWaiver, FineController.recordWaiver);
