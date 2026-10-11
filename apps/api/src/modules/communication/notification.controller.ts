import type { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service.js';
import { sendSuccess } from '../../common/response.js';
import { UnauthorizedError } from '../../common/errors.js';

export class NotificationController {
  static async getUserNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await NotificationService.getUserNotifications(req.user._id.toString(), req.query);
      sendSuccess(res, result.data, 'Notifications retrieved successfully.', {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: Math.ceil(result.total / result.limit),
      });
    } catch (err) {
      next(err);
    }
  }

  static async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const count = await NotificationService.getUnreadCount(req.user._id.toString());
      sendSuccess(res, { unreadCount: count }, 'Unread count retrieved successfully.');
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const notification = await NotificationService.markAsRead(
        req.params.id as string,
        req.user._id.toString(),
      );
      sendSuccess(res, notification, 'Notification marked as read.');
    } catch (err) {
      next(err);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await NotificationService.markAllAsRead(req.user._id.toString());
      sendSuccess(res, result, 'All notifications marked as read.');
    } catch (err) {
      next(err);
    }
  }

  static async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      await NotificationService.deleteNotification(req.params.id as string, req.user._id.toString());
      sendSuccess(res, null, 'Notification dismissed successfully.');
    } catch (err) {
      next(err);
    }
  }
}
