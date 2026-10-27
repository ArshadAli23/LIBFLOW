/**
 * LIBFLOW — Analytics & Reporting Routes
 * 
 * Versioned endpoints under /api/v1/analytics
 * Strictly restricted to institutional staff (ADMIN, LIBRARIAN).
 */

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  validateDateRangeQuery,
  validatePopularBooksQuery,
} from '../middleware/analyticsValidation.js';
import { AnalyticsController } from '../controllers/analytics.controller.js';

export const analyticsRouter: Router = Router();

// Staff Guard: All analytics require ADMIN or LIBRARIAN role
analyticsRouter.use(authenticate, requireRole('ADMIN', 'LIBRARIAN'));

analyticsRouter.get('/dashboard', AnalyticsController.getDashboard);
analyticsRouter.get('/circulation', validateDateRangeQuery, AnalyticsController.getCirculationSummary);
analyticsRouter.get('/loans', AnalyticsController.getLoanOverview);
analyticsRouter.get('/popular-books', validatePopularBooksQuery, AnalyticsController.getPopularBooks);
analyticsRouter.get('/inventory', AnalyticsController.getInventorySummary);
analyticsRouter.get('/reservations', AnalyticsController.getReservationSummary);
analyticsRouter.get('/fines', validateDateRangeQuery, AnalyticsController.getFinesSummary);

export default analyticsRouter;
