import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { LearningService } from './learning.service';
import { Lesson } from './lesson.model';
import { LearningMaterial } from './material.model';
import { ClassSession } from './class-session.model';
import { Course } from '../academic/course.model';
import { Batch } from '../academic/batch.model';
import { Subject } from '../academic/subject.model';
import { Module } from '../academic/module.model';
import { Enrollment } from '../academic/enrollment.model';
import { User } from '../users/user.model';
import {
  UserRole,
  LessonStatus,
  LessonType,
  LessonVisibility,
  MaterialType,
  MaterialVisibility,
  ClassPlatform,
  ClassStatus,
} from '@eta/types';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../../common/errors';

// Mock Mongoose models as constructable classes
vi.mock('./lesson.model', () => {
  const MockLesson: any = vi.fn().mockImplementation((data: any) => ({
    ...data,
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439018'),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(undefined),
  }));
  MockLesson.findById = vi.fn();
  MockLesson.findOne = vi.fn();
  MockLesson.find = vi.fn();
  MockLesson.findByIdAndDelete = vi.fn();

  return {
    Lesson: MockLesson,
    toILesson: vi.fn((doc) => ({
      _id: doc._id ? doc._id.toString() : '507f1f77bcf86cd799439018',
      moduleId: doc.moduleId ? doc.moduleId.toString() : '507f1f77bcf86cd799439017',
      subjectId: doc.subjectId ? doc.subjectId.toString() : null,
      courseId: doc.courseId ? doc.courseId.toString() : null,
      title: doc.title,
      slug: doc.slug,
      sequenceOrder: doc.sequenceOrder,
      lessonType: doc.lessonType,
      status: doc.status,
      visibility: doc.visibility,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date().toISOString(),
    })),
  };
});

vi.mock('./material.model', () => {
  const MockMaterial: any = vi.fn().mockImplementation((data: any) => ({
    ...data,
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439019'),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(undefined),
  }));
  MockMaterial.findById = vi.fn();
  MockMaterial.findOne = vi.fn();
  MockMaterial.find = vi.fn();
  MockMaterial.findByIdAndDelete = vi.fn();

  return {
    LearningMaterial: MockMaterial,
    toILearningMaterial: vi.fn((doc) => ({
      _id: doc._id ? doc._id.toString() : '507f1f77bcf86cd799439019',
      lessonId: doc.lessonId ? doc.lessonId.toString() : null,
      courseId: doc.courseId ? doc.courseId.toString() : null,
      moduleId: doc.moduleId ? doc.moduleId.toString() : null,
      title: doc.title,
      type: doc.type,
      url: doc.url,
      downloadable: doc.downloadable ?? true,
      visibility: doc.visibility,
      status: doc.status,
      uploadedBy: doc.uploadedBy ? doc.uploadedBy.toString() : '507f1f77bcf86cd799439011',
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date().toISOString(),
    })),
  };
});

vi.mock('./class-session.model', () => {
  const MockClassSession: any = vi.fn().mockImplementation((data: any) => ({
    ...data,
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439020'),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(undefined),
  }));
  MockClassSession.findById = vi.fn();
  MockClassSession.findOne = vi.fn();
  MockClassSession.find = vi.fn();
  MockClassSession.findByIdAndDelete = vi.fn();

  return {
    ClassSession: MockClassSession,
    toIClassSession: vi.fn((doc) => ({
      _id: doc._id ? doc._id.toString() : '507f1f77bcf86cd799439020',
      title: doc.title,
      batchId: doc.batchId ? doc.batchId.toString() : '507f1f77bcf86cd799439015',
      courseId: doc.courseId ? doc.courseId.toString() : '507f1f77bcf86cd799439014',
      teacherId: doc.teacherId ? doc.teacherId.toString() : '507f1f77bcf86cd799439012',
      scheduledStart: doc.scheduledStart instanceof Date ? doc.scheduledStart.toISOString() : String(doc.scheduledStart),
      scheduledEnd: doc.scheduledEnd instanceof Date ? doc.scheduledEnd.toISOString() : String(doc.scheduledEnd),
      timezone: doc.timezone || 'Asia/Riyadh',
      platform: doc.platform,
      attendanceRequirement: doc.attendanceRequirement ?? true,
      status: doc.status,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date().toISOString(),
    })),
  };
});

vi.mock('../academic/course.model', () => ({
  Course: {
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('../academic/batch.model', () => ({
  Batch: {
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('../academic/subject.model', () => ({
  Subject: {
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('../academic/module.model', () => ({
  Module: {
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('../academic/enrollment.model', () => ({
  Enrollment: {
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('../users/user.model', () => ({
  User: {
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

describe('LearningService (Phase 3 Engine)', () => {
  const mockAdminId = '507f1f77bcf86cd799439011';
  const mockTeacherId = '507f1f77bcf86cd799439012';
  const mockStudentId = '507f1f77bcf86cd799439013';
  const mockCourseId = '507f1f77bcf86cd799439014';
  const mockBatchId = '507f1f77bcf86cd799439015';
  const mockSubjectId = '507f1f77bcf86cd799439016';
  const mockModuleId = '507f1f77bcf86cd799439017';
  const mockLessonId = '507f1f77bcf86cd799439018';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ====================================================
  // Lessons
  // ====================================================
  describe('Lesson Management', () => {
    it('should create a lesson when parent module exists and actor is authorized', async () => {
      vi.mocked(Module.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockModuleId),
        subjectId: new mongoose.Types.ObjectId(mockSubjectId),
      } as any);

      vi.mocked(Subject.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockSubjectId),
        courseId: new mongoose.Types.ObjectId(mockCourseId),
      } as any);

      vi.mocked(Lesson.findOne).mockResolvedValue(null);

      const result = await LearningService.createLesson(
        {
          moduleId: mockModuleId,
          title: 'Introduction to Neural Networks',
          lessonType: LessonType.VIDEO,
          videoUrl: 'https://example.com/video.mp4',
        },
        mockAdminId,
        [UserRole.ADMIN],
      );

      expect(result.title).toBe('Introduction to Neural Networks');
      expect(result.slug).toBe('introduction-to-neural-networks');
    });

    it('should reject lesson creation if parent module does not exist', async () => {
      vi.mocked(Module.findById).mockResolvedValue(null);

      await expect(
        LearningService.createLesson(
          {
            moduleId: mockModuleId,
            title: 'Ghost Lesson',
          },
          mockAdminId,
          [UserRole.ADMIN],
        ),
      ).rejects.toThrow(NotFoundError);
    });

    it('should reject teacher creating lesson if not assigned to course', async () => {
      vi.mocked(Module.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockModuleId),
        subjectId: new mongoose.Types.ObjectId(mockSubjectId),
      } as any);

      vi.mocked(Subject.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockSubjectId),
        courseId: new mongoose.Types.ObjectId(mockCourseId),
      } as any);

      vi.mocked(Course.findById).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: new mongoose.Types.ObjectId(mockCourseId),
            teacherIds: [new mongoose.Types.ObjectId('507f1f77bcf86cd799439099')],
          }),
        }),
      } as any);

      await expect(
        LearningService.createLesson(
          {
            moduleId: mockModuleId,
            title: 'Unauthorized Lesson',
          },
          mockTeacherId,
          [UserRole.TEACHER],
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it('should hide draft lessons from students in getLessons', async () => {
      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(mockLessonId),
            moduleId: new mongoose.Types.ObjectId(mockModuleId),
            title: 'Published Lesson',
            slug: 'published-lesson',
            sequenceOrder: 1,
            lessonType: LessonType.TEXT,
            status: LessonStatus.PUBLISHED,
            visibility: LessonVisibility.PUBLIC,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      });
      vi.mocked(Lesson.find).mockImplementation(mockFind as any);

      const lessons = await LearningService.getLessons(
        { moduleId: mockModuleId },
        { _id: mockStudentId, roles: [UserRole.STUDENT] } as any,
        UserRole.STUDENT,
      );

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({ status: LessonStatus.PUBLISHED }),
      );
      expect(lessons.length).toBe(1);
    });

    it('should reject student accessing enrollment-only lesson without active enrollment', async () => {
      vi.mocked(Lesson.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockLessonId),
        moduleId: new mongoose.Types.ObjectId(mockModuleId),
        courseId: new mongoose.Types.ObjectId(mockCourseId),
        title: 'Exclusive Lesson',
        slug: 'exclusive-lesson',
        sequenceOrder: 1,
        lessonType: LessonType.TEXT,
        status: LessonStatus.PUBLISHED,
        visibility: LessonVisibility.ENROLLMENT_ONLY,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(Enrollment.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      await expect(
        LearningService.getLessonById(
          mockLessonId,
          { _id: mockStudentId, roles: [UserRole.STUDENT] } as any,
          UserRole.STUDENT,
        ),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // ====================================================
  // Learning Materials
  // ====================================================
  describe('Learning Materials', () => {
    it('should create learning material linked to lesson', async () => {
      vi.mocked(Lesson.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockLessonId),
        moduleId: new mongoose.Types.ObjectId(mockModuleId),
        courseId: new mongoose.Types.ObjectId(mockCourseId),
      } as any);

      const material = await LearningService.createMaterial(
        {
          lessonId: mockLessonId,
          title: 'Lecture Slides PDF',
          type: MaterialType.PDF,
          url: 'https://storage.eta.edu/slides.pdf',
        },
        mockAdminId,
        [UserRole.ADMIN],
      );

      expect(material.title).toBe('Lecture Slides PDF');
      expect(material.type).toBe(MaterialType.PDF);
    });
  });

  // ====================================================
  // Class Sessions
  // ====================================================
  describe('Class Session Scheduling', () => {
    it('should schedule a valid class session', async () => {
      vi.mocked(Batch.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockBatchId),
        courseId: new mongoose.Types.ObjectId(mockCourseId),
      } as any);

      vi.mocked(User.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockTeacherId),
        roles: [UserRole.TEACHER],
      } as any);

      const session = await LearningService.createClassSession(
        {
          title: 'Live Q&A Session 1',
          batchId: mockBatchId,
          courseId: mockCourseId,
          teacherId: mockTeacherId,
          scheduledStart: '2026-11-01T10:00:00.000Z',
          scheduledEnd: '2026-11-01T11:30:00.000Z',
          platform: ClassPlatform.GOOGLE_MEET,
          meetingUrl: 'https://meet.google.com/abc-defg-hij',
        },
        mockAdminId,
        [UserRole.ADMIN],
      );

      expect(session.title).toBe('Live Q&A Session 1');
      expect(session.platform).toBe(ClassPlatform.GOOGLE_MEET);
    });

    it('should reject class scheduling if batch does not match course', async () => {
      vi.mocked(Batch.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockBatchId),
        courseId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439099'), // Different course
      } as any);

      await expect(
        LearningService.createClassSession(
          {
            title: 'Mismatch Session',
            batchId: mockBatchId,
            courseId: mockCourseId,
            teacherId: mockTeacherId,
            scheduledStart: '2026-11-01T10:00:00.000Z',
            scheduledEnd: '2026-11-01T11:30:00.000Z',
            platform: ClassPlatform.GOOGLE_MEET,
          },
          mockAdminId,
          [UserRole.ADMIN],
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject class scheduling if end time is before start time', async () => {
      vi.mocked(Batch.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockBatchId),
        courseId: new mongoose.Types.ObjectId(mockCourseId),
      } as any);

      vi.mocked(User.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(mockTeacherId),
        roles: [UserRole.TEACHER],
      } as any);

      await expect(
        LearningService.createClassSession(
          {
            title: 'Time Warp Session',
            batchId: mockBatchId,
            courseId: mockCourseId,
            teacherId: mockTeacherId,
            scheduledStart: '2026-11-01T12:00:00.000Z',
            scheduledEnd: '2026-11-01T10:00:00.000Z',
            platform: ClassPlatform.ZOOM,
          },
          mockAdminId,
          [UserRole.ADMIN],
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it('should filter class sessions to only batches student is enrolled in', async () => {
      vi.mocked(Enrollment.find).mockReturnValue({
        select: vi.fn().mockResolvedValue([
          { batchId: new mongoose.Types.ObjectId(mockBatchId) },
        ]),
      } as any);

      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439020'),
            title: 'Cohort Class',
            batchId: new mongoose.Types.ObjectId(mockBatchId),
            courseId: new mongoose.Types.ObjectId(mockCourseId),
            teacherId: new mongoose.Types.ObjectId(mockTeacherId),
            scheduledStart: new Date(),
            scheduledEnd: new Date(),
            timezone: 'Asia/Riyadh',
            platform: ClassPlatform.GOOGLE_MEET,
            attendanceRequirement: true,
            status: ClassStatus.SCHEDULED,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      });
      vi.mocked(ClassSession.find).mockImplementation(mockFind as any);

      const sessions = await LearningService.getClassSessions(
        {},
        { _id: mockStudentId, roles: [UserRole.STUDENT] } as any,
        UserRole.STUDENT,
      );

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          batchId: { $in: [expect.any(mongoose.Types.ObjectId)] },
        }),
      );
      expect(sessions.length).toBe(1);
    });

    it('should cancel class session and update status', async () => {
      const mockSessionDoc = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439020'),
        title: 'Live Class',
        batchId: new mongoose.Types.ObjectId(mockBatchId),
        courseId: new mongoose.Types.ObjectId(mockCourseId),
        teacherId: new mongoose.Types.ObjectId(mockTeacherId),
        scheduledStart: new Date(),
        scheduledEnd: new Date(),
        timezone: 'Asia/Riyadh',
        platform: ClassPlatform.GOOGLE_MEET,
        attendanceRequirement: true,
        status: ClassStatus.SCHEDULED,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(ClassSession.findById).mockResolvedValue(mockSessionDoc as any);

      const cancelled = await LearningService.cancelClassSession(
        '507f1f77bcf86cd799439020',
        mockAdminId,
        [UserRole.ADMIN],
      );

      expect(cancelled.status).toBe(ClassStatus.CANCELLED);
      expect(mockSessionDoc.save).toHaveBeenCalled();
    });
  });
});
