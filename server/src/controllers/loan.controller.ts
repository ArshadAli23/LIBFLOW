/**
 * LIBFLOW — Loan Controller (Circulation Desk & Self-Service)
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { LoanService } from '../services/LoanService.js';
import { ApiError } from '../utils/ApiError.js';

export class LoanController {
  /**
   * POST /api/v1/loans/checkout — Checkout an available physical copy
   */
  static checkout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const actorContext = {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        fullName: req.user!.fullName,
        memberId: (req.memberProfile?.id || req.memberProfile?.memberId) as string | undefined,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      };

      const memberId =
        req.user?.role === 'MEMBER'
          ? (req.memberProfile?.id || req.user.id) as string
          : req.body.memberId;

      const loan = await LoanService.checkout(
        {
          ...req.body,
          memberId,
          tenantId,
        },
        actorContext,
        tenantId
      );

      res.status(201).json(ApiResponse.success('Book copy checked out successfully', loan));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/loans/:id/return — Return a borrowed book copy
   */
  static returnLoan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { id } = req.params;
      const actorContext = {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        fullName: req.user!.fullName,
        memberId: (req.memberProfile?.id || req.memberProfile?.memberId) as string | undefined,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      };

      const result = await LoanService.returnLoan(id, actorContext, tenantId);

      const message =
        result.fineAssessed && result.fineAssessed > 0
          ? `Book returned. Overdue fine of ₹${result.fineAssessed.toFixed(2)} assessed.`
          : 'Book returned successfully to circulation.';

      res.status(200).json(ApiResponse.success(message, result.loan, { fineAssessed: result.fineAssessed }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/loans/:id/renew — Renew an active loan
   */
  static renewLoan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { id } = req.params;
      const actorContext = {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        fullName: req.user!.fullName,
        memberId: (req.memberProfile?.id || req.memberProfile?.memberId) as string | undefined,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      };

      const renewed = await LoanService.renewLoan(id, actorContext, tenantId);

      res.status(200).json(ApiResponse.success('Loan renewed successfully', renewed));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/loans — List loans with pagination and filters (Staff only)
   */
  static listLoans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { page, limit, search, status, memberId, bookId, bookCopyId, overdueOnly, sortBy } = req.query;

      const result = await LoanService.listLoans(
        {
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
          search: search as string | undefined,
          status: status as any,
          memberId: memberId as string | undefined,
          bookId: bookId as string | undefined,
          bookCopyId: bookCopyId as string | undefined,
          overdueOnly: overdueOnly === 'true' || overdueOnly === '1',
          sortBy: sortBy as string | undefined,
          tenantId,
        },
        tenantId
      );

      res.status(200).json(
        ApiResponse.success('Loans retrieved successfully', result.items, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/loans/me — Retrieve authenticated member's own loans
   */
  static getOwnLoans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const memberId = (req.memberProfile?.id || req.memberProfile?.memberId || req.user!.id) as string;
      const { status, page, limit } = req.query;

      const result = await LoanService.getMemberLoans(
        memberId,
        {
          status: status as any,
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
        },
        tenantId
      );

      res.status(200).json(
        ApiResponse.success('Member circulation loans retrieved successfully', result.items, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/loans/:id — Get single loan details
   */
  static getLoanById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { id } = req.params;
      const actorContext = {
        role: req.user!.role,
        userId: req.user!.id,
        memberId: (req.memberProfile?.id || req.memberProfile?.memberId) as string | undefined,
      };

      const loan = await LoanService.getLoanById(id, actorContext, tenantId);

      res.status(200).json(ApiResponse.success('Loan details retrieved successfully', loan));
    } catch (error) {
      next(error);
    }
  };
}
