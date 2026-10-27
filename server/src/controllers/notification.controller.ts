/**
 * LIBFLOW — Notification Controller
 * 
 * Routes incoming HTTP requests to NotificationService with authenticated context.
 */

import type { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import {
  NotificationService,
  type NotificationListFilters,
  type RecipientContext,
} from '../services/NotificationService.js';
import type { NotificationType, NotificationPriority } from '../models/Notification.js';

export class NotificationController {
  /**
   * GET /api/v1/notifications
   * Lists notifications for the authenticated patron or staff member.
   */
  static async listMyNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED');
      }

      const filters: NotificationListFilters = {
        page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 20,
        isRead:
          req.query.isRead !== undefined && req.query.isRead !== ''
            ? String(req.query.isRead).toLowerCase() === 'true'
            : undefined,
        type: req.query.type ? (String(req.query.type) as NotificationType) : undefined,
        priority: req.query.priority ? (String(req.query.priority) as NotificationPriority) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        recipientId: req.query.recipientId ? String(req.query.recipientId) : undefined,
      };

      const recipientContext: RecipientContext = {
        userId: req.user.id,
        memberId: (req.memberProfile as any)?.id || undefined,
        role: req.user.role,
        recipientId: filters.recipientId,
      };

      const result = await NotificationService.listNotifications(filters, recipientContext);

      res.status(200).json(
        ApiResponse.success('Notifications retrieved successfully', result.data, {
          pagination: result.pagination,
          unreadCount: result.unreadCount,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/notifications/:id
   * Retrieves single notification by ID.
   */
  static async getNotificationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED');
      }

      const recipientContext: RecipientContext = {
        userId: req.user.id,
        memberId: (req.memberProfile as any)?.id || undefined,
        role: req.user.role,
      };

      const notification = await NotificationService.getNotificationById(req.params.id, recipientContext);

      res.status(200).json(ApiResponse.success('Notification retrieved successfully', notification));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   * Marks a notification as read.
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED');
      }

      const recipientContext: RecipientContext = {
        userId: req.user.id,
        memberId: (req.memberProfile as any)?.id || undefined,
        role: req.user.role,
      };

      const updated = await NotificationService.markAsRead(req.params.id, recipientContext);

      res.status(200).json(ApiResponse.success('Notification marked as read', updated));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/notifications/read-all
   * Marks all unread notifications as read.
   */
  static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED');
      }

      const recipientContext: RecipientContext = {
        userId: req.user.id,
        memberId: (req.memberProfile as any)?.id || undefined,
        role: req.user.role,
      };

      const result = await NotificationService.markAllAsRead(recipientContext);

      res.status(200).json(ApiResponse.success('All unread notifications marked as read', result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/notifications/broadcast
   * Staff broadcast to user roles.
   */
  static async broadcastNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED');
      }

      const actorContext = {
        actorId: req.user.id,
        actorRole: req.user.role,
        fullName: req.user.fullName,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      const broadcast = await NotificationService.broadcast(req.body, actorContext);

      res.status(201).json(ApiResponse.success('Broadcast notification created and distributed', broadcast));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/notifications/scan-due-overdue
   * Staff-triggered sweep for due-soon and overdue loans.
   */
  static async triggerOverdueScan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED');
      }

      const result = await NotificationService.scanDueSoonAndOverdue();

      res.status(200).json(ApiResponse.success('Due-date and overdue scan completed successfully', result));
    } catch (error) {
      next(error);
    }
  }
}
