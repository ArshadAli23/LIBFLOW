/**
 * LIBFLOW — Loan Routes (/api/v1/loans)
 */

import { Router } from 'express';
import { LoanController } from '../controllers/loan.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  validateCheckout,
  validateLoanQueryParams,
} from '../middleware/circulationValidation.js';

export const loanRouter = Router();

loanRouter.use(authenticate);

// 1. Checkout an available physical copy
loanRouter.post('/checkout', validateCheckout, LoanController.checkout);

// 2. Staff directory listing & filtering of circulation loans
loanRouter.get('/', requireRole('ADMIN', 'LIBRARIAN'), validateLoanQueryParams, LoanController.listLoans);

// 3. Authenticated member's own loans (Must precede :id)
loanRouter.get('/me', LoanController.getOwnLoans);

// 4. Retrieve single loan details
loanRouter.get('/:id', LoanController.getLoanById);

// 5. Return a borrowed book copy
loanRouter.post('/:id/return', LoanController.returnLoan);

// 6. Renew an active loan
loanRouter.post('/:id/renew', LoanController.renewLoan);
