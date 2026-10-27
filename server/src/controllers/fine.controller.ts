/**
 * LIBFLOW — Fine Controller (Financial Liabilities & Payment Collection)
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { FineService } from '../services/FineService.js';

export class FineController {
  /**
   * GET /api/v1/fines — List fines with pagination and filters (Staff only)
   */
  static listFines = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { page, limit, search, status, memberId, loanId, reason, unpaidOnly, sortBy } = req.query;

      const result = await FineService.listFines(
        {
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
          search: search as string | undefined,
          status: status as any,
          memberId: memberId as string | undefined,
          loanId: loanId as string | undefined,
          reason: reason as any,
          unpaidOnly: unpaidOnly === 'true' || unpaidOnly === '1',
          sortBy: sortBy as string | undefined,
          tenantId,
        },
        tenantId
      );

      res.status(200).json(
        ApiResponse.success('Fines retrieved successfully', result.items, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/fines/me — Retrieve authenticated member's own fines
   */
  static getOwnFines = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const memberId = (req.memberProfile?.id || req.memberProfile?.memberId || req.user!.id) as string;
      const { status, page, limit, unpaidOnly } = req.query;

      const result = await FineService.listFines(
        {
          memberId,
          status: status as any,
          unpaidOnly: unpaidOnly === 'true' || unpaidOnly === '1',
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
          tenantId,
        },
        tenantId
      );

      res.status(200).json(
        ApiResponse.success('Member financial liabilities retrieved successfully', result.items, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/fines/:id — Retrieve single fine record with payments and waivers breakdown
   */
  static getFineById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { id } = req.params;
      const actorContext = {
        role: req.user!.role,
        userId: req.user!.id,
        memberId: (req.memberProfile?.id || req.memberProfile?.memberId) as string | undefined,
      };

      const fine = await FineService.getFineById(id, actorContext, tenantId);

      res.status(200).json(ApiResponse.success('Fine details retrieved successfully', fine));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/fines/:id/pay — Record a collected payment against an outstanding fine
   */
  static recordPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { id } = req.params;
      const { amount, method, transactionReference, notes } = req.body;
      const actorContext = {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        fullName: req.user!.fullName,
        memberId: (req.memberProfile?.id || req.memberProfile?.memberId) as string | undefined,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      };

      const updatedFine = await FineService.recordPaymentTransaction(
        id,
        amount,
        method,
        actorContext,
        transactionReference,
        notes,
        tenantId
      );

      res.status(200).json(ApiResponse.success('Payment recorded successfully', updatedFine));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/fines/:id/waive — Waive an outstanding fine (ADMIN only)
   */
  static recordWaiver = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { id } = req.params;
      const { amount, reason } = req.body;
      const actorContext = {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        fullName: req.user!.fullName,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      };

      const updatedFine = await FineService.recordWaiverTransaction(
        id,
        amount,
        reason,
        actorContext,
        tenantId
      );

      res.status(200).json(ApiResponse.success('Fine successfully waived with audit justification', updatedFine));
    } catch (error) {
      next(error);
    }
  };
}
