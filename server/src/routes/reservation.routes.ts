/**
 * LIBFLOW — Reservation Routes (/api/v1/reservations)
 */

import { Router } from 'express';
import { ReservationController } from '../controllers/reservation.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  validateCreateReservation,
  validateReservationQueryParams,
} from '../middleware/reservationValidation.js';

export const reservationRouter = Router();

reservationRouter.use(authenticate);

// 1. Place a reservation hold
reservationRouter.post('/', validateCreateReservation, ReservationController.createReservation);

// 2. Staff list & search of reservation holds
reservationRouter.get(
  '/',
  requireRole('ADMIN', 'LIBRARIAN'),
  validateReservationQueryParams,
  ReservationController.listReservations
);

// 3. Authenticated member's own reservation holds (Must precede :id)
reservationRouter.get('/me', ReservationController.getOwnReservations);

// 4. Batch sweep to expire pickup holds (Staff only, must precede :id)
reservationRouter.post(
  '/process-expired',
  requireRole('ADMIN', 'LIBRARIAN'),
  ReservationController.processExpired
);

// 5. Retrieve single reservation detail
reservationRouter.get('/:id', ReservationController.getReservationById);

// 6. Cancel an eligible reservation hold
reservationRouter.post('/:id/cancel', ReservationController.cancelReservation);

// 7. Claim a ready pickup reservation
reservationRouter.post('/:id/claim', ReservationController.claimReservation);
