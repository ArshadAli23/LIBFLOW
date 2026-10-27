/**
 * LIBFLOW — Reservation Controller (Hold Queue & Pickup Operations)
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ReservationService } from '../services/ReservationService.js';

export class ReservationController {
  /**
   * POST /api/v1/reservations — Place a reservation hold on a book title
   */
  static createReservation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const resRecord = await ReservationService.createReservation(
        {
          ...req.body,
          tenantId,
        },
        actorContext,
        tenantId
      );

      const message =
        resRecord.status === 'READY_FOR_PICKUP'
          ? 'Book copy staged immediately. Ready for pickup within 48 hours.'
          : `Reservation hold placed. Current position in queue: #${resRecord.queuePosition}.`;

      res.status(201).json(ApiResponse.success(message, resRecord));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/reservations/:id/cancel — Cancel an active reservation hold
   */
  static cancelReservation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const cancelled = await ReservationService.cancelReservation(id, actorContext, tenantId);

      res.status(200).json(ApiResponse.success('Reservation hold successfully cancelled.', cancelled));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/reservations/:id/claim — Claim a ready pickup reservation and create active loan
   */
  static claimReservation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const result = await ReservationService.claimReservation(id, actorContext, tenantId);

      res.status(200).json(
        ApiResponse.success('Reservation claimed. Active loan created for physical copy.', result)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/reservations/process-expired — Process expired pickup reservations (Staff only)
   */
  static processExpired = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const actorContext = {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        fullName: req.user!.fullName,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      };

      const result = await ReservationService.processExpiredReservations(actorContext, tenantId);

      res.status(200).json(
        ApiResponse.success(`Processed ${result.processedCount} expired reservation holds.`, result)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/reservations — List reservations with pagination and filtering (Staff only)
   */
  static listReservations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { page, limit, search, status, bookId, memberId, sortBy } = req.query;

      const result = await ReservationService.listReservations(
        {
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
          search: search as string | undefined,
          status: status as any,
          bookId: bookId as string | undefined,
          memberId: memberId as string | undefined,
          sortBy: sortBy as string | undefined,
          tenantId,
        },
        tenantId
      );

      res.status(200).json(
        ApiResponse.success('Reservations retrieved successfully', result.items, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/reservations/me — Retrieve authenticated member's own reservations
   */
  static getOwnReservations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const memberId = (req.memberProfile?.id || req.memberProfile?.memberId || req.user!.id) as string;
      const { status, page, limit } = req.query;

      const result = await ReservationService.listReservations(
        {
          memberId,
          status: status as any,
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
          tenantId,
        },
        tenantId
      );

      res.status(200).json(
        ApiResponse.success('Member reservation holds retrieved successfully', result.items, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/reservations/:id — Get single reservation details
   */
  static getReservationById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { id } = req.params;
      const actorContext = {
        role: req.user!.role,
        userId: req.user!.id,
        memberId: (req.memberProfile?.id || req.memberProfile?.memberId) as string | undefined,
      };

      const resRecord = await ReservationService.getReservationById(id, actorContext, tenantId);

      res.status(200).json(ApiResponse.success('Reservation details retrieved successfully', resRecord));
    } catch (error) {
      next(error);
    }
  };
}
