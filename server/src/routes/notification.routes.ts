/**
 * LIBFLOW — Notification Routes
 * 
 * Versioned endpoints under /api/v1/notifications
 */

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  validateNotificationQuery,
  validateNotificationId,
  validateBroadcastPayload,
} from '../middleware/notificationValidation.js';
import { NotificationController } from '../controllers/notification.controller.js';

export const notificationRouter: Router = Router();

// 1. Patron self-service notifications
notificationRouter.get(
  '/',
  authenticate,
  validateNotificationQuery,
  NotificationController.listMyNotifications
);

notificationRouter.patch(
  '/read-all',
  authenticate,
  NotificationController.markAllAsRead
);
notificationRouter.post(
  '/read-all',
  authenticate,
  NotificationController.markAllAsRead
);

notificationRouter.get(
  '/:id',
  authenticate,
  validateNotificationId,
  NotificationController.getNotificationById
);

notificationRouter.patch(
  '/:id/read',
  authenticate,
  validateNotificationId,
  NotificationController.markAsRead
);
notificationRouter.post(
  '/:id/read',
  authenticate,
  validateNotificationId,
  NotificationController.markAsRead
);

// 2. Staff administrative actions
notificationRouter.post(
  '/broadcast',
  authenticate,
  requireRole('ADMIN', 'LIBRARIAN'),
  validateBroadcastPayload,
  NotificationController.broadcastNotification
);

notificationRouter.post(
  '/scan-due-overdue',
  authenticate,
  requireRole('ADMIN', 'LIBRARIAN'),
  NotificationController.triggerOverdueScan
);

export default notificationRouter;
