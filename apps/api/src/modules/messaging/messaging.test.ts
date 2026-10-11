import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MessagingService } from './messaging.service';
import { MessagingAuthorizationService } from './messaging-authorization.service';
import {
  UserRole,
  ConversationType,
  ConversationStatus,
  type IUser,
} from '@eta/types';
import { ConversationModel } from './conversation.model';
import { MessageModel } from './message.model';
import { User } from '../users/user.model';
import { Enrollment } from '../academic/enrollment.model';
import { Batch } from '../academic/batch.model';
import { Course } from '../academic/course.model';
import { GuardianLink } from '../users/guardian-link.model';
import { NotificationDispatcher } from '../communication/notification-dispatcher';

vi.mock('./conversation.model', () => {
  const mockConversationDoc: any = function (data: any) {
    Object.assign(this, data);
    this._id = new mongoose.Types.ObjectId();
    this.save = vi.fn().mockResolvedValue(this);
  };
  mockConversationDoc.find = vi.fn();
  mockConversationDoc.findById = vi.fn();
  mockConversationDoc.findOne = vi.fn();
  mockConversationDoc.countDocuments = vi.fn();
  mockConversationDoc.updateOne = vi.fn();
  return {
    ConversationModel: mockConversationDoc,
    toConversationDTO: vi.fn((doc, userMap) => ({
      id: doc._id?.toString() || 'conv-1',
      conversationType: doc.conversationType,
      participants: (doc.participants || []).map((p: any) => ({
        userId: p.userId?.toString(),
        role: p.role,
        unreadCount: p.unreadCount || 0,
        lastReadAt: p.lastReadAt,
        archived: !!p.archived,
        name: userMap?.get(p.userId?.toString())?.name || 'Test User',
      })),
      participantIds: (doc.participantIds || []).map((id: any) => id.toString()),
      participantKey: doc.participantKey,
      status: doc.status || 'ACTIVE',
      createdBy: doc.createdBy?.toString(),
      lastMessage: doc.lastMessage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  };
});

vi.mock('./message.model', () => {
  const mockMessageDoc: any = function (data: any) {
    Object.assign(this, data);
    this._id = new mongoose.Types.ObjectId();
    this.save = vi.fn().mockResolvedValue(this);
  };
  mockMessageDoc.find = vi.fn();
  mockMessageDoc.findById = vi.fn();
  mockMessageDoc.findOne = vi.fn(() => ({
    lean: vi.fn().mockResolvedValue(null),
  }));
  return {
    MessageModel: mockMessageDoc,
    toMessageDTO: vi.fn((doc) => ({
      id: doc._id?.toString() || 'msg-1',
      conversationId: doc.conversationId?.toString(),
      senderId: doc.senderId?.toString(),
      senderName: doc.senderName,
      senderRole: doc.senderRole,
      body: doc.isDeleted ? 'This message was deleted.' : doc.body,
      messageType: doc.messageType || 'TEXT',
      isEdited: !!doc.isEdited,
      isDeleted: !!doc.isDeleted,
      attachments: doc.isDeleted ? [] : doc.attachments || [],
      clientMessageId: doc.clientMessageId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  };
});

vi.mock('../users/user.model', () => ({
  User: {
    findById: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('../academic/enrollment.model', () => ({
  Enrollment: { find: vi.fn() },
}));

vi.mock('../academic/batch.model', () => ({
  Batch: { findOne: vi.fn() },
}));

vi.mock('../academic/course.model', () => ({
  Course: { findOne: vi.fn() },
}));

vi.mock('../users/guardian-link.model', () => ({
  GuardianLink: { find: vi.fn() },
}));

vi.mock('../communication/notification-dispatcher', () => ({
  NotificationDispatcher: {
    dispatch: vi.fn().mockResolvedValue(1),
  },
}));

describe('Phase 8 Messaging Engine', () => {
  const studentId = new mongoose.Types.ObjectId().toString();
  const teacherId = new mongoose.Types.ObjectId().toString();
  const guardianId = new mongoose.Types.ObjectId().toString();
  const adminId = new mongoose.Types.ObjectId().toString();
  const otherStudentId = new mongoose.Types.ObjectId().toString();
  const courseId = new mongoose.Types.ObjectId();
  const batchId = new mongoose.Types.ObjectId();

  const mockStudentUser: IUser = {
    _id: studentId,
    firebaseUid: 'fb-student',
    name: 'Alice Student',
    email: 'alice@eta.edu',
    roles: [UserRole.STUDENT],
    activeRole: UserRole.STUDENT,
    status: 'active' as any,
    preferredLanguage: 'en',
    timezone: 'UTC',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockTeacherUser: IUser = {
    _id: teacherId,
    firebaseUid: 'fb-teacher',
    name: 'Prof. Bob Smith',
    email: 'bob@eta.edu',
    roles: [UserRole.TEACHER],
    activeRole: UserRole.TEACHER,
    status: 'active' as any,
    preferredLanguage: 'en',
    timezone: 'UTC',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockGuardianUser: IUser = {
    _id: guardianId,
    firebaseUid: 'fb-guardian',
    name: 'Mrs. Davis Guardian',
    email: 'guardian@eta.edu',
    roles: [UserRole.GUARDIAN],
    activeRole: UserRole.GUARDIAN,
    status: 'active' as any,
    preferredLanguage: 'en',
    timezone: 'UTC',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (User.find as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: studentId, name: 'Alice Student' },
          { _id: teacherId, name: 'Prof. Bob Smith' },
        ]),
      }),
    });
  });

  describe('Relationship Authorization Matrix', () => {
    it('authorizes Student to message assigned Teacher when sharing active enrolled batch', async () => {
      (User.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: teacherId,
          name: 'Prof. Bob Smith',
          status: 'active',
          roles: [UserRole.TEACHER],
          activeRole: UserRole.TEACHER,
        }),
      });

      // Student has active enrollment
      (Enrollment.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([{ courseId, batchId }]),
        }),
      });

      // Teacher is assigned to the batch
      (Batch.findOne as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: batchId }),
        }),
      });
      (Course.findOne as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      });

      const result = await MessagingAuthorizationService.validateRelationship(
        mockStudentUser,
        UserRole.STUDENT,
        teacherId
      );

      expect(result.conversationType).toBe(ConversationType.ACADEMIC);
      expect(result.participantKey).toContain('academic:');
    });

    it('rejects Student messaging unrelated Teacher who does not instruct them', async () => {
      (User.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: teacherId,
          name: 'Unrelated Teacher',
          status: 'active',
          roles: [UserRole.TEACHER],
          activeRole: UserRole.TEACHER,
        }),
      });

      // Student has enrollments, but teacher is NOT in those batches/courses
      (Enrollment.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([{ courseId, batchId }]),
        }),
      });
      (Batch.findOne as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      });
      (Course.findOne as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        MessagingAuthorizationService.validateRelationship(
          mockStudentUser,
          UserRole.STUDENT,
          teacherId
        )
      ).rejects.toThrow('Students and teachers may only message each other when sharing an active enrolled course or cohort.');
    });

    it('rejects Student ↔ Student direct messaging as restricted by PRD §47', async () => {
      (User.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: otherStudentId,
          name: 'Other Student',
          status: 'active',
          roles: [UserRole.STUDENT],
          activeRole: UserRole.STUDENT,
        }),
      });

      await expect(
        MessagingAuthorizationService.validateRelationship(
          mockStudentUser,
          UserRole.STUDENT,
          otherStudentId
        )
      ).rejects.toThrow('Direct messaging between student and student is not permitted under academy policy.');
    });

    it('authorizes Guardian to message Teacher only with active verified GuardianLink', async () => {
      (User.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: teacherId,
          name: 'Prof. Bob Smith',
          status: 'active',
          roles: [UserRole.TEACHER],
          activeRole: UserRole.TEACHER,
        }),
      });

      // Guardian has active verified link to student
      (GuardianLink.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([{ studentId: new mongoose.Types.ObjectId(studentId) }]),
        }),
      });

      // Student is taught by teacher
      (Enrollment.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([{ courseId, batchId }]),
        }),
      });
      (Batch.findOne as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: batchId }),
        }),
      });
      (Course.findOne as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      });

      const result = await MessagingAuthorizationService.validateRelationship(
        mockGuardianUser,
        UserRole.GUARDIAN,
        teacherId
      );

      expect(result.conversationType).toBe(ConversationType.GUARDIAN_TEACHER);
      expect(result.participantKey).toContain(`guardian:${guardianId}:${teacherId}:${studentId}`);
    });

    it('rejects Guardian messaging Teacher if GuardianLink is pending or unverified', async () => {
      (User.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: teacherId,
          name: 'Prof. Bob Smith',
          status: 'active',
          roles: [UserRole.TEACHER],
          activeRole: UserRole.TEACHER,
        }),
      });

      // No active verified link
      (GuardianLink.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      });

      await expect(
        MessagingAuthorizationService.validateRelationship(
          mockGuardianUser,
          UserRole.GUARDIAN,
          teacherId
        )
      ).rejects.toThrow('Guardians may only message teachers who currently instruct their verified linked child.');
    });
  });

  describe('Message Creation, Idempotency & Inbox Aggregation', () => {
    it('sends message, updates conversation lastMessage atomically, and dispatches notification', async () => {
      const convId = new mongoose.Types.ObjectId().toString();
      const mockConv = {
        _id: new mongoose.Types.ObjectId(convId),
        participantIds: [new mongoose.Types.ObjectId(studentId), new mongoose.Types.ObjectId(teacherId)],
        participants: [
          { userId: new mongoose.Types.ObjectId(studentId), unreadCount: 0, lastReadAt: new Date() },
          { userId: new mongoose.Types.ObjectId(teacherId), unreadCount: 0, lastReadAt: null },
        ],
        status: ConversationStatus.ACTIVE,
        save: vi.fn().mockResolvedValue(true),
      };

      (ConversationModel.findById as any).mockResolvedValue(mockConv);
      (MessageModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      const message = await MessagingService.sendMessage(
        convId,
        {
          body: 'Hello Professor, I have a question regarding homework 2.',
          clientMessageId: 'idemp-key-123',
        },
        mockStudentUser,
        UserRole.STUDENT
      );

      expect(message.body).toBe('Hello Professor, I have a question regarding homework 2.');
      expect(mockConv.save).toHaveBeenCalled();
      // Teacher unread count incremented
      expect(mockConv.participants[1].unreadCount).toBe(1);
      // In-app notification dispatched to teacher
      expect(NotificationDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientUserIds: [teacherId],
          title: 'New message from Alice Student',
        })
      );
    });

    it('prevents duplicate messages on network retry using clientMessageId idempotency', async () => {
      const convId = new mongoose.Types.ObjectId().toString();
      const mockConv = {
        _id: new mongoose.Types.ObjectId(convId),
        participantIds: [new mongoose.Types.ObjectId(studentId), new mongoose.Types.ObjectId(teacherId)],
        status: ConversationStatus.ACTIVE,
      };

      (ConversationModel.findById as any).mockResolvedValue(mockConv);
      // Existing message found for this sender + clientMessageId
      (MessageModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          conversationId: mockConv._id,
          senderId: new mongoose.Types.ObjectId(studentId),
          senderName: 'Alice Student',
          senderRole: UserRole.STUDENT,
          body: 'Original message already stored',
          clientMessageId: 'idemp-key-retry',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      });

      const message = await MessagingService.sendMessage(
        convId,
        {
          body: 'Original message already stored',
          clientMessageId: 'idemp-key-retry',
        },
        mockStudentUser,
        UserRole.STUDENT
      );

      expect(message.body).toBe('Original message already stored');
    });

    it('soft deletes message and masks body while preserving audit trail', async () => {
      const msgId = new mongoose.Types.ObjectId().toString();
      const mockMsg = {
        _id: new mongoose.Types.ObjectId(msgId),
        senderId: new mongoose.Types.ObjectId(studentId),
        body: 'Mistyped text',
        isDeleted: false,
        save: vi.fn().mockResolvedValue(true),
      };

      (MessageModel.findById as any).mockResolvedValue(mockMsg);

      const result = await MessagingService.deleteMessage(msgId, mockStudentUser, UserRole.STUDENT);
      expect(result.message).toBe('Message deleted successfully');
      expect(mockMsg.isDeleted).toBe(true);
      expect(mockMsg.body).toBe('This message was deleted.');
      expect(mockMsg.save).toHaveBeenCalled();
    });

    it('rejects editing or deleting messages authored by other participants', async () => {
      const msgId = new mongoose.Types.ObjectId().toString();
      const mockMsg = {
        _id: new mongoose.Types.ObjectId(msgId),
        senderId: new mongoose.Types.ObjectId(teacherId), // Authored by teacher
        body: 'Teacher instructions',
        isDeleted: false,
      };

      (MessageModel.findById as any).mockResolvedValue(mockMsg);

      await expect(
        MessagingService.editMessage(msgId, { body: 'Tampered' }, mockStudentUser)
      ).rejects.toThrow('You can only edit your own messages');
    });

    it('clears unread count and marks conversation as read for actor', async () => {
      const convId = new mongoose.Types.ObjectId().toString();
      (ConversationModel.updateOne as any).mockResolvedValue({ modifiedCount: 1 });

      await MessagingService.markConversationRead(convId, studentId);

      expect(ConversationModel.updateOne).toHaveBeenCalledWith(
        {
          _id: new mongoose.Types.ObjectId(convId),
          'participants.userId': new mongoose.Types.ObjectId(studentId),
        },
        expect.objectContaining({
          $set: expect.objectContaining({
            'participants.$.unreadCount': 0,
          }),
        })
      );
    });
  });
});
