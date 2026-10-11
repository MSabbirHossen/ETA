import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { AnnouncementService } from './announcement.service.js';
import { Announcement } from './announcement.model.js';
import { NotificationDispatcher } from './notification-dispatcher.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import {
  AnnouncementAudience,
  AnnouncementPriority,
  AnnouncementStatus,
  UserRole,
} from '@eta/types';
import { ForbiddenError, NotFoundError } from '../../common/errors.js';

vi.mock('./announcement.model.js', async () => {
  const actual = await vi.importActual<any>('./announcement.model.js');
  const MockAnnouncement: any = vi.fn();
  MockAnnouncement.find = vi.fn();
  MockAnnouncement.findById = vi.fn();
  MockAnnouncement.findByIdAndDelete = vi.fn();
  MockAnnouncement.countDocuments = vi.fn();
  MockAnnouncement.updateMany = vi.fn().mockResolvedValue({ modifiedCount: 0 });
  return {
    ...actual,
    Announcement: MockAnnouncement,
  };
});

vi.mock('../academic/course.model.js', () => ({
  Course: {
    exists: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../academic/batch.model.js', () => ({
  Batch: {
    exists: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
  },
}));

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

vi.mock('./notification-dispatcher.js', () => ({
  NotificationDispatcher: {
    dispatchAnnouncementPublished: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('AnnouncementService', () => {
  const adminId = new Types.ObjectId().toString();
  const teacherId = new Types.ObjectId().toString();
  const studentId = new Types.ObjectId().toString();
  const courseId = new Types.ObjectId().toString();
  const batchId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows admin to create an institutional announcement for all users', async () => {
    const saveMock = vi.fn().mockResolvedValue(undefined);
    (Announcement as any).mockImplementation((init: any) => ({
      ...init,
      _id: new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      save: saveMock,
    }));

    const result = await AnnouncementService.createAnnouncement(
      {
        title: 'Campus Closure for Maintenance',
        body: 'The physical facility will be closed this weekend.',
        audienceType: AnnouncementAudience.ALL,
        priority: AnnouncementPriority.URGENT,
      },
      adminId,
      [UserRole.ADMIN],
    );

    expect(result.title).toBe('Campus Closure for Maintenance');
    expect(result.priority).toBe(AnnouncementPriority.URGENT);
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('rejects announcement creation by student', async () => {
    await expect(
      AnnouncementService.createAnnouncement(
        {
          title: 'Student Post',
          body: 'Hello everyone.',
          audienceType: AnnouncementAudience.ALL,
        },
        studentId,
        [UserRole.STUDENT],
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it('allows teacher to create announcement for assigned batch', async () => {
    (Batch.exists as any).mockResolvedValue(true);
    (Batch.findById as any).mockResolvedValue({
      _id: new Types.ObjectId(batchId),
      teacherIds: [new Types.ObjectId(teacherId)],
    });

    const saveMock = vi.fn().mockResolvedValue(undefined);
    (Announcement as any).mockImplementation((init: any) => ({
      ...init,
      _id: new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      save: saveMock,
    }));

    const result = await AnnouncementService.createAnnouncement(
      {
        title: 'Lab Class Postponed',
        body: 'Lab session is postponed to Monday.',
        audienceType: AnnouncementAudience.BATCH,
        targetBatchId: batchId,
      },
      teacherId,
      [UserRole.TEACHER],
    );

    expect(result.title).toBe('Lab Class Postponed');
    expect(result.audience.audienceType).toBe(AnnouncementAudience.BATCH);
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('rejects teacher creating announcement for unassigned batch', async () => {
    (Batch.exists as any).mockResolvedValue(true);
    (Batch.findById as any).mockResolvedValue({
      _id: new Types.ObjectId(batchId),
      teacherIds: [new Types.ObjectId()], // different teacher
    });

    await expect(
      AnnouncementService.createAnnouncement(
        {
          title: 'Unassigned Batch Notice',
          body: 'Not my batch.',
          audienceType: AnnouncementAudience.BATCH,
          targetBatchId: batchId,
        },
        teacherId,
        [UserRole.TEACHER],
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it('hides scheduled and expired announcements from unauthenticated visitors', async () => {
    const findQueryMock = {
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          _id: new Types.ObjectId(),
          title: 'Public Welcome Notice',
          body: 'Welcome to ETA public catalog.',
          priority: AnnouncementPriority.NORMAL,
          status: AnnouncementStatus.PUBLISHED,
          audience: { audienceType: AnnouncementAudience.PUBLIC },
          publishAt: new Date(Date.now() - 3600000),
          expiresAt: null,
          createdBy: { _id: new Types.ObjectId(), name: 'Admin', email: 'admin@eta.edu' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    };
    (Announcement.find as any).mockReturnValue(findQueryMock);
    (Announcement.countDocuments as any).mockResolvedValue(1);

    const result = await AnnouncementService.getAnnouncements({});
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe('Public Welcome Notice');
    expect(Announcement.find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AnnouncementStatus.PUBLISHED,
        'audience.audienceType': AnnouncementAudience.PUBLIC,
      }),
    );
  });

  it('filters announcements for enrolled student', async () => {
    (Enrollment.find as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { courseId: new Types.ObjectId(courseId), batchId: new Types.ObjectId(batchId) },
        ]),
      }),
    });

    const findQueryMock = {
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    (Announcement.find as any).mockReturnValue(findQueryMock);
    (Announcement.countDocuments as any).mockResolvedValue(0);

    await AnnouncementService.getAnnouncements(
      {},
      { _id: studentId, roles: [UserRole.STUDENT] } as any,
      UserRole.STUDENT,
    );

    expect(Announcement.find).toHaveBeenCalled();
  });

  it('allows author to publish a draft announcement and triggers notification fan-out', async () => {
    const saveMock = vi.fn().mockResolvedValue(undefined);
    const mockDoc = {
      _id: new Types.ObjectId(),
      title: 'Graduation Gala Details',
      body: 'Details about the upcoming gala.',
      status: AnnouncementStatus.DRAFT,
      audience: { audienceType: AnnouncementAudience.STUDENTS },
      priority: AnnouncementPriority.IMPORTANT,
      publishAt: new Date(Date.now() + 86400000),
      createdBy: new Types.ObjectId(adminId),
      sendNotification: true,
      save: saveMock,
    };
    (Announcement.findById as any).mockResolvedValue(mockDoc);

    const result = await AnnouncementService.publishAnnouncement(
      mockDoc._id.toString(),
      adminId,
      [UserRole.ADMIN],
    );

    expect(result.status).toBe(AnnouncementStatus.PUBLISHED);
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(NotificationDispatcher.dispatchAnnouncementPublished).toHaveBeenCalledTimes(1);
  });

  it('allows admin to delete an announcement', async () => {
    const mockId = new Types.ObjectId().toString();
    (Announcement.findByIdAndDelete as any).mockResolvedValue({ _id: mockId });

    await AnnouncementService.deleteAnnouncement(mockId, [UserRole.ADMIN]);
    expect(Announcement.findByIdAndDelete).toHaveBeenCalledWith(mockId);
  });

  it('rejects deletion by non-admin', async () => {
    const mockId = new Types.ObjectId().toString();
    await expect(
      AnnouncementService.deleteAnnouncement(mockId, [UserRole.TEACHER]),
    ).rejects.toThrow(ForbiddenError);
  });
});
