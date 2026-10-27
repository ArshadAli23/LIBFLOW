/**
 * LIBFLOW — Analytics & Reports Controller
 * 
 * Provides authorized staff with institutional circulation, collection, and inventory telemetry.
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AnalyticsService } from '../services/AnalyticsService.js';

export class AnalyticsController {
  /**
   * GET /api/v1/analytics/dashboard
   * Unified executive KPIs.
   */
  static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await AnalyticsService.getExecutiveDashboard();
      res.status(200).json(ApiResponse.success('Executive analytics dashboard retrieved', summary));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/circulation
   * Circulation metrics over date range.
   */
  static async getCirculationSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await AnalyticsService.getCirculationSummary({
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
      });
      res.status(200).json(ApiResponse.success('Circulation summary metrics retrieved', summary));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/loans
   * Loan portfolio distribution and overdue delinquency analysis.
   */
  static async getLoanOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await AnalyticsService.getLoanOverview();
      res.status(200).json(ApiResponse.success('Loan portfolio overview retrieved', overview));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/popular-books
   * Most borrowed bibliographic titles and category velocity.
   */
  static async getPopularBooks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
      const category = req.query.category ? String(req.query.category) : undefined;
      const popular = await AnalyticsService.getPopularBooks({ limit, category });
      res.status(200).json(ApiResponse.success('Popular books and borrowing trends retrieved', popular));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/inventory
   * Bibliographic catalog and physical copy inventory health.
   */
  static async getInventorySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const inventory = await AnalyticsService.getInventorySummary();
      res.status(200).json(ApiResponse.success('Inventory summary and physical asset status retrieved', inventory));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/reservations
   * Hold queue lengths and fulfillment statistics.
   */
  static async getReservationSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reservations = await AnalyticsService.getReservationSummary();
      res.status(200).json(ApiResponse.success('Reservation queue summaries retrieved', reservations));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/fines
   * Financial ledger assessments, collections, waivers, and outstanding balance.
   */
  static async getFinesSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fines = await AnalyticsService.getFinesSummary({
        startDate: req.query.startDate ? String(req.query.startDate) : undefined,
        endDate: req.query.endDate ? String(req.query.endDate) : undefined,
      });
      res.status(200).json(ApiResponse.success('Fine assessment and collections ledger retrieved', fines));
    } catch (error) {
      next(error);
    }
  }
}
