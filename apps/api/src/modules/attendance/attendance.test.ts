import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { AttendanceService } from './attendance.service.js';
import { AttendanceRecord, AttendanceSession } from './attendance.model.js';
import { ClassSession } from '../learning/class-session.model.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { User } from '../users/user.model.js';
import { GuardianLink } from '../users/guardian-link.model.js';
import {
  AttendanceStatus,
  AttendanceSessionStatus,
  EnrollmentStatus,
  UserRole,
} from '@eta/types';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '../../common/errors.js';

vi.mock('./attendance.model.js', async () => {
  const actual = await vi.importActual<any>('./attendance.model.js');
  const MockRecord: any = vi.fn().mockImplementation((data: any) => ({
    ...data,
    _id: new Types.ObjectId(),
    corrections: [],
    save: vi.fn().mockResolvedValue(undefined),
  }));
  MockRecord.create = vi.fn();
  MockRecord.findById = vi.fn();
  MockRecord.find = vi.fn();
  MockRecord.findOne = vi.fn();
  MockRecord.findOneAndUpdate = vi.fn();
  MockRecord.bulkWrite = vi.fn();
  MockRecord.aggregate = vi.fn();

  const MockSession: any = vi.fn().mockImplementation((data: any) => ({
    ...data,
    _id: new Types.ObjectId(),
    save: vi.fn().mockResolvedValue(undefined),
  }));
  MockSession.create = vi.fn();
  MockSession.findOne = vi.fn();
  MockSession.find = vi.fn();

  return {
    ...actual,
    AttendanceRecord: MockRecord,
    AttendanceSession: MockSession,
  };
});

vi.mock('../learning/class-session.model.js', () => {
  const MockClassSession: any = {
    findById: vi.fn(),
    find: vi.fn(),
  };
  return { ClassSession: MockClassSession };
});

vi.mock('../academic/course.model.js', () => {
  const MockCourse: any = {
    findById: vi.fn(),
    find: vi.fn(),
  };
  return { Course: MockCourse };
});

vi.mock('../academic/batch.model.js', () => {
  const MockBatch: any = {
    findById: vi.fn(),
    find: vi.fn(),
  };
  return { Batch: MockBatch };
});

vi.mock('../academic/enrollment.model.js', () => {
  const MockEnrollment: any = {
    find: vi.fn(),
    findOne: vi.fn(),
  };
  return { Enrollment: MockEnrollment };
});

vi.mock('../users/user.model.js', () => {
  const MockUser: any = {
    findById: vi.fn(),
    find: vi.fn(),
  };
  return { User: MockUser };
});

vi.mock('../users/guardian-link.model.js', () => {
  const MockGuardianLink: any = {
    findOne: vi.fn(),
  };
  return { GuardianLink: MockGuardianLink };
});

describe('AttendanceService (Phase 4C)', () => {
  const teacherId = new Types.ObjectId().toString();
  const unassignedTeacherId = new Types.ObjectId().toString();
  const adminId = new Types.ObjectId().toString();
  const student1Id = new Types.ObjectId().toString();
  const student2Id = new Types.ObjectId().toString();
  const outsideStudentId = new Types.ObjectId().toString();

  const classSessionId = new Types.ObjectId().toString();
  const batchId = new Types.ObjectId().toString();
  const courseId = new Types.ObjectId().toString();

  const mockClassSessionDoc: any = {
    _id: new Types.ObjectId(classSessionId),
    title: 'Advanced React Patterns',
    teacherId: new Types.ObjectId(teacherId),
    batchId: new Types.ObjectId(batchId),
    courseId: new Types.ObjectId(courseId),
    scheduledStart: new Date('2026-10-10T10:00:00Z'),
    scheduledEnd: new Date('2026-10-10T12:00:00Z'),
    status: 'SCHEDULED',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Teacher Authorization Scope', () => {
    it('allows assigned teacher of the class session', async () => {
      await expect(
        AttendanceService.verifyTeacherOrAdmin(
          teacherId,
          [UserRole.TEACHER],
          mockClassSessionDoc,
        ),
      ).resolves.toBeUndefined();
    });

    it('allows Admin regardless of specific assignment', async () => {
      await expect(
        AttendanceService.verifyTeacherOrAdmin(
          adminId,
          [UserRole.ADMIN],
          mockClassSessionDoc,
        ),
      ).resolves.toBeUndefined();
    });

    it('rejects unassigned teacher with 403 Forbidden', async () => {
      (Batch.findById as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ teacherIds: [new Types.ObjectId(teacherId)] }),
        }),
      });
      (Course.findById as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ teacherIds: [new Types.ObjectId(teacherId)] }),
        }),
      });

      await expect(
        AttendanceService.verifyTeacherOrAdmin(
          unassignedTeacherId,
          [UserRole.TEACHER],
          mockClassSessionDoc,
        ),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('2. Roster Generation & Active Enrollment Verification', () => {
    it('generates roster containing only actively enrolled students and their attendance status', async () => {
      (ClassSession.findById as any).mockResolvedValue(mockClassSessionDoc);
      (Batch.findById as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ batchName: 'Batch 2026A' }),
        }),
      });
      (Course.findById as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ title: 'Full Stack Web Development' }),
        }),
      });
      (User.findById as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ name: 'Instructor John' }),
        }),
      });

      (AttendanceSession.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(),
        classSessionId: new Types.ObjectId(classSessionId),
        courseId: new Types.ObjectId(courseId),
        batchId: new Types.ObjectId(batchId),
        status: AttendanceSessionStatus.OPEN,
        openedBy: new Types.ObjectId(teacherId),
        openedAt: new Date(),
      });

      // Active enrollments for this batch
      (Enrollment.find as any).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              studentId: {
                _id: new Types.ObjectId(student1Id),
                name: 'Alice Smith',
                email: 'alice@example.com',
                avatarUrl: null,
              },
            },
            {
              studentId: {
                _id: new Types.ObjectId(student2Id),
                name: 'Bob Jones',
                email: 'bob@example.com',
                avatarUrl: null,
              },
            },
          ]),
        }),
      });

      // Existing records: Alice is PRESENT, Bob is unmarked
      (AttendanceRecord.find as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: new Types.ObjectId(),
            studentId: new Types.ObjectId(student1Id),
            classSessionId: new Types.ObjectId(classSessionId),
            status: AttendanceStatus.PRESENT,
            markedBy: new Types.ObjectId(teacherId),
            markedAt: new Date(),
          },
        ]),
      });

      const rosterResponse = await AttendanceService.getClassRoster(
        teacherId,
        [UserRole.TEACHER],
        classSessionId,
      );

      expect(rosterResponse.roster).toHaveLength(2);
      expect(rosterResponse.roster[0].studentName).toBe('Alice Smith');
      expect(rosterResponse.roster[0].status).toBe(AttendanceStatus.PRESENT);

      expect(rosterResponse.roster[1].studentName).toBe('Bob Jones');
      expect(rosterResponse.roster[1].status).toBeNull();

      expect(rosterResponse.stats.totalEligible).toBe(2);
      expect(rosterResponse.stats.present).toBe(1);
      expect(rosterResponse.stats.unmarked).toBe(1);
    });
  });

  describe('3. Attendance Marking & Data Integrity', () => {
    it('marks attendance successfully for an actively enrolled student', async () => {
      (ClassSession.findById as any).mockResolvedValue(mockClassSessionDoc);
      (AttendanceSession.findOne as any).mockResolvedValue({
        status: AttendanceSessionStatus.OPEN,
      });

      (Enrollment.findOne as any).mockResolvedValue({
        studentId: new Types.ObjectId(student1Id),
        batchId: new Types.ObjectId(batchId),
        status: EnrollmentStatus.ACTIVE,
      });

      const mockSavedRecord: any = {
        _id: new Types.ObjectId(),
        classSessionId: new Types.ObjectId(classSessionId),
        courseId: new Types.ObjectId(courseId),
        batchId: new Types.ObjectId(batchId),
        studentId: new Types.ObjectId(student1Id),
        status: AttendanceStatus.PRESENT,
        markedBy: new Types.ObjectId(teacherId),
        markedAt: new Date(),
        corrections: [],
      };
      (AttendanceRecord.findOneAndUpdate as any).mockResolvedValue(mockSavedRecord);

      const record = await AttendanceService.markSingleAttendance(
        teacherId,
        [UserRole.TEACHER],
        classSessionId,
        {
          studentId: student1Id,
          status: AttendanceStatus.PRESENT,
          note: 'On time and engaged',
        },
      );

      expect(record.status).toBe(AttendanceStatus.PRESENT);
      expect(AttendanceRecord.findOneAndUpdate).toHaveBeenCalledWith(
        { classSessionId, studentId: student1Id },
        expect.anything(),
        expect.anything(),
      );
    });

    it('rejects marking for a student not enrolled in the batch', async () => {
      (ClassSession.findById as any).mockResolvedValue(mockClassSessionDoc);
      (AttendanceSession.findOne as any).mockResolvedValue({
        status: AttendanceSessionStatus.OPEN,
      });

      (Enrollment.findOne as any).mockResolvedValue(null); // Not enrolled

      await expect(
        AttendanceService.markSingleAttendance(
          teacherId,
          [UserRole.TEACHER],
          classSessionId,
          {
            studentId: outsideStudentId,
            status: AttendanceStatus.PRESENT,
          },
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects regular marking when session is finalized', async () => {
      (ClassSession.findById as any).mockResolvedValue(mockClassSessionDoc);
      (AttendanceSession.findOne as any).mockResolvedValue({
        status: AttendanceSessionStatus.FINALIZED,
      });

      await expect(
        AttendanceService.markSingleAttendance(
          teacherId,
          [UserRole.TEACHER],
          classSessionId,
          {
            studentId: student1Id,
            status: AttendanceStatus.PRESENT,
          },
        ),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('4. Finalization & Auto-Absent Handling', () => {
    it('automatically creates ABSENT records for unmarked students on finalization', async () => {
      (ClassSession.findById as any).mockResolvedValue(mockClassSessionDoc);

      const mockSessionDoc: any = {
        _id: new Types.ObjectId(),
        classSessionId: new Types.ObjectId(classSessionId),
        courseId: new Types.ObjectId(courseId),
        batchId: new Types.ObjectId(batchId),
        status: AttendanceSessionStatus.OPEN,
        openedBy: new Types.ObjectId(teacherId),
        openedAt: new Date(),
        save: vi.fn().mockResolvedValue(undefined),
      };
      (AttendanceSession.findOne as any).mockResolvedValue(mockSessionDoc);

      // Active enrollments: student 1 and student 2
      (Enrollment.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { studentId: new Types.ObjectId(student1Id) },
            { studentId: new Types.ObjectId(student2Id) },
          ]),
        }),
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      });

      // Existing records: only student 1 was marked
      (AttendanceRecord.find as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { studentId: new Types.ObjectId(student1Id) },
          ]),
        }),
        lean: vi.fn().mockResolvedValue([]),
      });

      (Batch.findById as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ batchName: 'Batch A' }),
        }),
      });
      (Course.findById as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ title: 'Course A' }),
        }),
      });
      (User.findById as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ name: 'Teacher A' }),
        }),
      });

      await AttendanceService.finalizeAttendance(
        teacherId,
        [UserRole.TEACHER],
        classSessionId,
        { autoMarkAbsentForUnmarked: true, notes: 'Class finished' },
      );

      // Verify bulk write was called to mark student2 as ABSENT
      expect(AttendanceRecord.bulkWrite).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            updateOne: expect.objectContaining({
              filter: expect.objectContaining({
                studentId: new Types.ObjectId(student2Id),
              }),
            }),
          }),
        ]),
      );

      expect(mockSessionDoc.status).toBe(AttendanceSessionStatus.FINALIZED);
      expect(mockSessionDoc.save).toHaveBeenCalled();
    });
  });

  describe('5. Correction & Audit Trail', () => {
    it('appends correction audit entry with previous status and reason', async () => {
      const recordId = new Types.ObjectId().toString();
      const mockRecordDoc: any = {
        _id: new Types.ObjectId(recordId),
        classSessionId: new Types.ObjectId(classSessionId),
        courseId: new Types.ObjectId(courseId),
        batchId: new Types.ObjectId(batchId),
        studentId: new Types.ObjectId(student1Id),
        markedBy: new Types.ObjectId(teacherId),
        markedAt: new Date(),
        status: AttendanceStatus.ABSENT,
        corrections: [],
        save: vi.fn().mockResolvedValue(undefined),
      };

      (AttendanceRecord.findById as any).mockResolvedValue(mockRecordDoc);
      (ClassSession.findById as any).mockResolvedValue(mockClassSessionDoc);

      const corrected = await AttendanceService.correctAttendanceRecord(
        teacherId,
        [UserRole.TEACHER],
        recordId,
        {
          status: AttendanceStatus.PRESENT,
          reason: 'Student joined after technical outage',
        },
      );

      expect(mockRecordDoc.corrections).toHaveLength(1);
      expect(mockRecordDoc.corrections[0].previousStatus).toBe(AttendanceStatus.ABSENT);
      expect(mockRecordDoc.corrections[0].newStatus).toBe(AttendanceStatus.PRESENT);
      expect(mockRecordDoc.corrections[0].reason).toBe('Student joined after technical outage');
      expect(mockRecordDoc.status).toBe(AttendanceStatus.PRESENT);
      expect(mockRecordDoc.save).toHaveBeenCalled();
    });
  });

  describe('6. Student Access, IDOR Protection & Percentage Calculation', () => {
    it('allows student to view their own attendance history', async () => {
      const mockRecords = [
        {
          _id: new Types.ObjectId(),
          classSessionId: { title: 'Session 1' },
          batchId: { batchName: 'Batch 1' },
          courseId: { title: 'React 101' },
          studentId: new Types.ObjectId(student1Id),
          status: AttendanceStatus.PRESENT,
          markedBy: new Types.ObjectId(teacherId),
          markedAt: new Date(),
          corrections: [],
        },
        {
          _id: new Types.ObjectId(),
          classSessionId: { title: 'Session 2' },
          batchId: { batchName: 'Batch 1' },
          courseId: { title: 'React 101' },
          studentId: new Types.ObjectId(student1Id),
          status: AttendanceStatus.LATE,
          markedBy: new Types.ObjectId(teacherId),
          markedAt: new Date(),
          corrections: [],
        },
        {
          _id: new Types.ObjectId(),
          classSessionId: { title: 'Session 3' },
          batchId: { batchName: 'Batch 1' },
          courseId: { title: 'React 101' },
          studentId: new Types.ObjectId(student1Id),
          status: AttendanceStatus.ABSENT,
          markedBy: new Types.ObjectId(teacherId),
          markedAt: new Date(),
          corrections: [],
        },
      ];

      (AttendanceRecord.find as any).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              sort: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue(mockRecords),
              }),
            }),
          }),
        }),
      });

      const res = await AttendanceService.getStudentAttendance(
        student1Id,
        [UserRole.STUDENT],
      );

      expect(res.records).toHaveLength(3);
      expect(res.summary.totalClasses).toBe(3);
      expect(res.summary.presentCount).toBe(1);
      expect(res.summary.lateCount).toBe(1);
      expect(res.summary.absentCount).toBe(1);
      // Percentage: (1 present + 1 late) / 3 * 100 = 67%
      expect(res.summary.attendancePercentage).toBe(67);
    });

    it('protects against IDOR: student cannot view another student records', async () => {
      await expect(
        AttendanceService.getStudentAttendance(
          student1Id,
          [UserRole.STUDENT],
          student2Id, // Attempting to access student 2
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it('allows linked guardian to view student records and rejects unlinked guardian', async () => {
      const guardianId = new Types.ObjectId().toString();

      // 1. Linked guardian succeeds
      (GuardianLink.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          guardianId,
          studentId: student1Id,
          status: 'ACTIVE',
        }),
      });

      const mockRecords: any[] = [];
      (AttendanceRecord.find as any).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              sort: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue(mockRecords),
              }),
            }),
          }),
        }),
      });

      const res = await AttendanceService.getStudentAttendance(
        guardianId,
        [UserRole.GUARDIAN],
        student1Id,
      );
      expect(res.records).toHaveLength(0);

      // 2. Unlinked guardian fails
      (GuardianLink.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      await expect(
        AttendanceService.getStudentAttendance(
          guardianId,
          [UserRole.GUARDIAN],
          student1Id,
        ),
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
