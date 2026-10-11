import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { AssignmentService } from './assignment.service.js';
import { Assignment } from './assignment.model.js';
import { AssignmentSubmission } from './submission.model.js';
import { Batch } from '../academic/batch.model.js';
import { Course } from '../academic/course.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import {
  UserRole,
  AssignmentStatus,
  SubmissionStatus,
  SubmissionType,
  AssignmentVisibility,
  EnrollmentStatus,
  type IUser,
} from '@eta/types';

vi.mock('./assignment.model.js', () => {
  const MockAssignment: any = vi.fn().mockImplementation((data: any) => ({
    ...data,
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439018'),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(undefined),
  }));
  MockAssignment.findById = vi.fn();
  MockAssignment.findOne = vi.fn();
  MockAssignment.find = vi.fn();
  MockAssignment.findByIdAndDelete = vi.fn();

  return {
    Assignment: MockAssignment,
    toIAssignment: vi.fn((doc) => ({
      _id: doc._id?.toString() || '507f1f77bcf86cd799439018',
      title: doc.title,
      slug: doc.slug,
      description: doc.description ?? null,
      instructions: doc.instructions,
      courseId: doc.courseId?.toString(),
      batchId: doc.batchId?.toString(),
      subjectId: doc.subjectId ? doc.subjectId.toString() : null,
      moduleId: doc.moduleId ? doc.moduleId.toString() : null,
      lessonId: doc.lessonId ? doc.lessonId.toString() : null,
      teacherId: doc.teacherId?.toString(),
      attachments: doc.attachments || [],
      totalMarks: doc.totalMarks,
      passMarks: doc.passMarks ?? null,
      publishDate: doc.publishDate instanceof Date ? doc.publishDate.toISOString() : doc.publishDate,
      dueDate: doc.dueDate instanceof Date ? doc.dueDate.toISOString() : doc.dueDate,
      closesAt: doc.closesAt instanceof Date ? doc.closesAt.toISOString() : doc.closesAt ?? null,
      allowLateSubmission: doc.allowLateSubmission,
      latePenalty: doc.latePenalty,
      submissionType: doc.submissionType,
      maxAttempts: doc.maxAttempts,
      resubmissionAllowed: doc.resubmissionAllowed,
      status: doc.status,
      visibility: doc.visibility,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date().toISOString(),
    })),
  };
});

vi.mock('./submission.model.js', () => {
  const MockSubmission: any = vi.fn().mockImplementation((data: any) => ({
    ...data,
    _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439019'),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(undefined),
  }));
  MockSubmission.findById = vi.fn();
  MockSubmission.findOne = vi.fn();
  MockSubmission.find = vi.fn();
  MockSubmission.deleteMany = vi.fn();

  return {
    AssignmentSubmission: MockSubmission,
    toIAssignmentSubmission: vi.fn((doc) => ({
      _id: doc._id?.toString() || '507f1f77bcf86cd799439019',
      assignmentId: doc.assignmentId?.toString(),
      studentId: doc.studentId?.toString(),
      attemptNumber: doc.attemptNumber,
      submissionType: doc.submissionType,
      textContent: doc.textContent ?? null,
      attachments: doc.attachments || [],
      url: doc.url ?? null,
      submittedAt: doc.submittedAt instanceof Date ? doc.submittedAt.toISOString() : new Date().toISOString(),
      isLate: doc.isLate,
      status: doc.status,
      score: doc.score ?? null,
      feedback: doc.feedback ?? null,
      privateNotes: doc.privateNotes ?? null,
      feedbackAttachments: doc.feedbackAttachments || [],
      reviewedBy: doc.reviewedBy ? doc.reviewedBy.toString() : null,
      reviewedAt: doc.reviewedAt ? (doc.reviewedAt instanceof Date ? doc.reviewedAt.toISOString() : doc.reviewedAt) : null,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date().toISOString(),
    })),
  };
});

vi.mock('../academic/batch.model.js');
vi.mock('../academic/course.model.js');
vi.mock('../academic/subject.model.js');
vi.mock('../academic/module.model.js');
vi.mock('../learning/lesson.model.js');
vi.mock('../academic/enrollment.model.js');
vi.mock('../users/user.model.js');

describe('Assignment & Submission Engine (Phase 4A)', () => {
  const teacherId = new mongoose.Types.ObjectId().toString();
  const studentId = new mongoose.Types.ObjectId().toString();
  const courseId = new mongoose.Types.ObjectId().toString();
  const batchId = new mongoose.Types.ObjectId().toString();
  const assignmentId = new mongoose.Types.ObjectId().toString();

  const mockTeacherUser: IUser = {
    _id: teacherId,
    name: 'Teacher One',
    email: 'teacher@eta.test',
    roles: [UserRole.TEACHER],
    activeRole: UserRole.TEACHER,
    status: 'active' as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockStudentUser: IUser = {
    _id: studentId,
    name: 'Student One',
    email: 'student@eta.test',
    roles: [UserRole.STUDENT],
    activeRole: UserRole.STUDENT,
    status: 'active' as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Assignment Creation & Validation', () => {
    it('should create an assignment when valid details and assigned teacher are provided', async () => {
      vi.mocked(Batch.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(batchId),
        courseId: new mongoose.Types.ObjectId(courseId),
        teacherIds: [new mongoose.Types.ObjectId(teacherId)],
      } as any);

      vi.mocked(Course.findById).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: new mongoose.Types.ObjectId(courseId),
            teacherIds: [new mongoose.Types.ObjectId(teacherId)],
          }),
        }),
      } as any);

      vi.mocked(Assignment.findOne).mockResolvedValue(null);

      const result = await AssignmentService.createAssignment(
        {
          title: 'Project 1: Full-Stack App',
          instructions: 'Deliver backend and frontend according to PRD.',
          courseId,
          batchId,
          totalMarks: 100,
          dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        },
        teacherId,
        [UserRole.TEACHER],
      );

      expect(result).toBeDefined();
      expect(result.title).toBe('Project 1: Full-Stack App');
    });

    it('should reject assignment creation when batch does not belong to course', async () => {
      const otherCourseId = new mongoose.Types.ObjectId().toString();
      vi.mocked(Batch.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(batchId),
        courseId: new mongoose.Types.ObjectId(otherCourseId),
      } as any);

      await expect(
        AssignmentService.createAssignment(
          {
            title: 'Project 1',
            instructions: 'Do the task.',
            courseId,
            batchId,
            dueDate: new Date().toISOString(),
          },
          teacherId,
          [UserRole.TEACHER],
        ),
      ).rejects.toThrow('Specified batch does not belong to the provided course');
    });

    it('should reject assignment creation when teacher is not assigned to course or batch', async () => {
      const mockBatch = {
        _id: new mongoose.Types.ObjectId(batchId),
        courseId: new mongoose.Types.ObjectId(courseId),
        teacherIds: [],
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: new mongoose.Types.ObjectId(batchId),
            teacherIds: [],
          }),
        }),
      };
      vi.mocked(Batch.findById).mockImplementation(() => mockBatch as any);

      vi.mocked(Course.findById).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: new mongoose.Types.ObjectId(courseId),
            teacherIds: [],
          }),
        }),
      } as any);

      await expect(
        AssignmentService.createAssignment(
          {
            title: 'Project 1',
            instructions: 'Do the task.',
            courseId,
            batchId,
            dueDate: new Date().toISOString(),
          },
          teacherId,
          [UserRole.TEACHER],
        ),
      ).rejects.toThrow('You are not assigned to manage assignments');
    });


    it('should reject assignment when dueDate is before publishDate', async () => {
      vi.mocked(Batch.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(batchId),
        courseId: new mongoose.Types.ObjectId(courseId),
        teacherIds: [new mongoose.Types.ObjectId(teacherId)],
      } as any);

      vi.mocked(Course.findById).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: new mongoose.Types.ObjectId(courseId),
            teacherIds: [new mongoose.Types.ObjectId(teacherId)],
          }),
        }),
      } as any);

      await expect(
        AssignmentService.createAssignment(
          {
            title: 'Project 1',
            instructions: 'Do the task.',
            courseId,
            batchId,
            publishDate: new Date('2026-10-15T10:00:00Z').toISOString(),
            dueDate: new Date('2026-10-10T10:00:00Z').toISOString(),
          },
          teacherId,
          [UserRole.TEACHER],
        ),
      ).rejects.toThrow('Due date must be after or equal to publish date');
    });
  });

  describe('2. Access Control & Student IDOR Protection', () => {
    it('should filter assignments to only published ones for enrolled batches for students', async () => {
      vi.mocked(Enrollment.find).mockReturnValue({
        select: vi.fn().mockResolvedValue([
          { batchId: new mongoose.Types.ObjectId(batchId) },
        ]),
      } as any);

      const mockDocs = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Published Homework 1',
          slug: 'published-hw-1',
          description: null,
          instructions: 'Complete exercises 1-5',
          courseId: new mongoose.Types.ObjectId(courseId),
          batchId: new mongoose.Types.ObjectId(batchId),
          subjectId: null,
          moduleId: null,
          lessonId: null,
          teacherId: new mongoose.Types.ObjectId(teacherId),
          attachments: [],
          totalMarks: 50,
          passMarks: 25,
          publishDate: new Date(Date.now() - 3600000),
          dueDate: new Date(Date.now() + 86400000),
          closesAt: null,
          allowLateSubmission: true,
          latePenalty: 0,
          submissionType: SubmissionType.TEXT,
          maxAttempts: 1,
          resubmissionAllowed: false,
          status: AssignmentStatus.PUBLISHED,
          visibility: AssignmentVisibility.ENROLLMENT_ONLY,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(Assignment.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockDocs),
      } as any);

      const results = await AssignmentService.getAssignments(
        {},
        mockStudentUser,
        UserRole.STUDENT,
      );

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Published Homework 1');
      expect(Assignment.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $in: [AssignmentStatus.PUBLISHED, AssignmentStatus.CLOSED] },
        }),
      );
    });

    it('should reject student viewing assignment from a batch they are not enrolled in', async () => {
      const otherBatchId = new mongoose.Types.ObjectId().toString();

      vi.mocked(Assignment.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(assignmentId),
        batchId: new mongoose.Types.ObjectId(otherBatchId),
        status: AssignmentStatus.PUBLISHED,
      } as any);

      vi.mocked(Enrollment.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      await expect(
        AssignmentService.getAssignmentById(assignmentId, mockStudentUser, UserRole.STUDENT),
      ).rejects.toThrow('You are not enrolled in the cohort');
    });
  });

  describe('3. Submissions Engine & Rules', () => {
    it('should allow enrolled student to submit valid assignment on time', async () => {
      vi.mocked(Assignment.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(assignmentId),
        batchId: new mongoose.Types.ObjectId(batchId),
        status: AssignmentStatus.PUBLISHED,
        publishDate: new Date(Date.now() - 3600000),
        dueDate: new Date(Date.now() + 86400000),
        closesAt: null,
        allowLateSubmission: true,
        submissionType: SubmissionType.MIXED,
        maxAttempts: 2,
        resubmissionAllowed: true,
      } as any);

      vi.mocked(Enrollment.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId(), status: EnrollmentStatus.ACTIVE }),
      } as any);

      vi.mocked(AssignmentSubmission.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue([]),
      } as any);

      const submission = await AssignmentService.submitAssignment(
        assignmentId,
        {
          textContent: 'Here is my solution code repository.',
          attachments: [],
          url: 'https://github.com/student/my-project',
        },
        studentId,
      );

      expect(submission).toBeDefined();
      expect(submission.attemptNumber).toBe(1);
      expect(submission.isLate).toBe(false);
      expect(submission.status).toBe(SubmissionStatus.SUBMITTED);
    });

    it('should mark submission as late when submitted after due date if late submissions allowed', async () => {
      vi.mocked(Assignment.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(assignmentId),
        batchId: new mongoose.Types.ObjectId(batchId),
        status: AssignmentStatus.PUBLISHED,
        publishDate: new Date(Date.now() - 86400000 * 5),
        dueDate: new Date(Date.now() - 3600000), // Due 1 hour ago
        closesAt: new Date(Date.now() + 86400000), // Closes in 1 day
        allowLateSubmission: true,
        submissionType: SubmissionType.TEXT,
        maxAttempts: 1,
        resubmissionAllowed: false,
      } as any);

      vi.mocked(Enrollment.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId(), status: EnrollmentStatus.ACTIVE }),
      } as any);

      vi.mocked(AssignmentSubmission.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue([]),
      } as any);

      const submission = await AssignmentService.submitAssignment(
        assignmentId,
        { textContent: 'Late submission text answer.' },
        studentId,
      );

      expect(submission.isLate).toBe(true);
      expect(submission.status).toBe(SubmissionStatus.LATE);
    });

    it('should reject submission when past due date and allowLateSubmission is false', async () => {
      vi.mocked(Assignment.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(assignmentId),
        batchId: new mongoose.Types.ObjectId(batchId),
        status: AssignmentStatus.PUBLISHED,
        publishDate: new Date(Date.now() - 86400000 * 5),
        dueDate: new Date(Date.now() - 3600000), // Due 1 hour ago
        closesAt: null,
        allowLateSubmission: false,
        submissionType: SubmissionType.TEXT,
        maxAttempts: 1,
      } as any);

      vi.mocked(Enrollment.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId(), status: EnrollmentStatus.ACTIVE }),
      } as any);

      await expect(
        AssignmentService.submitAssignment(
          assignmentId,
          { textContent: 'Late submission.' },
          studentId,
        ),
      ).rejects.toThrow('Late submissions are not accepted');
    });

    it('should reject submission when attempt limit is reached', async () => {
      vi.mocked(Assignment.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(assignmentId),
        batchId: new mongoose.Types.ObjectId(batchId),
        status: AssignmentStatus.PUBLISHED,
        publishDate: new Date(Date.now() - 3600000),
        dueDate: new Date(Date.now() + 86400000),
        closesAt: null,
        allowLateSubmission: true,
        submissionType: SubmissionType.TEXT,
        maxAttempts: 1,
      } as any);

      vi.mocked(Enrollment.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId(), status: EnrollmentStatus.ACTIVE }),
      } as any);

      vi.mocked(AssignmentSubmission.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue([{ attemptNumber: 1 }]),
      } as any);

      await expect(
        AssignmentService.submitAssignment(
          assignmentId,
          { textContent: 'Second attempt should fail.' },
          studentId,
        ),
      ).rejects.toThrow('Maximum attempt limit (1) reached');
    });
  });

  describe('4. Teacher Review & Scoring', () => {
    it('should allow assigned teacher to review and score student submission', async () => {
      const submissionId = new mongoose.Types.ObjectId().toString();

      const mockSubDoc = {
        _id: new mongoose.Types.ObjectId(submissionId),
        assignmentId: new mongoose.Types.ObjectId(assignmentId),
        studentId: new mongoose.Types.ObjectId(studentId),
        attemptNumber: 1,
        submissionType: SubmissionType.TEXT,
        textContent: 'My Answer',
        attachments: [],
        url: null,
        submittedAt: new Date(),
        isLate: false,
        status: SubmissionStatus.SUBMITTED,
        score: null,
        feedback: null,
        privateNotes: null,
        feedbackAttachments: [],
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(AssignmentSubmission.findById).mockResolvedValue(mockSubDoc as any);
      vi.mocked(Assignment.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(assignmentId),
        courseId: new mongoose.Types.ObjectId(courseId),
        batchId: new mongoose.Types.ObjectId(batchId),
        totalMarks: 100,
      } as any);

      vi.mocked(Course.findById).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: new mongoose.Types.ObjectId(courseId),
            teacherIds: [new mongoose.Types.ObjectId(teacherId)],
          }),
        }),
      } as any);

      const reviewed = await AssignmentService.reviewSubmission(
        submissionId,
        {
          score: 95,
          feedback: 'Excellent work, well structured!',
          status: SubmissionStatus.GRADED,
        },
        teacherId,
        [UserRole.TEACHER],
      );

      expect(reviewed.score).toBe(95);
      expect(reviewed.feedback).toBe('Excellent work, well structured!');
      expect(reviewed.status).toBe(SubmissionStatus.GRADED);
      expect(reviewed.reviewedBy).toBe(teacherId);
    });

    it('should reject review with score exceeding assignment total marks', async () => {
      const submissionId = new mongoose.Types.ObjectId().toString();

      vi.mocked(AssignmentSubmission.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(submissionId),
        assignmentId: new mongoose.Types.ObjectId(assignmentId),
      } as any);

      vi.mocked(Assignment.findById).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(assignmentId),
        courseId: new mongoose.Types.ObjectId(courseId),
        batchId: new mongoose.Types.ObjectId(batchId),
        totalMarks: 50,
      } as any);

      vi.mocked(Course.findById).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: new mongoose.Types.ObjectId(courseId),
            teacherIds: [new mongoose.Types.ObjectId(teacherId)],
          }),
        }),
      } as any);

      await expect(
        AssignmentService.reviewSubmission(
          submissionId,
          {
            score: 75,
            status: SubmissionStatus.GRADED,
          },
          teacherId,
          [UserRole.TEACHER],
        ),
      ).rejects.toThrow('Score must be between 0 and total marks (50)');
    });
  });
});
