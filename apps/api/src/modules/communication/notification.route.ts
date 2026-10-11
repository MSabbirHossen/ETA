import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { authenticate, requireUser } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { validateQuery } from '../../middleware/validate.js';
import { Permission } from '@eta/types';
import { notificationFilterSchema } from '@eta/validation';

export const notificationRouter = Router();

// All notification endpoints require authenticated user
notificationRouter.use(authenticate, requireUser);

notificationRouter.get(
  '/',
  requirePermissions(Permission.NOTIFICATION_VIEW_SELF),
  validateQuery(notificationFilterSchema),
  NotificationController.getUserNotifications,
);

notificationRouter.get(
  '/unread-count',
  requirePermissions(Permission.NOTIFICATION_VIEW_SELF),
  NotificationController.getUnreadCount,
);

notificationRouter.patch(
  '/:id/read',
  requirePermissions(Permission.NOTIFICATION_MANAGE),
  NotificationController.markAsRead,
);

notificationRouter.post(
  '/mark-all-read',
  requirePermissions(Permission.NOTIFICATION_MANAGE),
  NotificationController.markAllAsRead,
);

notificationRouter.delete(
  '/:id',
  requirePermissions(Permission.NOTIFICATION_MANAGE),
  NotificationController.deleteNotification,
);
