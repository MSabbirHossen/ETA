import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { NotificationService } from './notification.service.js';
import { Notification } from './notification.model.js';
import { NotificationDispatcher } from './notification-dispatcher.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { GuardianLink } from '../users/guardian-link.model.js';
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  EmailDeliveryStatus,
} from '@eta/types';
import { NotFoundError } from '../../common/errors.js';

vi.mock('./notification.model.js', async () => {
  const actual = await vi.importActual<any>('./notification.model.js');
  const MockNotification: any = vi.fn();
  MockNotification.find = vi.fn();
  MockNotification.findOne = vi.fn();
  MockNotification.findOneAndUpdate = vi.fn();
  MockNotification.findOneAndDelete = vi.fn();
  MockNotification.countDocuments = vi.fn();
  MockNotification.updateMany = vi.fn();
  MockNotification.insertMany = vi.fn();
  return {
    ...actual,
    Notification: MockNotification,
  };
});

vi.mock('../academic/enrollment.model.js', () => ({
  Enrollment: {
    find: vi.fn(),
  },
}));

vi.mock('../users/guardian-link.model.js', () => ({
  GuardianLink: {
    find: vi.fn(),
  },
}));

vi.mock('../users/user.model.js', () => ({
  User: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

vi.mock('./email/email.service.js', () => ({
  EmailService: {
    send: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('NotificationService & Dispatcher', () => {
  const userAId = new Types.ObjectId().toString();
  const userBId = new Types.ObjectId().toString();
  const notificationId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NotificationService', () => {
    it('retrieves paginated notifications for the requesting user', async () => {
      const mockNotifications = [
        {
          _id: new Types.ObjectId(notificationId),
          userId: new Types.ObjectId(userAId),
          type: NotificationType.ASSIGNMENT_PUBLISHED,
          category: NotificationCategory.ASSIGNMENT,
          title: 'New Assignment',
          body: 'Check coursework',
          priority: NotificationPriority.NORMAL,
          deliveredAt: new Date(),
          readAt: null,
          emailStatus: EmailDeliveryStatus.SKIPPED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const findQueryMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockNotifications),
      };

      (Notification.find as any).mockReturnValue(findQueryMock);
      (Notification.countDocuments as any)
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1); // unreadCount

      const result = await NotificationService.getUserNotifications(userAId, { unreadOnly: true });

      expect(result.data).toHaveLength(1);
      expect(result.unreadCount).toBe(1);
      expect(Notification.find).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: new Types.ObjectId(userAId),
          readAt: null,
        }),
      );
    });

    it('returns fast unread count for user', async () => {
      (Notification.countDocuments as any).mockResolvedValue(5);

      const count = await NotificationService.getUnreadCount(userAId);
      expect(count).toBe(5);
      expect(Notification.countDocuments).toHaveBeenCalledWith({
        userId: new Types.ObjectId(userAId),
        readAt: null,
      });
    });

    it('marks a single notification as read if owned by user', async () => {
      const updatedDoc = {
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userAId),
        type: NotificationType.GRADE_PUBLISHED,
        category: NotificationCategory.GRADE,
        title: 'Grade Ready',
        body: 'Grade published',
        priority: NotificationPriority.IMPORTANT,
        deliveredAt: new Date(),
        readAt: new Date(),
        emailStatus: EmailDeliveryStatus.SENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (Notification.findOneAndUpdate as any).mockResolvedValue(updatedDoc);

      const result = await NotificationService.markAsRead(notificationId, userAId);
      expect(result.readAt).not.toBeNull();
      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(notificationId),
          userId: new Types.ObjectId(userAId),
        },
        expect.any(Object),
        { new: true },
      );
    });

    it('rejects marking notification as read if owned by another user (IDOR protection)', async () => {
      (Notification.findOneAndUpdate as any).mockResolvedValue(null);

      await expect(
        NotificationService.markAsRead(notificationId, userBId),
      ).rejects.toThrow(NotFoundError);
    });

    it('marks all unread notifications as read for current user', async () => {
      (Notification.updateMany as any).mockResolvedValue({ modifiedCount: 4 });

      const result = await NotificationService.markAllAsRead(userAId);
      expect(result.modifiedCount).toBe(4);
      expect(Notification.updateMany).toHaveBeenCalledWith(
        {
          userId: new Types.ObjectId(userAId),
          readAt: null,
        },
        expect.any(Object),
      );
    });

    it('deletes notification if owned by current user', async () => {
      (Notification.findOneAndDelete as any).mockResolvedValue({ _id: notificationId });

      await NotificationService.deleteNotification(notificationId, userAId);
      expect(Notification.findOneAndDelete).toHaveBeenCalledWith({
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userAId),
      });
    });

    it('rejects deleting notification owned by another user (IDOR protection)', async () => {
      (Notification.findOneAndDelete as any).mockResolvedValue(null);

      await expect(
        NotificationService.deleteNotification(notificationId, userBId),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('NotificationDispatcher', () => {
    it('dispatches notifications in bulk with idempotency keys', async () => {
      (Notification.insertMany as any).mockResolvedValue([]);

      const count = await NotificationDispatcher.dispatch({
        recipientUserIds: [userAId, userBId, userAId], // includes duplicate
        type: NotificationType.ASSIGNMENT_PUBLISHED,
        category: NotificationCategory.ASSIGNMENT,
        title: 'New Quiz',
        body: 'Quiz published',
        sourceId: 'quiz-123',
      });

      expect(count).toBe(2); // deduplicated
      expect(Notification.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: new Types.ObjectId(userAId),
            idempotencyKey: `${userAId}:${NotificationType.ASSIGNMENT_PUBLISHED}:quiz-123`,
          }),
          expect.objectContaining({
            userId: new Types.ObjectId(userBId),
            idempotencyKey: `${userBId}:${NotificationType.ASSIGNMENT_PUBLISHED}:quiz-123`,
          }),
        ]),
        { ordered: false },
      );
    });

    it('resolves batch students and verified active guardians for grade publication', async () => {
      const studentId = new Types.ObjectId().toString();
      const guardianId = new Types.ObjectId().toString();

      (GuardianLink.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([{ guardianId: new Types.ObjectId(guardianId) }]),
        }),
      });

      (Notification.insertMany as any).mockResolvedValue([]);

      await NotificationDispatcher.dispatchGradePublished({
        _id: 'res-999',
        studentId,
        courseId: 'course-1',
        batchId: 'batch-1',
        finalPercentage: 92,
        letterGrade: 'A',
      } as any);

      expect(GuardianLink.find).toHaveBeenCalledWith({
        studentId: { $in: [new Types.ObjectId(studentId)] },
        status: 'ACTIVE',
        verified: true,
      });
      expect(Notification.insertMany).toHaveBeenCalledTimes(2); // 1 for student, 1 for guardian
    });
  });
});
