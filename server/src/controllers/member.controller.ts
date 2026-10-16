/**
 * LIBFLOW — Member Controller (Patron Management & Self-Service)
 * 
 * Endpoints for institutional patron profile management, directory search,
 * and zero-trust patron self-profile inspections.
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { MemberService } from '../services/MemberService.js';

export class MemberController {
  /**
   * GET /api/v1/members — List members with pagination and filters (Staff only)
   */
  static listMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { page, limit, search, memberType, status, department, sortBy } = req.query;

      const result = await MemberService.listMembers(
        {
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
          search: search as string | undefined,
          memberType: memberType as any,
          status: status as any,
          department: department as string | undefined,
          sortBy: sortBy as string | undefined,
        },
        tenantId
      );

      res.status(200).json(
        ApiResponse.success('Members retrieved successfully', result.items, result.pagination)
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/members/me — Retrieve authenticated user's own member profile
   */
  static getOwnProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const userId = req.user!.id;

      const member = await MemberService.getMemberByUserId(userId, tenantId);

      res.status(200).json(ApiResponse.success('Member profile retrieved successfully', member));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/members/:id — Retrieve a member according to role and ownership
   */
  static getMemberById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const { id } = req.params;
      const actorContext = {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        memberId: (req.memberProfile?.id || req.memberProfile?.memberId) as string | undefined,
      };

      const member = await MemberService.getMemberById(id, actorContext, tenantId);

      res.status(200).json(ApiResponse.success('Member details retrieved successfully', member));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/members — Create a member (Staff only: ADMIN, LIBRARIAN)
   */
  static createMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || 'default-library';
      const actorContext = {
        actorId: req.user!.id,
        actorRole: req.user!.role,
        fullName: req.user!.fullName,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      };

      const created = await MemberService.createMember(req.body, actorContext, tenantId);

      res.status(201).json(ApiResponse.success('Member registered successfully', created));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/members/:id — Update allowed profile fields (Staff full, Patron self-contact)
   */
  static updateMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const updated = await MemberService.updateMember(id, req.body, actorContext, tenantId);

      res.status(200).json(ApiResponse.success('Member profile updated successfully', updated));
    } catch (error) {
      next(error);
    }
  };
}
