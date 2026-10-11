import mongoose from 'mongoose';
import {
  type INotification,
  type NotificationFilterQuery,
} from '@eta/types';
import { Notification, toINotification } from './notification.model.js';
import { ValidationError, NotFoundError } from '../../common/errors.js';

export class NotificationService {
  /**
   * Get user's notifications with pagination and category filtering
   */
  static async getUserNotifications(
    userId: string,
    query: NotificationFilterQuery,
  ): Promise<{ data: INotification[]; total: number; unreadCount: number; page: number; limit: number }> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ValidationError('Invalid user ID format.');
    }

    const filter: Record<string, any> = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (query.unreadOnly) {
      filter.readAt = null;
    }
    if (query.category) {
      filter.category = query.category;
    }
    if (query.priority) {
      filter.priority = query.priority;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [docs, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: new mongoose.Types.ObjectId(userId), readAt: null }),
    ]);

    return {
      data: docs.map(toINotification),
      total,
      unreadCount,
      page,
      limit,
    };
  }

  /**
   * Fast unread count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ValidationError('Invalid user ID format.');
    }

    return Notification.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      readAt: null,
    });
  }

  /**
   * Mark a single notification as read (with IDOR protection)
   */
  static async markAsRead(notificationId: string, userId: string): Promise<INotification> {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw new ValidationError('Invalid notification ID format.');
    }

    const doc = await Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(notificationId),
        userId: new mongoose.Types.ObjectId(userId), // strict ownership check
      },
      {
        $set: { readAt: new Date() },
      },
      { new: true },
    );

    if (!doc) {
      throw new NotFoundError('Notification not found or access denied.');
    }

    return toINotification(doc);
  }

  /**
   * Mark all notifications as read for current user
   */
  static async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ValidationError('Invalid user ID format.');
    }

    const result = await Notification.updateMany(
      {
        userId: new mongoose.Types.ObjectId(userId),
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      },
    );

    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Delete a notification (with IDOR protection)
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw new ValidationError('Invalid notification ID format.');
    }

    const deleted = await Notification.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(notificationId),
      userId: new mongoose.Types.ObjectId(userId), // strict ownership check
    });

    if (!deleted) {
      throw new NotFoundError('Notification not found or access denied.');
    }
  }
}
