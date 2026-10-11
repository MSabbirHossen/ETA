import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { assessmentService } from './assessment.service.js';
import { QuestionModel, toISafeQuestion } from './question.model.js';
import { AssessmentModel } from './assessment.model.js';
import { AssessmentAttemptModel } from './attempt.model.js';
import { CourseModel } from '../academic/course.model.js';
import { BatchModel } from '../academic/batch.model.js';
import { EnrollmentModel } from '../academic/enrollment.model.js';
import { UserRole } from '@eta/types';

vi.mock('./question.model.js', async () => {
  const actual = await vi.importActual<any>('./question.model.js');
  const MockQuestion: any = vi.fn().mockImplementation((data: any) => ({
    ...data,
    _id: new Types.ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(undefined),
  }));
  MockQuestion.create = vi.fn().mockImplementation((data: any) => ({
    ...data,
    _id: new Types.ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(undefined),
  }));
  MockQuestion.findById = vi.fn();
  MockQuestion.find = vi.fn();

  return {
    ...actual,
    QuestionModel: MockQuestion,
  };
});

vi.mock('./assessment.model.js', async () => {
  const actual = await vi.importActual<any>('./assessment.model.js');
  const MockAssessment: any = vi.fn().mockImplementation((data: any) => ({
    ...data,
    _id: new Types.ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(undefined),
  }));
  MockAssessment.create = vi.fn().mockImplementation((data: any) => ({
    ...data,
    _id: new Types.ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(undefined),
  }));
  MockAssessment.findById = vi.fn();
  MockAssessment.find = vi.fn();

  return {
    ...actual,
    AssessmentModel: MockAssessment,
  };
});

vi.mock('./attempt.model.js', async () => {
  const actual = await vi.importActual<any>('./attempt.model.js');
  const MockAttempt: any = vi.fn().mockImplementation((data: any) => ({
    ...data,
    _id: new Types.ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(undefined),
  }));
  MockAttempt.create = vi.fn().mockImplementation((data: any) => ({
    ...data,
    _id: new Types.ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(undefined),
  }));
  MockAttempt.findById = vi.fn();
  MockAttempt.find = vi.fn();

  return {
    ...actual,
    AssessmentAttemptModel: MockAttempt,
  };
});

const { mockCourse, mockBatch, mockEnrollment } = vi.hoisted(() => ({
  mockCourse: {
    findById: vi.fn(),
    find: vi.fn(),
  },
  mockBatch: {
    findById: vi.fn(),
    find: vi.fn(),
  },
  mockEnrollment: {
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('../academic/course.model.js', () => ({
  Course: mockCourse,
  CourseModel: mockCourse,
}));

vi.mock('../academic/batch.model.js', () => ({
  Batch: mockBatch,
  BatchModel: mockBatch,
}));

vi.mock('../academic/enrollment.model.js', () => ({
  Enrollment: mockEnrollment,
  EnrollmentModel: mockEnrollment,
}));

describe('Phase 4B: Assessment & Question Bank Engine', () => {
  const teacherId = '507f1f77bcf86cd799439011';
  const otherTeacherId = '507f1f77bcf86cd799439099';
  const studentId = '507f1f77bcf86cd799439022';
  const courseId = '507f1f77bcf86cd799439033';
  const batchId = '507f1f77bcf86cd799439044';
  const questionId = '507f1f77bcf86cd799439055';
  const assessmentId = '507f1f77bcf86cd799439066';
  const attemptId = '507f1f77bcf86cd799439077';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // Question Bank Tests
  // ==========================================

  describe('Question Bank', () => {
    it('allows assigned teacher to create a question', async () => {
      vi.mocked(CourseModel.findById).mockResolvedValueOnce({
        _id: new Types.ObjectId(courseId),
        teacherIds: [new Types.ObjectId(teacherId)],
      } as any);

      const result = await assessmentService.createQuestion(
        teacherId,
        [UserRole.TEACHER],
        {
          prompt: 'What is TypeScript?',
          type: 'MCQ',
          marks: 2,
          difficulty: 'MEDIUM',
          courseId,
          options: [
            { id: 'opt-1', text: 'Superset of JS', isCorrect: true },
            { id: 'opt-2', text: 'Database engine', isCorrect: false },
          ],
        }
      );

      expect(result.prompt).toBe('What is TypeScript?');
      expect(result.marks).toBe(2);
      expect(QuestionModel.create).toHaveBeenCalled();
    });

    it('rejects unassigned teacher creating question', async () => {
      vi.mocked(CourseModel.findById).mockResolvedValueOnce({
        _id: new Types.ObjectId(courseId),
        teacherIds: [new Types.ObjectId(teacherId)],
      } as any);

      await expect(
        assessmentService.createQuestion(
          otherTeacherId,
          [UserRole.TEACHER],
          {
            prompt: 'Question without access',
            type: 'TRUE_FALSE',
            marks: 1,
            courseId,
            correctAnswer: true,
          }
        )
      ).rejects.toThrow('Forbidden: You are not assigned to teach this course or batch');
    });

    it('sanitizes questions for students, stripping all answer keys and explanations', () => {
      const internalQuestion = {
        id: 'q-1',
        prompt: 'What is 2 + 2?',
        type: 'MCQ' as const,
        marks: 5,
        options: [
          { id: 'a', text: '3', isCorrect: false, explanation: 'Incorrect' },
          { id: 'b', text: '4', isCorrect: true, explanation: 'Correct answer' },
        ],
        correctAnswer: 'b',
        explanation: 'Basic math',
        difficulty: 'EASY' as const,
        topic: 'Math',
      };

      const safeQuestion = toISafeQuestion(internalQuestion as any);

      expect(safeQuestion.prompt).toBe('What is 2 + 2?');
      expect(safeQuestion.marks).toBe(5);
      expect((safeQuestion as any).correctAnswer).toBeUndefined();
      expect((safeQuestion as any).explanation).toBeUndefined();
      expect(safeQuestion.options?.[0]).toEqual({ id: 'a', text: '3' });
      expect(safeQuestion.options?.[1]).toEqual({ id: 'b', text: '4' });
      expect((safeQuestion.options?.[1] as any).isCorrect).toBeUndefined();
    });
  });

  // ==========================================
  // Assessment Creation & Cohort Validation
  // ==========================================

  describe('Assessment Configuration', () => {
    it('creates an assessment draft for assigned teacher with batch validation', async () => {
      vi.mocked(CourseModel.findById).mockResolvedValue({
        _id: new Types.ObjectId(courseId),
        teacherIds: [new Types.ObjectId(teacherId)],
      } as any);
      vi.mocked(BatchModel.findById).mockResolvedValue({
        _id: new Types.ObjectId(batchId),
        courseId: new Types.ObjectId(courseId),
      } as any);
      vi.mocked(QuestionModel.find).mockResolvedValueOnce([
        { _id: new Types.ObjectId(questionId), marks: 5 } as any,
      ]);

      const assessment = await assessmentService.createAssessment(
        teacherId,
        [UserRole.TEACHER],
        {
          title: 'Midterm Quiz',
          assessmentType: 'QUIZ',
          courseId,
          batchId,
          questions: [{ questionId, marks: 5 }],
          passMark: 50,
          durationMinutes: 30,
          opensAt: new Date().toISOString(),
          dueAt: new Date(Date.now() + 86400000).toISOString(),
        }
      );

      expect(assessment.title).toBe('Midterm Quiz');
      expect(assessment.totalMarks).toBe(5);
      expect(AssessmentModel.create).toHaveBeenCalled();
    });

    it('rejects assessment creation if batch belongs to another course', async () => {
      vi.mocked(CourseModel.findById).mockResolvedValue({
        _id: new Types.ObjectId(courseId),
        teacherIds: [new Types.ObjectId(teacherId)],
      } as any);
      vi.mocked(BatchModel.findById).mockResolvedValue({
        _id: new Types.ObjectId(batchId),
        courseId: new Types.ObjectId('507f1f77bcf86cd799439999'),
      } as any);

      await expect(
        assessmentService.createAssessment(
          teacherId,
          [UserRole.TEACHER],
          {
            title: 'Mismatched Batch Quiz',
            assessmentType: 'QUIZ',
            courseId,
            batchId,
            questions: [{ questionId, marks: 5 }],
            passMark: 50,
            durationMinutes: 30,
            opensAt: new Date().toISOString(),
            dueAt: new Date(Date.now() + 86400000).toISOString(),
          }
        )
      ).rejects.toThrow('Batch does not belong to the supplied course');
    });

    it('allows publishing a configured assessment', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);
      vi.mocked(AssessmentModel.findById).mockResolvedValueOnce({
        _id: new Types.ObjectId(assessmentId),
        courseId: new Types.ObjectId(courseId),
        batchId: new Types.ObjectId(batchId),
        createdBy: new Types.ObjectId(teacherId),
        questions: [{ questionId: new Types.ObjectId(questionId), marks: 5 }],
        status: 'DRAFT',
        save: mockSave,
      } as any);
      vi.mocked(CourseModel.findById).mockResolvedValue({
        _id: new Types.ObjectId(courseId),
        teacherIds: [new Types.ObjectId(teacherId)],
      } as any);

      const published = await assessmentService.publishAssessment(
        teacherId,
        [UserRole.TEACHER],
        assessmentId
      );

      expect(published.status).toBe('PUBLISHED');
      expect(mockSave).toHaveBeenCalled();
    });
  });

  // ==========================================
  // Assessment Attempts & Server-Authoritative Timer
  // ==========================================

  describe('Assessment Attempts & Server Timing', () => {
    it('allows enrolled student to start an attempt with server-authoritative timer', async () => {
      const now = new Date();
      vi.mocked(AssessmentModel.findById).mockResolvedValueOnce({
        _id: new Types.ObjectId(assessmentId),
        title: 'JavaScript Exam',
        batchId: new Types.ObjectId(batchId),
        status: 'PUBLISHED',
        opensAt: new Date(now.getTime() - 10000),
        dueAt: new Date(now.getTime() + 86400000),
        durationMinutes: 45,
        attemptsAllowed: 2,
        totalMarks: 10,
        passMark: 60,
        questions: [{ questionId: new Types.ObjectId(questionId), marks: 10 }],
      } as any);

      vi.mocked(EnrollmentModel.findOne).mockResolvedValueOnce({
        studentId: new Types.ObjectId(studentId),
        batchId: new Types.ObjectId(batchId),
        status: 'ACTIVE',
      } as any);

      vi.mocked(AssessmentAttemptModel.find).mockReturnValueOnce({
        sort: vi.fn().mockResolvedValueOnce([]),
      } as any);

      vi.mocked(QuestionModel.find).mockResolvedValueOnce([
        {
          _id: new Types.ObjectId(questionId),
          prompt: 'Sample Question',
          type: 'MCQ',
          marks: 10,
          options: [{ id: 'opt-1', text: 'Choice 1', isCorrect: true }],
        } as any,
      ]);

      const attemptView = await assessmentService.startAttempt(studentId, assessmentId);

      expect(attemptView.attempt.attemptNumber).toBe(1);
      expect(attemptView.attempt.status).toBe('IN_PROGRESS');
      expect(attemptView.questions.length).toBe(1);
      expect(attemptView.questions[0].options?.[0]).toBeDefined();
      expect((attemptView.questions[0].options?.[0] as any).isCorrect).toBeUndefined();
      expect(AssessmentAttemptModel.create).toHaveBeenCalled();
    });

    it('rejects student not enrolled in cohort from starting attempt (IDOR Protection)', async () => {
      vi.mocked(AssessmentModel.findById).mockResolvedValueOnce({
        _id: new Types.ObjectId(assessmentId),
        batchId: new Types.ObjectId(batchId),
        status: 'PUBLISHED',
        opensAt: new Date(Date.now() - 10000),
      } as any);

      vi.mocked(EnrollmentModel.findOne).mockResolvedValueOnce(null);

      await expect(
        assessmentService.startAttempt(studentId, assessmentId)
      ).rejects.toThrow('Forbidden: You are not enrolled in this assessment cohort');
    });

    it('resumes active attempt on page refresh without resetting server timer', async () => {
      const startedAt = new Date(Date.now() - 60000);
      const expiresAt = new Date(Date.now() + 1800000);
      const existingActiveAttempt = {
        _id: new Types.ObjectId(attemptId),
        assessmentId: new Types.ObjectId(assessmentId),
        studentId: new Types.ObjectId(studentId),
        batchId: new Types.ObjectId(batchId),
        attemptNumber: 1,
        startedAt,
        expiresAt,
        status: 'IN_PROGRESS',
        gradingStatus: 'PENDING',
        answers: [],
        questionOrder: [questionId],
        totalMarks: 10,
      };

      vi.mocked(AssessmentModel.findById).mockResolvedValueOnce({
        _id: new Types.ObjectId(assessmentId),
        batchId: new Types.ObjectId(batchId),
        status: 'PUBLISHED',
        opensAt: new Date(Date.now() - 10000),
        durationMinutes: 30,
        attemptsAllowed: 1,
        totalMarks: 10,
        passMark: 50,
        questions: [{ questionId: new Types.ObjectId(questionId), marks: 10 }],
      } as any);

      vi.mocked(EnrollmentModel.findOne).mockResolvedValueOnce({
        studentId: new Types.ObjectId(studentId),
        batchId: new Types.ObjectId(batchId),
        status: 'ACTIVE',
      } as any);

      vi.mocked(AssessmentAttemptModel.find).mockReturnValueOnce({
        sort: vi.fn().mockResolvedValueOnce([existingActiveAttempt]),
      } as any);

      vi.mocked(QuestionModel.find).mockResolvedValueOnce([
        {
          _id: new Types.ObjectId(questionId),
          prompt: 'Question 1',
          type: 'MCQ',
          marks: 10,
        } as any,
      ]);

      const resumedView = await assessmentService.startAttempt(studentId, assessmentId);

      expect(resumedView.attempt.startedAt).toEqual(startedAt);
      expect(resumedView.attempt.expiresAt).toEqual(expiresAt);
      expect(AssessmentAttemptModel.create).not.toHaveBeenCalled();
    });

    it('enforces maximum attempts limit', async () => {
      vi.mocked(AssessmentModel.findById).mockResolvedValueOnce({
        _id: new Types.ObjectId(assessmentId),
        batchId: new Types.ObjectId(batchId),
        status: 'PUBLISHED',
        opensAt: new Date(Date.now() - 10000),
        attemptsAllowed: 1,
      } as any);

      vi.mocked(EnrollmentModel.findOne).mockResolvedValueOnce({
        studentId: new Types.ObjectId(studentId),
        batchId: new Types.ObjectId(batchId),
        status: 'ACTIVE',
      } as any);

      vi.mocked(AssessmentAttemptModel.find).mockReturnValueOnce({
        sort: vi.fn().mockResolvedValueOnce([
          {
            _id: new Types.ObjectId(),
            status: 'SUBMITTED',
            attemptNumber: 1,
          },
        ]),
      } as any);

      await expect(
        assessmentService.startAttempt(studentId, assessmentId)
      ).rejects.toThrow('Maximum attempts reached for this assessment');
    });
  });

  // ==========================================
  // Autosave & Auto-Submit on Timeout
  // ==========================================

  describe('Autosave & Auto-Submit', () => {
    it('autosaves answers on an in-progress attempt within valid time', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);
      vi.mocked(AssessmentAttemptModel.findById).mockResolvedValueOnce({
        _id: new Types.ObjectId(attemptId),
        studentId: new Types.ObjectId(studentId),
        status: 'IN_PROGRESS',
        expiresAt: new Date(Date.now() + 300000),
        questionOrder: [questionId],
        answers: [],
        save: mockSave,
      } as any);

      const result = await assessmentService.saveAnswers(studentId, attemptId, {
        answers: [{ questionId, selectedOptionId: 'opt-1' }],
      });

      expect(result.savedCount).toBe(1);
      expect(mockSave).toHaveBeenCalled();
    });

    it('rejects answer save and auto-submits when attempt expires', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);
      const expiredAttempt = {
        _id: new Types.ObjectId(attemptId),
        assessmentId: new Types.ObjectId(assessmentId),
        studentId: new Types.ObjectId(studentId),
        status: 'IN_PROGRESS',
        startedAt: new Date(Date.now() - 3600000),
        expiresAt: new Date(Date.now() - 10000),
        questionOrder: [questionId],
        answers: [],
        totalMarks: 10,
        save: mockSave,
      };

      vi.mocked(AssessmentAttemptModel.findById).mockResolvedValueOnce(expiredAttempt as any);
      vi.mocked(AssessmentModel.findById).mockResolvedValueOnce({
        _id: new Types.ObjectId(assessmentId),
        passMark: 50,
      } as any);
      vi.mocked(QuestionModel.find).mockResolvedValueOnce([]);

      await expect(
        assessmentService.saveAnswers(studentId, attemptId, {
          answers: [{ questionId, selectedOptionId: 'opt-1' }],
        })
      ).rejects.toThrow('Time has expired. Attempt was automatically submitted.');

      expect(expiredAttempt.status).toBe('AUTO_SUBMITTED');
      expect(mockSave).toHaveBeenCalled();
    });

    it('prevents saving answers to another student\'s attempt (IDOR)', async () => {
      vi.mocked(AssessmentAttemptModel.findById).mockResolvedValueOnce({
        _id: new Types.ObjectId(attemptId),
        studentId: new Types.ObjectId('507f1f77bcf86cd799439999'),
        status: 'IN_PROGRESS',
        expiresAt: new Date(Date.now() + 300000),
      } as any);

      await expect(
        assessmentService.saveAnswers(studentId, attemptId, {
          answers: [{ questionId, selectedOptionId: 'opt-1' }],
        })
      ).rejects.toThrow('Forbidden: Cannot modify another student\'s attempt');
    });
  });

  // ==========================================
  // Objective Auto-Grading & Manual Review
  // ==========================================

  describe('Scoring & Grading', () => {
    it('accurately auto-grades objective MCQ questions server-side upon submit', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);
      const activeAttempt = {
        _id: new Types.ObjectId(attemptId),
        assessmentId: new Types.ObjectId(assessmentId),
        studentId: new Types.ObjectId(studentId),
        batchId: new Types.ObjectId(batchId),
        attemptNumber: 1,
        startedAt: new Date(Date.now() - 60000),
        expiresAt: new Date(Date.now() + 600000),
        status: 'IN_PROGRESS',
        questionOrder: [questionId],
        answers: [
          {
            questionId: new Types.ObjectId(questionId),
            selectedOptionId: 'correct-opt',
          },
        ],
        totalMarks: 10,
        save: mockSave,
      };

      vi.mocked(AssessmentAttemptModel.findById).mockResolvedValueOnce(activeAttempt as any);
      vi.mocked(AssessmentModel.findById).mockResolvedValueOnce({
        _id: new Types.ObjectId(assessmentId),
        passMark: 50,
      } as any);

      vi.mocked(QuestionModel.find).mockResolvedValueOnce([
        {
          _id: new Types.ObjectId(questionId),
          type: 'MCQ',
          marks: 10,
          options: [
            { id: 'correct-opt', isCorrect: true },
            { id: 'wrong-opt', isCorrect: false },
          ],
        } as any,
      ]);

      const submitted = await assessmentService.submitAttempt(studentId, attemptId);

      expect(submitted.status).toBe('GRADED');
      expect(submitted.gradingStatus).toBe('AUTO_GRADED');
      expect(submitted.obtainedMarks).toBe(10);
      expect(submitted.percentage).toBe(100);
      expect(submitted.isPassed).toBe(true);
      expect(mockSave).toHaveBeenCalled();
    });

    it('sets status to UNDER_REVIEW when subjective short-answer questions are included', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);
      const activeAttempt = {
        _id: new Types.ObjectId(attemptId),
        assessmentId: new Types.ObjectId(assessmentId),
        studentId: new Types.ObjectId(studentId),
        batchId: new Types.ObjectId(batchId),
        attemptNumber: 1,
        startedAt: new Date(Date.now() - 60000),
        expiresAt: new Date(Date.now() + 600000),
        status: 'IN_PROGRESS',
        questionOrder: [questionId],
        answers: [
          {
            questionId: new Types.ObjectId(questionId),
            textAnswer: 'This is my subjective essay answer',
          },
        ],
        totalMarks: 10,
        save: mockSave,
      };

      vi.mocked(AssessmentAttemptModel.findById).mockResolvedValueOnce(activeAttempt as any);
      vi.mocked(AssessmentModel.findById).mockResolvedValueOnce({
        _id: new Types.ObjectId(assessmentId),
        passMark: 50,
      } as any);

      vi.mocked(QuestionModel.find).mockResolvedValueOnce([
        {
          _id: new Types.ObjectId(questionId),
          type: 'SHORT_ANSWER',
          marks: 10,
        } as any,
      ]);

      const submitted = await assessmentService.submitAttempt(studentId, attemptId);

      expect(submitted.status).toBe('UNDER_REVIEW');
      expect(submitted.gradingStatus).toBe('PENDING');
      expect(mockSave).toHaveBeenCalled();
    });

    it('allows teacher to review, score, and provide feedback on subjective answers', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);
      const attemptUnderReview = {
        _id: new Types.ObjectId(attemptId),
        assessmentId: new Types.ObjectId(assessmentId),
        studentId: new Types.ObjectId(studentId),
        batchId: new Types.ObjectId(batchId),
        attemptNumber: 1,
        startedAt: new Date(),
        expiresAt: new Date(),
        status: 'UNDER_REVIEW',
        gradingStatus: 'PENDING',
        questionOrder: [questionId],
        answers: [
          {
            questionId: new Types.ObjectId(questionId),
            textAnswer: 'Subjective response',
          },
        ],
        totalMarks: 10,
        save: mockSave,
      };

      vi.mocked(AssessmentAttemptModel.findById).mockResolvedValueOnce(attemptUnderReview as any);
      vi.mocked(AssessmentModel.findById).mockResolvedValueOnce({
        _id: new Types.ObjectId(assessmentId),
        courseId: new Types.ObjectId(courseId),
        batchId: new Types.ObjectId(batchId),
        passMark: 50,
      } as any);
      vi.mocked(CourseModel.findById).mockResolvedValue({
        _id: new Types.ObjectId(courseId),
        teacherIds: [new Types.ObjectId(teacherId)],
      } as any);

      const reviewed = await assessmentService.reviewAttempt(
        teacherId,
        [UserRole.TEACHER],
        attemptId,
        {
          reviews: [{ questionId, obtainedMarks: 8, feedback: 'Well structured response' }],
          overallFeedback: 'Great job!',
        }
      );

      expect(reviewed.status).toBe('GRADED');
      expect(reviewed.gradingStatus).toBe('MANUALLY_GRADED');
      expect(reviewed.obtainedMarks).toBe(8);
      expect(reviewed.percentage).toBe(80);
      expect(reviewed.isPassed).toBe(true);
      expect(reviewed.feedback).toBe('Great job!');
      expect(mockSave).toHaveBeenCalled();
    });
  });
});
