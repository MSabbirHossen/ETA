import { describe, it, expect, vi, beforeEach } from 'vitest';
import { academicService } from './academic.service';
import { Program } from './program.model';
import { Course } from './course.model';
import { Batch } from './batch.model';
import { Subject } from './subject.model';
import { Module } from './module.model';
import { Enrollment } from './enrollment.model';
import { User } from '../users/user.model';
import {
  UserRole,
  ProgramStatus,
  CourseLevel,
  CourseStatus,
  BatchStatus,
  EnrollmentStatus,
  EnrollmentSource,
  PaymentStatus,
} from '@eta/types';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../common/errors';

vi.mock('./program.model', () => ({
  toIProgram: vi.fn((doc) => doc),
  Program: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('./course.model', () => ({
  toICourse: vi.fn((doc) => doc),
  Course: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('./batch.model', () => ({
  toIBatch: vi.fn((doc) => doc),
  Batch: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('./subject.model', () => ({
  toISubject: vi.fn((doc) => doc),
  Subject: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('./module.model', () => ({
  toIModule: vi.fn((doc) => doc),
  Module: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('./enrollment.model', () => ({
  toIEnrollment: vi.fn((doc) => doc),
  Enrollment: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../users/user.model', () => ({
  toIUser: vi.fn((doc) => doc),
  User: {
    findOne: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

describe('Phase 2 Academic Domain & RBAC Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. PROGRAMS — PRD §13
  // =========================================================================
  describe('Program Operations', () => {
    it('creates a new academic program with auto-generated slug', async () => {
      vi.mocked(Program.findOne).mockResolvedValue(null);
      vi.mocked(Program.create).mockResolvedValue({
        _id: 'prog_1',
        name: 'Artificial Intelligence & Robotics',
        slug: 'artificial-intelligence-robotics',
        shortDescription: 'Cutting-edge training program',
        status: ProgramStatus.ACTIVE,
      } as any);

      const result = await academicService.createProgram({
        name: 'Artificial Intelligence & Robotics',
        shortDescription: 'Cutting-edge training program',
        status: ProgramStatus.ACTIVE,
      });

      expect(Program.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Artificial Intelligence & Robotics',
          slug: 'artificial-intelligence-robotics',
          status: ProgramStatus.ACTIVE,
        }),
      );
      expect(result.slug).toBe('artificial-intelligence-robotics');
    });

    it('rejects duplicate program slugs with ConflictError', async () => {
      vi.mocked(Program.findOne).mockResolvedValue({ _id: 'existing_prog' } as any);

      await expect(
        academicService.createProgram({
          name: 'Artificial Intelligence',
          shortDescription: 'Test',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  // =========================================================================
  // 2. COURSES & TEACHER ASSIGNMENTS — PRD §14
  // =========================================================================
  describe('Course Operations & Teacher Assignments', () => {
    it('creates a course and validates code uniqueness', async () => {
      vi.mocked(Course.findOne).mockResolvedValue(null);
      vi.mocked(Course.create).mockResolvedValue({
        _id: 'course_1',
        title: 'Deep Learning with PyTorch',
        code: 'CS201',
        slug: 'deep-learning-with-pytorch',
        description: 'Comprehensive deep learning',
      } as any);

      const result = await academicService.createCourse({
        title: 'Deep Learning with PyTorch',
        code: 'cs201',
        description: 'Comprehensive deep learning',
      });

      expect(Course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CS201',
          slug: 'deep-learning-with-pytorch',
        }),
      );
      expect(result.code).toBe('CS201');
    });

    it('successfully assigns a verified teacher to a course', async () => {
      const mockCourse = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Deep Learning',
        teacherIds: [],
        save: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(Course.findById).mockResolvedValue(mockCourse as any);

      const teacherHexId = '507f191e810c19729de860ea';
      const mockTeacherUser = {
        _id: teacherHexId,
        name: 'Dr. Fatima Al-Zahrani',
        roles: [UserRole.TEACHER],
      };
      vi.mocked(User.find).mockResolvedValue([mockTeacherUser] as any);

      await academicService.assignCourseTeachers('507f1f77bcf86cd799439011', [teacherHexId]);

      expect(mockCourse.save).toHaveBeenCalled();
      expect(mockCourse.teacherIds.length).toBe(1);
    });

    it('rejects teacher assignment if target user does not possess teacher role', async () => {
      const mockCourse = { _id: '507f1f77bcf86cd799439011', teacherIds: [], save: vi.fn() };
      vi.mocked(Course.findById).mockResolvedValue(mockCourse as any);

      const studentHexId = '507f191e810c19729de860eb';
      const mockStudentUser = {
        _id: studentHexId,
        name: 'Alice Student',
        roles: [UserRole.STUDENT],
      };
      vi.mocked(User.find).mockResolvedValue([mockStudentUser] as any);

      await expect(
        academicService.assignCourseTeachers('507f1f77bcf86cd799439011', [studentHexId]),
      ).rejects.toThrow(ValidationError);
    });
  });

  // =========================================================================
  // 3. BATCHES & DATE VALIDATION — PRD §15
  // =========================================================================
  describe('Batch Operations & Integrity', () => {
    it('creates a batch linked to an existing course with valid dates', async () => {
      vi.mocked(Course.findById).mockResolvedValue({ _id: 'course_1' } as any);
      vi.mocked(Batch.findOne).mockResolvedValue(null);
      vi.mocked(Batch.create).mockResolvedValue({
        _id: 'batch_1',
        courseId: 'course_1',
        batchName: 'Spring 2026 Alpha',
        batchCode: 'CS201-2026-A',
        studentLimit: 40,
      } as any);

      const result = await academicService.createBatch({
        courseId: 'course_1',
        batchName: 'Spring 2026 Alpha',
        batchCode: 'CS201-2026-A',
        startDate: '2026-03-01T00:00:00Z',
        endDate: '2026-06-01T00:00:00Z',
        enrollmentStart: '2026-02-01T00:00:00Z',
        enrollmentEnd: '2026-02-28T00:00:00Z',
        studentLimit: 40,
      });

      expect(Batch.create).toHaveBeenCalled();
      expect(result.batchCode).toBe('CS201-2026-A');
    });

    it('rejects batch creation when start date is after end date', async () => {
      vi.mocked(Course.findById).mockResolvedValue({ _id: 'course_1' } as any);

      await expect(
        academicService.createBatch({
          courseId: 'course_1',
          batchName: 'Invalid Dates Batch',
          batchCode: 'INVALID-1',
          startDate: '2026-06-01T00:00:00Z',
          endDate: '2026-03-01T00:00:00Z',
          enrollmentStart: '2026-01-01T00:00:00Z',
          enrollmentEnd: '2026-01-15T00:00:00Z',
          studentLimit: 30,
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // =========================================================================
  // 4. SUBJECTS & MODULES — PRD §16, §17
  // =========================================================================
  describe('Subject & Module Hierarchy', () => {
    it('creates a subject linked to a course', async () => {
      vi.mocked(Course.findById).mockResolvedValue({ _id: 'course_1' } as any);
      vi.mocked(Subject.findOne).mockResolvedValue(null);
      vi.mocked(Subject.create).mockResolvedValue({
        _id: 'sub_1',
        courseId: 'course_1',
        title: 'Transformers Architecture',
        code: 'SUB101',
        sequence: 1,
      } as any);

      const result = await academicService.createSubject({
        courseId: 'course_1',
        title: 'Transformers Architecture',
        code: 'sub101',
        sequence: 1,
      });

      expect(result.code).toBe('SUB101');
    });

    it('rejects a module having itself as a prerequisite', async () => {
      const mockModule = {
        _id: 'mod_1',
        title: 'Attention Mechanisms',
        save: vi.fn(),
      };
      vi.mocked(Module.findById).mockResolvedValue(mockModule as any);

      await expect(
        academicService.updateModule('mod_1', {
          unlockRules: { prerequisiteModuleId: 'mod_1' },
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // =========================================================================
  // 5. STUDENT ENROLLMENTS & DUPLICATE PREVENTION — PRD §41, §70
  // =========================================================================
  describe('Student Enrollment & Duplicate Prevention', () => {
    it('successfully enrolls a verified student into a valid batch', async () => {
      vi.mocked(User.findById).mockResolvedValue({
        _id: 'student_1',
        name: 'Tariq Mansoor',
        roles: [UserRole.STUDENT],
      } as any);

      vi.mocked(Course.findById).mockResolvedValue({ _id: 'course_1' } as any);
      vi.mocked(Batch.findById).mockResolvedValue({
        _id: 'batch_1',
        courseId: { toString: () => 'course_1' },
        studentLimit: 30,
      } as any);

      vi.mocked(Enrollment.findOne).mockResolvedValue(null);
      vi.mocked(Enrollment.countDocuments).mockResolvedValue(5);
      vi.mocked(Enrollment.create).mockResolvedValue({
        _id: 'enroll_1',
        studentId: 'student_1',
        courseId: 'course_1',
        batchId: 'batch_1',
        status: EnrollmentStatus.ACTIVE,
        paymentStatus: PaymentStatus.WAIVED,
      } as any);

      const result = await academicService.createEnrollment({
        studentId: 'student_1',
        courseId: 'course_1',
        batchId: 'batch_1',
      });

      expect(Enrollment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'student_1',
          courseId: 'course_1',
          batchId: 'batch_1',
          status: EnrollmentStatus.ACTIVE,
        }),
      );
      expect(result._id).toBe('enroll_1');
    });

    it('prevents duplicate student enrollment into the same batch (PRD §70 Compound Unique)', async () => {
      vi.mocked(User.findById).mockResolvedValue({
        _id: 'student_1',
        roles: [UserRole.STUDENT],
      } as any);
      vi.mocked(Course.findById).mockResolvedValue({ _id: 'course_1' } as any);
      vi.mocked(Batch.findById).mockResolvedValue({
        _id: 'batch_1',
        courseId: { toString: () => 'course_1' },
        studentLimit: 30,
      } as any);

      // Existing active enrollment found
      vi.mocked(Enrollment.findOne).mockResolvedValue({ _id: 'existing_enroll' } as any);

      await expect(
        academicService.createEnrollment({
          studentId: 'student_1',
          courseId: 'course_1',
          batchId: 'batch_1',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('rejects enrollment if target user does not have student role', async () => {
      vi.mocked(User.findById).mockResolvedValue({
        _id: 'admin_user',
        roles: [UserRole.ADMIN],
      } as any);

      await expect(
        academicService.createEnrollment({
          studentId: 'admin_user',
          courseId: 'course_1',
          batchId: 'batch_1',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects enrollment if batch capacity limit has been reached', async () => {
      vi.mocked(User.findById).mockResolvedValue({
        _id: 'student_2',
        roles: [UserRole.STUDENT],
      } as any);
      vi.mocked(Course.findById).mockResolvedValue({ _id: 'course_1' } as any);
      vi.mocked(Batch.findById).mockResolvedValue({
        _id: 'batch_1',
        courseId: { toString: () => 'course_1' },
        studentLimit: 25,
      } as any);

      vi.mocked(Enrollment.findOne).mockResolvedValue(null);
      // Currently 25 active enrollments
      vi.mocked(Enrollment.countDocuments).mockResolvedValue(25);

      await expect(
        academicService.createEnrollment({
          studentId: 'student_2',
          courseId: 'course_1',
          batchId: 'batch_1',
        }),
      ).rejects.toThrow(ValidationError);
    });
  });
});
