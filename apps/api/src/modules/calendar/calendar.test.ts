import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { CalendarService } from './calendar.service';
import {
  UserRole,
  CalendarEventType,
  CalendarSourceType,
  ClassStatus,
  AssignmentStatus,
  AnnouncementAudience,
  AnnouncementStatus,
  type IUser,
} from '@eta/types';
import { ClassSession } from '../learning/class-session.model';
import { Assignment } from '../assignment/assignment.model';
import { AssessmentModel } from '../assessment/assessment.model';
import { Announcement } from '../communication/announcement.model';
import { Batch } from '../academic/batch.model';
import { Enrollment } from '../academic/enrollment.model';
import { GuardianLink } from '../users/guardian-link.model';
import { ManualCalendarEvent } from './manual-event.model';

vi.mock('../learning/class-session.model', () => ({
  ClassSession: { find: vi.fn() },
}));
vi.mock('../assignment/assignment.model', () => ({
  Assignment: { find: vi.fn() },
}));
vi.mock('../assessment/assessment.model', () => ({
  AssessmentModel: { find: vi.fn() },
}));
vi.mock('../communication/announcement.model', () => ({
  Announcement: { find: vi.fn() },
}));
vi.mock('../academic/batch.model', () => ({
  Batch: { find: vi.fn(), findOne: vi.fn() },
}));
vi.mock('../academic/enrollment.model', () => ({
  Enrollment: { find: vi.fn() },
}));
vi.mock('../users/guardian-link.model', () => ({
  GuardianLink: { find: vi.fn() },
}));
vi.mock('./manual-event.model', () => ({
  ManualCalendarEvent: Object.assign(vi.fn(), {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndDelete: vi.fn(),
  }),
  toManualCalendarEventDTO: vi.fn((doc) => ({
    id: doc._id?.toString() || 'manual-1',
    sourceType: CalendarSourceType.MANUAL_EVENT,
    sourceId: doc._id?.toString() || 'manual-1',
    title: doc.title,
    startAt: (doc.startAt instanceof Date ? doc.startAt : new Date(doc.startAt)).toISOString(),
    endAt: doc.endAt ? (doc.endAt instanceof Date ? doc.endAt : new Date(doc.endAt)).toISOString() : null,
    allDay: doc.allDay || false,
    eventType: doc.eventType,
    status: doc.status,
  })),
}));

describe('CalendarService Integration & Aggregation', () => {
  const studentId = new mongoose.Types.ObjectId().toString();
  const batchId = new mongoose.Types.ObjectId().toString();
  const courseId = new mongoose.Types.ObjectId().toString();

  const mockStudentUser: IUser = {
    _id: studentId,
    firebaseUid: 'firebase-student',
    name: 'Student User',
    email: 'student@eta.edu',
    roles: [UserRole.STUDENT],
    activeRole: UserRole.STUDENT,
    status: 'active' as any,
    preferredLanguage: 'en',
    timezone: 'Asia/Riyadh',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock setup for chaining
    (ClassSession.find as any).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    (Assignment.find as any).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    (AssessmentModel.find as any).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    (Announcement.find as any).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    (Batch.find as any).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    (ManualCalendarEvent.find as any).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    (Enrollment.find as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ batchId, courseId }]),
      }),
    });
    (GuardianLink.find as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    });
  });

  it('aggregates class, assignment, quiz, and batch milestones chronologically for student', async () => {
    const classId = new mongoose.Types.ObjectId().toString();
    const assignmentId = new mongoose.Types.ObjectId().toString();
    const quizId = new mongoose.Types.ObjectId().toString();

    const start1 = new Date('2026-10-10T10:00:00Z');
    const start2 = new Date('2026-10-11T14:00:00Z');
    const start3 = new Date('2026-10-12T09:00:00Z');

    (ClassSession.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: classId,
          title: 'Advanced Mathematics Lecture',
          batchId,
          courseId,
          scheduledStart: start1,
          scheduledEnd: new Date('2026-10-10T11:30:00Z'),
          status: ClassStatus.SCHEDULED,
          platform: 'GOOGLE_MEET',
        },
      ]),
    });

    (Assignment.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: assignmentId,
          title: 'Problem Set 1',
          batchId,
          courseId,
          publishDate: new Date('2026-10-01T00:00:00Z'),
          dueDate: start3,
          closesAt: start3,
          status: AssignmentStatus.PUBLISHED,
          totalMarks: 100,
        },
      ]),
    });

    (AssessmentModel.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: quizId,
          title: 'Midterm Quiz',
          batchId,
          courseId,
          assessmentType: 'QUIZ',
          opensAt: start2,
          dueAt: new Date('2026-10-11T15:00:00Z'),
          durationMinutes: 60,
          totalMarks: 50,
          status: 'PUBLISHED',
        },
      ]),
    });

    const response = await CalendarService.getEvents(
      {
        from: '2026-10-01T00:00:00Z',
        to: '2026-10-31T23:59:59Z',
      },
      mockStudentUser,
      UserRole.STUDENT
    );

    expect(response.total).toBe(3);
    expect(response.events[0].id).toBe(`class-${classId}`);
    expect(response.events[0].eventType).toBe(CalendarEventType.CLASS);
    expect(response.events[1].id).toBe(`assessment-${quizId}`);
    expect(response.events[1].eventType).toBe(CalendarEventType.QUIZ);
    expect(response.events[2].id).toBe(`assignment-${assignmentId}`);
    expect(response.events[2].eventType).toBe(CalendarEventType.ASSIGNMENT_DUE);
  });

  it('restricts unauthenticated visitors to only public announcements and events', async () => {
    (Announcement.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: 'ann-pub',
          title: 'Campus Open Day',
          body: 'Welcome to our campus open house.',
          publishAt: new Date('2026-10-15T09:00:00Z'),
          isPublic: true,
          status: AnnouncementStatus.PUBLISHED,
          priority: 'normal',
        },
      ]),
    });

    const response = await CalendarService.getEvents(
      {
        from: '2026-10-01T00:00:00Z',
        to: '2026-10-31T23:59:59Z',
      },
      undefined,
      UserRole.VISITOR
    );

    expect(ClassSession.find).not.toHaveBeenCalled();
    expect(Assignment.find).not.toHaveBeenCalled();
    expect(AssessmentModel.find).not.toHaveBeenCalled();
    expect(response.total).toBe(1);
    expect(response.events[0].title).toContain('Campus Open Day');
  });

  it('guardian sees only events of active verified linked student', async () => {
    const guardianId = new mongoose.Types.ObjectId().toString();
    const linkedStudentId = new mongoose.Types.ObjectId().toString();
    const mockGuardianUser: IUser = {
      _id: guardianId,
      firebaseUid: 'firebase-guardian',
      name: 'Guardian Parent',
      email: 'parent@eta.edu',
      roles: [UserRole.GUARDIAN],
      activeRole: UserRole.GUARDIAN,
      status: 'active' as any,
      preferredLanguage: 'en',
      timezone: 'Asia/Riyadh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (GuardianLink.find as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ studentId: linkedStudentId }]),
      }),
    });

    (Enrollment.find as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ batchId, courseId }]),
      }),
    });

    (Assignment.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: 'assign-child',
          title: 'Child Science Project',
          batchId,
          courseId,
          dueDate: new Date('2026-10-20T12:00:00Z'),
          status: AssignmentStatus.PUBLISHED,
          totalMarks: 50,
          publishDate: new Date('2026-10-01T00:00:00Z'),
        },
      ]),
    });

    const response = await CalendarService.getEvents(
      {
        from: '2026-10-01T00:00:00Z',
        to: '2026-10-31T23:59:59Z',
      },
      mockGuardianUser,
      UserRole.GUARDIAN
    );

    expect(GuardianLink.find).toHaveBeenCalledWith(
      expect.objectContaining({
        guardianId: expect.any(mongoose.Types.ObjectId),
        status: 'ACTIVE',
        verified: true,
      })
    );
    expect(response.total).toBe(1);
    expect(response.events[0].title).toBe('Assignment Due: Child Science Project');
  });

  it('rejects guardian calendar query if link is pending or revoked', async () => {
    const guardianId = new mongoose.Types.ObjectId().toString();
    const mockGuardianUser: IUser = {
      _id: guardianId,
      firebaseUid: 'firebase-guardian-2',
      name: 'Revoked Parent',
      email: 'revoked@eta.edu',
      roles: [UserRole.GUARDIAN],
      activeRole: UserRole.GUARDIAN,
      status: 'active' as any,
      preferredLanguage: 'en',
      timezone: 'Asia/Riyadh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // No active links returned
    (GuardianLink.find as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    });

    const response = await CalendarService.getEvents(
      {
        from: '2026-10-01T00:00:00Z',
        to: '2026-10-31T23:59:59Z',
      },
      mockGuardianUser,
      UserRole.GUARDIAN
    );

    expect(response.total).toBe(0);
    expect(Assignment.find).not.toHaveBeenCalled();
    expect(ClassSession.find).not.toHaveBeenCalled();
  });

  it('reflects class cancellation status correctly in projected event', async () => {
    (ClassSession.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: 'class-cancelled-1',
          title: 'Physics Lab',
          batchId,
          courseId,
          scheduledStart: new Date('2026-10-18T10:00:00Z'),
          scheduledEnd: new Date('2026-10-18T12:00:00Z'),
          status: ClassStatus.CANCELLED,
          platform: 'GOOGLE_MEET',
        },
      ]),
    });

    const response = await CalendarService.getEvents(
      {
        from: '2026-10-01T00:00:00Z',
        to: '2026-10-31T23:59:59Z',
      },
      mockStudentUser,
      UserRole.STUDENT
    );

    expect(response.events[0].status).toBe('cancelled');
    expect(response.events[0].actionUrl).toBe('/student/classes');
  });
});
