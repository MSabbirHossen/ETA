import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { GradeCalculationEngine } from './grade-calculation.engine.js';
import { GradebookService, DEFAULT_GRADEBOOK_CATEGORIES } from './gradebook.service.js';
import { GradebookConfig, DEFAULT_GRADE_SCALE } from './gradebook-config.model.js';
import { GradeResult } from './grade-result.model.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { User } from '../users/user.model.js';
import { GuardianLink } from '../users/guardian-link.model.js';
import { Assignment } from '../assignment/assignment.model.js';
import { Submission } from '../assignment/submission.model.js';
import { Assessment } from '../assessment/assessment.model.js';
import { AssessmentAttempt } from '../assessment/attempt.model.js';
import { AttendanceSession, AttendanceRecord } from '../attendance/attendance.model.js';
import {
  GradeSourceType,
  GradePublicationStatus,
  MissingWorkPolicy,
  AttemptSelectionPolicy,
  UserRole,
  EnrollmentStatus,
  SubmissionStatus,
  GradingStatus,
  AttendanceStatus,
  AttendanceSessionStatus,
  AssessmentType,
  type IGradeCategoryConfig,
  type IGradeItemScore,
} from '@eta/types';
import { ForbiddenError, BadRequestError, NotFoundError } from '../../common/errors.js';

// ============================================================================
// Mocks
// ============================================================================
vi.mock('./gradebook-config.model.js', async () => {
  const actual = await vi.importActual<any>('./gradebook-config.model.js');
  const MockConfig: any = vi.fn();
  MockConfig.findOne = vi.fn();
  MockConfig.findOneAndUpdate = vi.fn();
  MockConfig.create = vi.fn();
  return {
    ...actual,
    GradebookConfig: MockConfig,
  };
});

vi.mock('./grade-result.model.js', () => {
  const MockResult: any = vi.fn();
  MockResult.find = vi.fn();
  MockResult.findOne = vi.fn();
  MockResult.findOneAndUpdate = vi.fn();
  MockResult.updateMany = vi.fn();
  return { GradeResult: MockResult };
});

vi.mock('../academic/course.model.js', () => {
  const MockCourse: any = {
    findById: vi.fn(),
  };
  return { Course: MockCourse };
});

vi.mock('../academic/batch.model.js', () => {
  const MockBatch: any = {
    findById: vi.fn(),
  };
  return { Batch: MockBatch };
});

vi.mock('../academic/enrollment.model.js', () => {
  const MockEnrollment: any = {
    find: vi.fn(),
  };
  return { Enrollment: MockEnrollment };
});

vi.mock('../users/user.model.js', () => {
  const MockUser: any = {
    find: vi.fn(),
    findById: vi.fn(),
  };
  return { User: MockUser };
});

vi.mock('../users/guardian-link.model.js', () => {
  const MockGuardianLink: any = {
    findOne: vi.fn(),
  };
  return { GuardianLink: MockGuardianLink };
});

vi.mock('../assignment/assignment.model.js', () => {
  const MockAssignment: any = {
    find: vi.fn(),
  };
  return { Assignment: MockAssignment };
});

vi.mock('../assignment/submission.model.js', () => {
  const MockSubmission: any = {
    find: vi.fn(),
  };
  return { Submission: MockSubmission, AssignmentSubmission: MockSubmission };
});

vi.mock('../assessment/assessment.model.js', () => {
  const MockAssessment: any = {
    find: vi.fn(),
  };
  return { Assessment: MockAssessment, AssessmentModel: MockAssessment };
});

vi.mock('../assessment/attempt.model.js', () => {
  const MockAttempt: any = {
    find: vi.fn(),
  };
  return { AssessmentAttempt: MockAttempt, AssessmentAttemptModel: MockAttempt };
});

vi.mock('../attendance/attendance.model.js', () => {
  const MockSession: any = {
    find: vi.fn(),
  };
  const MockRecord: any = {
    find: vi.fn(),
  };
  return { AttendanceSession: MockSession, AttendanceRecord: MockRecord };
});

describe('Phase 4D — Grading & Gradebook Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // 1. Pure Grade Calculation Engine Tests
  // ==========================================================================
  describe('GradeCalculationEngine (Domain Unit Tests)', () => {
    const testCategories: IGradeCategoryConfig[] = [
      {
        id: 'cat_assignments',
        name: 'Assignments',
        sourceType: GradeSourceType.ASSIGNMENT,
        weight: 40,
        dropLowestCount: 0,
        missingWorkPolicy: MissingWorkPolicy.ZERO,
      },
      {
        id: 'cat_quizzes',
        name: 'Quizzes',
        sourceType: GradeSourceType.QUIZ,
        weight: 20,
        dropLowestCount: 0,
        missingWorkPolicy: MissingWorkPolicy.ZERO,
      },
      {
        id: 'cat_exams',
        name: 'Final Exam',
        sourceType: GradeSourceType.EXAM,
        weight: 40,
        dropLowestCount: 0,
        missingWorkPolicy: MissingWorkPolicy.ZERO,
      },
    ];

    it('correctly calculates weighted contributions and final percentage', () => {
      const categoryItemsMap = new Map<string, IGradeItemScore[]>([
        [
          'cat_assignments',
          [
            {
              sourceType: GradeSourceType.ASSIGNMENT,
              sourceId: 'a1',
              sourceTitle: 'Assignment 1',
              maxMarks: 100,
              obtainedMarks: 90,
              normalizedPercentage: 90,
            },
            {
              sourceType: GradeSourceType.ASSIGNMENT,
              sourceId: 'a2',
              sourceTitle: 'Assignment 2',
              maxMarks: 100,
              obtainedMarks: 80,
              normalizedPercentage: 80,
            },
          ],
        ],
        [
          'cat_quizzes',
          [
            {
              sourceType: GradeSourceType.QUIZ,
              sourceId: 'q1',
              sourceTitle: 'Quiz 1',
              maxMarks: 50,
              obtainedMarks: 45,
              normalizedPercentage: 90,
            },
          ],
        ],
        [
          'cat_exams',
          [
            {
              sourceType: GradeSourceType.EXAM,
              sourceId: 'e1',
              sourceTitle: 'Final Exam',
              maxMarks: 100,
              obtainedMarks: 75,
              normalizedPercentage: 75,
            },
          ],
        ],
      ]);

      const result = GradeCalculationEngine.calculate({
        categories: testCategories,
        categoryItemsMap,
        passingPercentage: 60,
      });

      // Assignments: (170/200)*100 = 85% * 40% weight = 34.00 contribution
      // Quizzes: (45/50)*100 = 90% * 20% weight = 18.00 contribution
      // Exams: (75/100)*100 = 75% * 40% weight = 30.00 contribution
      // Total = 34 + 18 + 30 = 82.00
      expect(result.calculatedPercentage).toBe(82);
      expect(result.finalPercentage).toBe(82);
      expect(result.letterGrade).toBe('B+');
      expect(result.gpa).toBe(3.5);
      expect(result.isPassed).toBe(true);
    });

    it('drops the lowest score when dropLowestCount > 0', () => {
      const dropCategory: IGradeCategoryConfig[] = [
        {
          id: 'cat_assignments',
          name: 'Assignments',
          sourceType: GradeSourceType.ASSIGNMENT,
          weight: 100,
          dropLowestCount: 1,
          missingWorkPolicy: MissingWorkPolicy.ZERO,
        },
      ];

      const categoryItemsMap = new Map<string, IGradeItemScore[]>([
        [
          'cat_assignments',
          [
            {
              sourceType: GradeSourceType.ASSIGNMENT,
              sourceId: 'a1',
              sourceTitle: 'A1',
              maxMarks: 100,
              obtainedMarks: 50, // Lowest -> will be dropped
              normalizedPercentage: 50,
            },
            {
              sourceType: GradeSourceType.ASSIGNMENT,
              sourceId: 'a2',
              sourceTitle: 'A2',
              maxMarks: 100,
              obtainedMarks: 90,
              normalizedPercentage: 90,
            },
            {
              sourceType: GradeSourceType.ASSIGNMENT,
              sourceId: 'a3',
              sourceTitle: 'A3',
              maxMarks: 100,
              obtainedMarks: 100,
              normalizedPercentage: 100,
            },
          ],
        ],
      ]);

      const result = GradeCalculationEngine.calculate({
        categories: dropCategory,
        categoryItemsMap,
        passingPercentage: 60,
      });

      // Dropped a1 (50). Remaining: (90 + 100) / 200 = 95%
      expect(result.calculatedPercentage).toBe(95);
      expect(result.letterGrade).toBe('A+');
      expect(result.categoryContributions[0].itemScores.find((i) => i.sourceId === 'a1')?.isDropped).toBe(true);
    });

    it('handles missing work correctly per MissingWorkPolicy.ZERO vs EXCLUDE', () => {
      const catZero: IGradeCategoryConfig[] = [
        {
          id: 'cat_1',
          name: 'Cat 1',
          sourceType: GradeSourceType.ASSIGNMENT,
          weight: 100,
          missingWorkPolicy: MissingWorkPolicy.ZERO,
        },
      ];

      const itemsZero = new Map<string, IGradeItemScore[]>([
        [
          'cat_1',
          [
            {
              sourceType: GradeSourceType.ASSIGNMENT,
              sourceId: 'a1',
              sourceTitle: 'A1',
              maxMarks: 100,
              obtainedMarks: 100,
              normalizedPercentage: 100,
            },
            {
              sourceType: GradeSourceType.ASSIGNMENT,
              sourceId: 'a2',
              sourceTitle: 'A2 (Missing)',
              maxMarks: 100,
              obtainedMarks: 0,
              normalizedPercentage: 0,
              isMissing: true,
            },
          ],
        ],
      ]);

      // With ZERO policy: 100 / 200 = 50%
      const resZero = GradeCalculationEngine.calculate({
        categories: catZero,
        categoryItemsMap: itemsZero,
        passingPercentage: 60,
      });
      expect(resZero.calculatedPercentage).toBe(50);
      expect(resZero.isPassed).toBe(false);

      // With EXCLUDE policy: 100 / 100 = 100%
      const catExclude: IGradeCategoryConfig[] = [
        { ...catZero[0], missingWorkPolicy: MissingWorkPolicy.EXCLUDE },
      ];
      const resExclude = GradeCalculationEngine.calculate({
        categories: catExclude,
        categoryItemsMap: itemsZero,
        passingPercentage: 60,
      });
      expect(resExclude.calculatedPercentage).toBe(100);
      expect(resExclude.isPassed).toBe(true);
    });

    it('respects teacher override while preserving original calculated values', () => {
      const categoryItemsMap = new Map<string, IGradeItemScore[]>([
        [
          'cat_exams',
          [
            {
              sourceType: GradeSourceType.EXAM,
              sourceId: 'e1',
              sourceTitle: 'Final',
              maxMarks: 100,
              obtainedMarks: 50,
              normalizedPercentage: 50,
            },
          ],
        ],
      ]);

      const singleCat: IGradeCategoryConfig[] = [
        {
          id: 'cat_exams',
          name: 'Final',
          sourceType: GradeSourceType.EXAM,
          weight: 100,
        },
      ];

      const result = GradeCalculationEngine.calculate({
        categories: singleCat,
        categoryItemsMap,
        passingPercentage: 60,
        override: {
          isOverridden: true,
          originalContribution: 50,
          overrideContribution: 75,
          overrideLetterGrade: 'B',
          overrideGpa: 3.0,
          reason: 'Medical excuse credit applied',
          overriddenBy: 'teacher_1',
          overriddenAt: new Date(),
        },
      });

      expect(result.calculatedPercentage).toBe(50);
      expect(result.finalPercentage).toBe(75);
      expect(result.letterGrade).toBe('B');
      expect(result.gpa).toBe(3.0);
      expect(result.isPassed).toBe(true);
    });
  });

  // ==========================================================================
  // 2. Gradebook Service & Security Tests
  // ==========================================================================
  describe('GradebookService (Authorization & Workflows)', () => {
    const teacherId = new Types.ObjectId().toString();
    const unrelatedTeacherId = new Types.ObjectId().toString();
    const studentId = new Types.ObjectId().toString();
    const guardianId = new Types.ObjectId().toString();
    const courseId = new Types.ObjectId().toString();
    const batchId = new Types.ObjectId().toString();

    it('allows assigned teacher and rejects unassigned teacher', async () => {
      (Course.findById as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: courseId, teacherIds: [new Types.ObjectId(teacherId)] }),
        }),
      });
      (Batch.findById as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: batchId, teacherIds: [] }),
        }),
      });

      // Assigned teacher passes
      await expect(
        GradebookService.verifyTeacherOrAdmin(teacherId, [UserRole.TEACHER], courseId, batchId)
      ).resolves.not.toThrow();

      // Unassigned teacher is rejected with ForbiddenError
      await expect(
        GradebookService.verifyTeacherOrAdmin(unrelatedTeacherId, [UserRole.TEACHER], courseId, batchId)
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects gradebook configuration if weights do not sum to 100%', async () => {
      (Course.findById as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: courseId, teacherIds: [new Types.ObjectId(teacherId)] }),
        }),
      });

      const invalidDto = {
        categories: [
          {
            id: 'c1',
            name: 'Assignments',
            sourceType: GradeSourceType.ASSIGNMENT,
            weight: 70, // Total = 70 != 100
          },
        ],
      };

      await expect(
        GradebookService.saveGradebookConfig(
          teacherId,
          [UserRole.TEACHER],
          courseId,
          batchId,
          invalidDto as any
        )
      ).rejects.toThrow(BadRequestError);
    });

    it('protects against Student IDOR: students can view only their own published grades', async () => {
      // 1. Student viewing self passes authorization
      await expect(
        GradebookService.verifyStudentOrGuardian(studentId, [UserRole.STUDENT], studentId)
      ).resolves.not.toThrow();

      // 2. Student attempting to view another student is rejected
      const otherStudentId = new Types.ObjectId().toString();
      await expect(
        GradebookService.verifyStudentOrGuardian(studentId, [UserRole.STUDENT], otherStudentId)
      ).rejects.toThrow(ForbiddenError);
    });

    it('hides unpublished draft grades from students', async () => {
      (GradeResult.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null), // query filters by publicationStatus PUBLISHED
      });

      const res = await GradebookService.getStudentCourseGrade(
        studentId,
        [UserRole.STUDENT],
        courseId,
        batchId,
        studentId
      );

      expect(res).toBeNull();
    });

    it('verifies Guardian linkage using GuardianLink model', async () => {
      (GuardianLink.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          guardianId,
          studentId,
          status: 'ACTIVE',
        }),
      });

      // Linked guardian passes
      await expect(
        GradebookService.verifyStudentOrGuardian(guardianId, [UserRole.GUARDIAN], studentId)
      ).resolves.not.toThrow();

      // Unlinked guardian is rejected
      (GuardianLink.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      await expect(
        GradebookService.verifyStudentOrGuardian(guardianId, [UserRole.GUARDIAN], studentId)
      ).rejects.toThrow(ForbiddenError);
    });

    it('tracks audit history on post-publication grade correction', async () => {
      const mockResultDoc: any = {
        courseId,
        batchId,
        studentId,
        finalPercentage: 70,
        letterGrade: 'C+',
        gpa: 2.5,
        isPassed: true,
        publicationStatus: GradePublicationStatus.PUBLISHED,
        correctionHistory: [],
        save: vi.fn().mockResolvedValue(undefined),
        toObject: function () {
          return this;
        },
      };

      (GradeResult.findOne as any).mockResolvedValue(mockResultDoc);
      (GradebookConfig.findOne as any).mockResolvedValue({
        passingPercentage: 60,
        gradeScale: DEFAULT_GRADE_SCALE,
      });
      (Course.findById as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: courseId, teacherIds: [new Types.ObjectId(teacherId)] }),
        }),
      });

      const corrected = await GradebookService.correctStudentGrade(
        teacherId,
        [UserRole.TEACHER],
        courseId,
        batchId,
        studentId,
        {
          newContribution: 85,
          reason: 'Clerical error in paper mark transcription',
        }
      );

      expect(corrected.finalPercentage).toBe(85);
      expect(corrected.letterGrade).toBe('A');
      expect(corrected.publicationStatus).toBe(GradePublicationStatus.CORRECTED);
      expect(mockResultDoc.correctionHistory.length).toBe(1);
      expect(mockResultDoc.correctionHistory[0]).toMatchObject({
        previousPercentage: 70,
        newPercentage: 85,
        reason: 'Clerical error in paper mark transcription',
      });
    });
  });
});
