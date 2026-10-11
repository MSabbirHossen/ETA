import mongoose from 'mongoose';
import {
  GradebookConfig,
  type GradebookConfigDocument,
  DEFAULT_GRADE_SCALE,
} from './gradebook-config.model.js';
import { GradeResult, type GradeResultDocument } from './grade-result.model.js';
import { GradeCalculationEngine } from './grade-calculation.engine.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { User } from '../users/user.model.js';
import { GuardianLink } from '../users/guardian-link.model.js';
import { Assignment } from '../assignment/assignment.model.js';
import { AssignmentSubmission } from '../assignment/submission.model.js';
import { AssessmentModel } from '../assessment/assessment.model.js';
import { AssessmentAttemptModel } from '../assessment/attempt.model.js';
import { AttendanceSession, AttendanceRecord } from '../attendance/attendance.model.js';
import { NotificationDispatcher } from '../communication/notification-dispatcher.js';
import {
  UserRole,
  EnrollmentStatus,
  GradeSourceType,
  GradePublicationStatus,
  MissingWorkPolicy,
  AttemptSelectionPolicy,
  SubmissionStatus,
  AttendanceStatus,
  AttendanceSessionStatus,
  type IGradeCategoryConfig,
  type IGradeItemScore,
  type IStudentGradeResult,
  type IGradebookOverviewResponse,
  type SaveGradebookConfigDto,
  type SubmitForReviewDto,
  type ApproveResultsDto,
  type PublishResultsDto,
  type OverrideGradeDto,
  type CorrectGradeDto,
} from '@eta/types';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../common/errors.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction, AuditCategory, AuditSeverity, AuditResult, AuditActorType } from '@eta/types';

export const DEFAULT_GRADEBOOK_CATEGORIES: IGradeCategoryConfig[] = [
  {
    id: 'cat_assignments',
    name: 'Assignments',
    sourceType: GradeSourceType.ASSIGNMENT,
    weight: 40,
    dropLowestCount: 0,
    missingWorkPolicy: MissingWorkPolicy.ZERO,
    attemptPolicy: AttemptSelectionPolicy.HIGHEST,
  },
  {
    id: 'cat_quizzes',
    name: 'Quizzes',
    sourceType: GradeSourceType.QUIZ,
    weight: 20,
    dropLowestCount: 0,
    missingWorkPolicy: MissingWorkPolicy.ZERO,
    attemptPolicy: AttemptSelectionPolicy.HIGHEST,
  },
  {
    id: 'cat_exams',
    name: 'Examinations',
    sourceType: GradeSourceType.EXAM,
    weight: 30,
    dropLowestCount: 0,
    missingWorkPolicy: MissingWorkPolicy.ZERO,
    attemptPolicy: AttemptSelectionPolicy.HIGHEST,
  },
  {
    id: 'cat_attendance',
    name: 'Attendance',
    sourceType: GradeSourceType.ATTENDANCE,
    weight: 10,
    dropLowestCount: 0,
    missingWorkPolicy: MissingWorkPolicy.ZERO,
    attemptPolicy: AttemptSelectionPolicy.HIGHEST,
  },
];

export class GradebookService {
  // ==========================================================================
  // Authorization Helpers
  // ==========================================================================

  public static async verifyTeacherOrAdmin(
    actorId: string,
    actorRoles: UserRole[],
    courseId: string,
    batchId?: string
  ): Promise<void> {
    if (
      actorRoles.includes(UserRole.ADMIN) ||
      actorRoles.includes(UserRole.SUPER_ADMIN) ||
      actorRoles.includes(UserRole.STAFF)
    ) {
      return;
    }

    if (!actorRoles.includes(UserRole.TEACHER)) {
      throw new ForbiddenError('Only assigned teachers or administrators can manage the gradebook.');
    }

    if (batchId) {
      const batch = await Batch.findById(batchId).select('teacherIds').lean();
      if (batch?.teacherIds?.some((id) => id.toString() === actorId)) {
        return;
      }
    }

    const course = await Course.findById(courseId).select('teacherIds').lean();
    if (course?.teacherIds?.some((id) => id.toString() === actorId)) {
      return;
    }

    throw new ForbiddenError('You are not assigned as a teacher for this course or batch.');
  }

  public static async verifyStudentOrGuardian(
    actorId: string,
    actorRoles: UserRole[],
    targetStudentId: string
  ): Promise<void> {
    if (
      actorRoles.includes(UserRole.ADMIN) ||
      actorRoles.includes(UserRole.SUPER_ADMIN) ||
      actorRoles.includes(UserRole.STAFF)
    ) {
      return;
    }

    if (actorRoles.includes(UserRole.STUDENT) && actorId === targetStudentId) {
      return;
    }

    if (actorRoles.includes(UserRole.GUARDIAN)) {
      const link = await GuardianLink.findOne({
        guardianId: actorId,
        studentId: targetStudentId,
        status: 'ACTIVE',
      }).lean();
      if (link) {
        return;
      }
    }

    throw new ForbiddenError('You are not authorized to view academic grades for this student.');
  }

  // ==========================================================================
  // Configuration Management
  // ==========================================================================

  public static async getOrCreateConfig(
    courseId: string,
    batchId: string,
    actorId?: string
  ): Promise<GradebookConfigDocument> {
    let config = await GradebookConfig.findOne({ courseId, batchId });
    if (!config) {
      config = await GradebookConfig.create({
        courseId,
        batchId,
        categories: DEFAULT_GRADEBOOK_CATEGORIES,
        passingPercentage: 60,
        gradeScale: DEFAULT_GRADE_SCALE,
        attendanceFullScorePercentage: 100,
        isConfigured: false,
        configuredBy: actorId,
      });
    }
    return config;
  }

  public static async getGradebookConfig(
    actorId: string,
    actorRoles: UserRole[],
    courseId: string,
    batchId: string
  ): Promise<GradebookConfigDocument> {
    await this.verifyTeacherOrAdmin(actorId, actorRoles, courseId, batchId);
    return this.getOrCreateConfig(courseId, batchId, actorId);
  }

  public static async saveGradebookConfig(
    actorId: string,
    actorRoles: UserRole[],
    courseId: string,
    batchId: string,
    dto: SaveGradebookConfigDto
  ): Promise<GradebookConfigDocument> {
    await this.verifyTeacherOrAdmin(actorId, actorRoles, courseId, batchId);

    // Enforce category weights sum to 100%
    const totalWeight = dto.categories.reduce((acc, cat) => acc + cat.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new BadRequestError('Sum of category weights must equal exactly 100%');
    }

    const config = await GradebookConfig.findOneAndUpdate(
      { courseId, batchId },
      {
        categories: dto.categories,
        passingPercentage: dto.passingPercentage ?? 60,
        gradeScale: dto.gradeScale ?? DEFAULT_GRADE_SCALE,
        attendanceFullScorePercentage: dto.attendanceFullScorePercentage ?? 100,
        isConfigured: true,
        configuredBy: actorId,
      },
      { new: true, upsert: true }
    );

    return config;
  }

  // ==========================================================================
  // Calculation & Batch Synchronization
  // ==========================================================================

  public static async calculateBatchGrades(
    actorId: string,
    actorRoles: UserRole[],
    courseId: string,
    batchId: string
  ): Promise<IStudentGradeResult[]> {
    await this.verifyTeacherOrAdmin(actorId, actorRoles, courseId, batchId);

    const config = await this.getOrCreateConfig(courseId, batchId, actorId);

    // 1. Fetch active enrollments
    const enrollments = await Enrollment.find({
      courseId,
      batchId,
      status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
    }).lean();

    if (enrollments.length === 0) {
      return [];
    }

    const studentIds = enrollments.map((enr) => enr.studentId.toString());
    const users = await User.find({ _id: { $in: studentIds } }).select('name email').lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    // 2. Fetch authoritative sources in bulk
    const assignments = await Assignment.find({
      courseId,
      batchId,
      status: { $ne: 'DRAFT' },
    }).lean();
    const assignmentIds = assignments.map((a: any) => a._id);

    const submissions: any[] = await AssignmentSubmission.find({
      assignmentId: { $in: assignmentIds },
      studentId: { $in: studentIds },
    }).lean();

    const assessments: any[] = await AssessmentModel.find({
      courseId,
      batchId,
      status: { $ne: 'DRAFT' },
    }).lean();
    const assessmentIds = assessments.map((a: any) => a._id);

    const attempts: any[] = await AssessmentAttemptModel.find({
      assessmentId: { $in: assessmentIds },
      studentId: { $in: studentIds },
      status: { $in: ['SUBMITTED', 'EXPIRED'] },
    }).lean();

    const finalizedSessions = await AttendanceSession.find({
      batchId,
      status: AttendanceSessionStatus.FINALIZED,
    }).lean();
    const sessionClassIds = finalizedSessions.map((s) => s.classSessionId);

    const attendanceRecords = await AttendanceRecord.find({
      classSessionId: { $in: sessionClassIds },
      studentId: { $in: studentIds },
    }).lean();

    // 3. Existing grade results to preserve overrides and feedback
    const existingResults = await GradeResult.find({
      courseId,
      batchId,
      studentId: { $in: studentIds },
    }).lean();
    const existingMap = new Map(existingResults.map((r) => [r.studentId.toString(), r]));

    const computedResults: IStudentGradeResult[] = [];

    // 4. Calculate grades per student
    for (const studentId of studentIds) {
      const user = userMap.get(studentId);
      const categoryItemsMap = new Map<string, IGradeItemScore[]>();

      // Group configured categories
      for (const cat of config.categories) {
        categoryItemsMap.set(cat.id, []);
      }

      // Populate Assignment items
      const studentSubmissions = submissions.filter((s: any) => s.studentId.toString() === studentId);
      const subMap = new Map<string, any>(studentSubmissions.map((s: any) => [s.assignmentId.toString(), s]));

      for (const assignment of assignments) {
        const sub = subMap.get(assignment._id.toString());
        let obtained = 0;
        let isMissing = false;
        let isLate = false;
        let deduction = 0;
        let rawStatus: string | undefined;

        if (sub) {
          isLate = sub.isLate;
          rawStatus = sub.status;
          if (sub.status === SubmissionStatus.GRADED) {
            const rawScore = sub.score ?? 0;
            if (isLate && assignment.allowLateSubmission && (assignment.latePenalty ?? 0) > 0) {
              deduction = GradeCalculationEngine.round2((rawScore * assignment.latePenalty) / 100);
              obtained = Math.max(0, rawScore - deduction);
            } else {
              obtained = rawScore;
            }
          } else {
            // Not yet graded by teacher
            obtained = 0;
          }
        } else {
          isMissing = true;
          obtained = 0;
        }

        const maxMarks = assignment.totalMarks || 100;
        const normalizedPercentage = GradeCalculationEngine.round2((obtained / maxMarks) * 100);

        const itemScore: IGradeItemScore = {
          sourceType: GradeSourceType.ASSIGNMENT,
          sourceId: assignment._id.toString(),
          sourceTitle: assignment.title,
          maxMarks,
          obtainedMarks: obtained,
          normalizedPercentage,
          isLate,
          latePenaltyDeduction: deduction,
          isMissing,
          rawStatus,
        };

        // Match to category
        const targetCategory = config.categories.find(
          (c) =>
            (c.customSourceIds && c.customSourceIds.includes(assignment._id.toString())) ||
            c.sourceType === GradeSourceType.ASSIGNMENT
        );
        if (targetCategory) {
          categoryItemsMap.get(targetCategory.id)?.push(itemScore);
        }
      }

      // Populate Assessment / Quiz / Exam items
      const studentAttempts = attempts.filter((a: any) => a.studentId.toString() === studentId);
      const attemptsByAssessment = new Map<string, typeof studentAttempts>();
      for (const att of studentAttempts) {
        const key = att.assessmentId.toString();
        if (!attemptsByAssessment.has(key)) {
          attemptsByAssessment.set(key, []);
        }
        attemptsByAssessment.get(key)!.push(att);
      }

      for (const assessment of assessments) {
        const assAttempts = attemptsByAssessment.get(assessment._id.toString()) || [];
        let chosenAttempt = assAttempts[0];

        // Determine matching category to know attempt policy
        const isQuizType = assessment.assessmentType === 'QUIZ';
        const expectedSourceType = isQuizType ? GradeSourceType.QUIZ : GradeSourceType.EXAM;
        const targetCategory = config.categories.find(
          (c) =>
            (c.customSourceIds && c.customSourceIds.includes(assessment._id.toString())) ||
            c.sourceType === expectedSourceType
        );

        const attemptPolicy = targetCategory?.attemptPolicy || AttemptSelectionPolicy.HIGHEST;

        if (assAttempts.length > 1) {
          if (attemptPolicy === AttemptSelectionPolicy.HIGHEST) {
            chosenAttempt = [...assAttempts].sort(
              (a, b) => (b.obtainedMarks ?? 0) - (a.obtainedMarks ?? 0)
            )[0];
          } else if (attemptPolicy === AttemptSelectionPolicy.LATEST) {
            chosenAttempt = [...assAttempts].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0];
          } else {
            chosenAttempt = [...assAttempts].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )[0];
          }
        }

        let obtained = 0;
        let isMissing = false;
        let rawStatus: string | undefined;

        if (chosenAttempt) {
          rawStatus = chosenAttempt.gradingStatus;
          if (
            chosenAttempt.gradingStatus === 'GRADED' ||
            chosenAttempt.gradingStatus === 'AUTO_GRADED'
          ) {
            obtained = chosenAttempt.obtainedMarks ?? 0;
          }
        } else {
          isMissing = true;
          obtained = 0;
        }

        const maxMarks = assessment.totalMarks || 100;
        const normalizedPercentage = GradeCalculationEngine.round2((obtained / maxMarks) * 100);

        const itemScore: IGradeItemScore = {
          sourceType: expectedSourceType,
          sourceId: assessment._id.toString(),
          sourceTitle: assessment.title,
          maxMarks,
          obtainedMarks: obtained,
          normalizedPercentage,
          isMissing,
          rawStatus,
        };

        if (targetCategory) {
          categoryItemsMap.get(targetCategory.id)?.push(itemScore);
        }
      }

      // Populate Attendance item
      const attendanceCategory = config.categories.find(
        (c) => c.sourceType === GradeSourceType.ATTENDANCE
      );
      if (attendanceCategory) {
        const studentRecords = attendanceRecords.filter((r) => r.studentId.toString() === studentId);
        const totalFinalized = finalizedSessions.length;

        let attendedCount = 0;
        let excusedCount = 0;

        for (const rec of studentRecords) {
          if (rec.status === AttendanceStatus.PRESENT || rec.status === AttendanceStatus.LATE) {
            attendedCount++;
          } else if (rec.status === AttendanceStatus.EXCUSED) {
            excusedCount++;
          }
        }

        const eligibleSessions = Math.max(0, totalFinalized - excusedCount);
        let attendancePct = 100;
        if (eligibleSessions > 0) {
          attendancePct = GradeCalculationEngine.round2((attendedCount / eligibleSessions) * 100);
        } else if (totalFinalized === 0) {
          // If no sessions held yet, grant 100% attendance credit
          attendancePct = 100;
        }

        const attendanceItem: IGradeItemScore = {
          sourceType: GradeSourceType.ATTENDANCE,
          sourceId: 'attendance_summary',
          sourceTitle: 'Attendance Record',
          maxMarks: 100,
          obtainedMarks: attendancePct,
          normalizedPercentage: attendancePct,
          isMissing: false,
        };

        categoryItemsMap.get(attendanceCategory.id)?.push(attendanceItem);
      }

      // Run Pure GradeCalculationEngine
      const existing = existingMap.get(studentId);
      const calcOutput = GradeCalculationEngine.calculate({
        categories: config.categories,
        categoryItemsMap,
        passingPercentage: config.passingPercentage,
        gradeScale: config.gradeScale,
        override: existing?.override,
      });

      // Prepare updated result record
      const updatePayload: Partial<IStudentGradeResult> = {
        courseId,
        batchId,
        studentId,
        studentName: user?.name || 'Student',
        studentEmail: user?.email || '',
        categoryContributions: calcOutput.categoryContributions,
        calculatedPercentage: calcOutput.calculatedPercentage,
        finalPercentage: calcOutput.finalPercentage,
        letterGrade: calcOutput.letterGrade,
        gpa: calcOutput.gpa,
        isPassed: calcOutput.isPassed,
        calculatedAt: new Date(),
      };

      const savedResult = await GradeResult.findOneAndUpdate(
        { courseId, batchId, studentId },
        {
          $set: updatePayload,
          $setOnInsert: {
            publicationStatus: GradePublicationStatus.DRAFT,
            override: { isOverridden: false },
            correctionHistory: [],
          },
        },
        { new: true, upsert: true }
      ).lean();

      computedResults.push(savedResult as unknown as IStudentGradeResult);
    }

    return computedResults;
  }

  // ==========================================================================
  // Gradebook Overview & Student Views
  // ==========================================================================

  public static async getGradebookOverview(
    actorId: string,
    actorRoles: UserRole[],
    courseId: string,
    batchId: string
  ): Promise<IGradebookOverviewResponse> {
    await this.verifyTeacherOrAdmin(actorId, actorRoles, courseId, batchId);

    const [course, batch, config] = await Promise.all([
      Course.findById(courseId).select('title code').lean(),
      Batch.findById(batchId).select('batchName batchCode').lean(),
      this.getOrCreateConfig(courseId, batchId, actorId),
    ]);

    if (!course) {
      throw new NotFoundError('Course not found');
    }
    if (!batch) {
      throw new NotFoundError('Batch not found');
    }

    let results = await GradeResult.find({ courseId, batchId }).lean();

    // If no results calculated yet, trigger initial calculation
    if (results.length === 0) {
      results = (await this.calculateBatchGrades(actorId, actorRoles, courseId, batchId)) as any;
    }

    const statusCounts: Record<GradePublicationStatus, number> = {
      [GradePublicationStatus.DRAFT]: 0,
      [GradePublicationStatus.TEACHER_REVIEWED]: 0,
      [GradePublicationStatus.ADMIN_APPROVED]: 0,
      [GradePublicationStatus.PUBLISHED]: 0,
      [GradePublicationStatus.CORRECTED]: 0,
      [GradePublicationStatus.ARCHIVED]: 0,
    };

    let passingCount = 0;
    let failingCount = 0;
    let sumPercentages = 0;

    for (const res of results) {
      if (res.publicationStatus in statusCounts) {
        statusCounts[res.publicationStatus as GradePublicationStatus]++;
      }
      if (res.isPassed) {
        passingCount++;
      } else {
        failingCount++;
      }
      sumPercentages += res.finalPercentage;
    }

    const totalStudents = results.length;
    const averagePercentage =
      totalStudents > 0
        ? GradeCalculationEngine.round2(sumPercentages / totalStudents)
        : 0;

    return {
      config: config.toObject ? config.toObject() : config,
      course: {
        _id: course._id.toString(),
        title: course.title,
        code: course.code,
      },
      batch: {
        _id: batch._id.toString(),
        batchName: (batch as any).batchName,
        batchCode: (batch as any).batchCode,
      },
      results: results as unknown as IStudentGradeResult[],
      statusCounts,
      totalStudents,
      passingCount,
      failingCount,
      averagePercentage,
    };
  }

  // ==========================================================================
  // Lifecycle & Publication Workflows (PRD §38)
  // ==========================================================================

  public static async submitForReview(
    actorId: string,
    actorRoles: UserRole[],
    courseId: string,
    batchId: string,
    dto: SubmitForReviewDto
  ): Promise<{ updatedCount: number; status: GradePublicationStatus }> {
    await this.verifyTeacherOrAdmin(actorId, actorRoles, courseId, batchId);

    const updateRes = await GradeResult.updateMany(
      {
        courseId,
        batchId,
        publicationStatus: GradePublicationStatus.DRAFT,
      },
      {
        $set: {
          publicationStatus: GradePublicationStatus.TEACHER_REVIEWED,
          reviewedBy: actorId,
          reviewedAt: new Date(),
          ...(dto.comments ? { teacherFeedback: dto.comments } : {}),
        },
      }
    );

    return {
      updatedCount: updateRes.modifiedCount,
      status: GradePublicationStatus.TEACHER_REVIEWED,
    };
  }

  public static async approveResults(
    actorId: string,
    actorRoles: UserRole[],
    courseId: string,
    batchId: string,
    dto: ApproveResultsDto
  ): Promise<{ updatedCount: number; status: GradePublicationStatus }> {
    if (
      !actorRoles.includes(UserRole.ADMIN) &&
      !actorRoles.includes(UserRole.SUPER_ADMIN)
    ) {
      throw new ForbiddenError('Only Academic Administrators can approve grades.');
    }

    const updateRes = await GradeResult.updateMany(
      {
        courseId,
        batchId,
        publicationStatus: {
          $in: [GradePublicationStatus.TEACHER_REVIEWED, GradePublicationStatus.DRAFT],
        },
      },
      {
        $set: {
          publicationStatus: GradePublicationStatus.ADMIN_APPROVED,
          approvedBy: actorId,
          approvedAt: new Date(),
        },
      }
    );

    return {
      updatedCount: updateRes.modifiedCount,
      status: GradePublicationStatus.ADMIN_APPROVED,
    };
  }

  public static async publishResults(
    actorId: string,
    actorRoles: UserRole[],
    courseId: string,
    batchId: string,
    dto: PublishResultsDto
  ): Promise<{ updatedCount: number; status: GradePublicationStatus }> {
    if (
      !actorRoles.includes(UserRole.ADMIN) &&
      !actorRoles.includes(UserRole.SUPER_ADMIN) &&
      !actorRoles.includes(UserRole.STAFF)
    ) {
      throw new ForbiddenError('Only authorized administrators can publish academic results.');
    }

    const updateRes = await GradeResult.updateMany(
      {
        courseId,
        batchId,
        publicationStatus: {
          $in: [
            GradePublicationStatus.ADMIN_APPROVED,
            GradePublicationStatus.TEACHER_REVIEWED,
            GradePublicationStatus.DRAFT,
          ],
        },
      },
      {
        $set: {
          publicationStatus: GradePublicationStatus.PUBLISHED,
          publishedBy: actorId,
          publishedAt: new Date(),
        },
      }
    );

    // Side-effect: query published results and dispatch student/guardian grade notifications
    GradeResult.find({ courseId, batchId, publicationStatus: GradePublicationStatus.PUBLISHED })
      .lean()
      .then((results) => {
        for (const res of results) {
          NotificationDispatcher.dispatchGradePublished(res as unknown as IStudentGradeResult).catch((err) => {
            console.error('[GradebookService] Notification dispatch failed:', err?.message || err);
          });
        }
      })
      .catch((err) => {
        console.error('[GradebookService] Failed to query grade results for notification:', err?.message || err);
      });

    await AuditService.record({
      actor: {
        id: actorId,
        role: actorRoles[0],
        type: AuditActorType.USER,
      },
      action: AuditAction.RESULT_PUBLISHED,
      category: AuditCategory.GRADEBOOK,
      resourceType: 'GradeResultBatch',
      resourceId: `${courseId}:${batchId}`,
      scope: {
        courseId,
        batchId,
      },
      newValue: {
        status: GradePublicationStatus.PUBLISHED,
        publishedCount: updateRes.modifiedCount,
      },
      severity: AuditSeverity.HIGH,
      result: AuditResult.SUCCESS,
    });

    return {
      updatedCount: updateRes.modifiedCount,
      status: GradePublicationStatus.PUBLISHED,
    };
  }

  // ==========================================================================
  // Overrides & Corrections (PRD §37 & §38)
  // ==========================================================================

  public static async overrideStudentGrade(
    actorId: string,
    actorRoles: UserRole[],
    courseId: string,
    batchId: string,
    studentId: string,
    dto: OverrideGradeDto
  ): Promise<IStudentGradeResult> {
    await this.verifyTeacherOrAdmin(actorId, actorRoles, courseId, batchId);

    const result = await GradeResult.findOne({ courseId, batchId, studentId });
    if (!result) {
      throw new NotFoundError('Student grade record not found. Please calculate grades first.');
    }

    const previousValue = {
      finalPercentage: result.finalPercentage,
      letterGrade: result.letterGrade,
      gpa: result.gpa,
      isPassed: result.isPassed,
    };

    const config = await this.getOrCreateConfig(courseId, batchId);
    const newFinalPercentage = GradeCalculationEngine.round2(dto.overrideContribution);
    const newLetterGrade =
      dto.overrideLetterGrade ||
      GradeCalculationEngine.deriveLetterGrade(newFinalPercentage, config.gradeScale);
    const newGpa =
      dto.overrideGpa !== undefined
        ? dto.overrideGpa
        : GradeCalculationEngine.deriveGpa(newFinalPercentage, config.gradeScale);
    const isPassed = newFinalPercentage >= config.passingPercentage;

    result.override = {
      isOverridden: true,
      originalContribution: result.calculatedPercentage,
      overrideContribution: newFinalPercentage,
      originalLetterGrade: result.letterGrade,
      overrideLetterGrade: newLetterGrade,
      originalGpa: result.gpa,
      overrideGpa: newGpa,
      reason: dto.reason,
      overriddenBy: actorId as any,
      overriddenAt: new Date(),
    };

    result.finalPercentage = newFinalPercentage;
    result.letterGrade = newLetterGrade;
    result.gpa = newGpa;
    result.isPassed = isPassed;

    await result.save();

    await AuditService.record({
      actor: {
        id: actorId,
        role: actorRoles[0],
        type: AuditActorType.USER,
      },
      action: AuditAction.GRADE_OVERRIDDEN,
      category: AuditCategory.GRADEBOOK,
      resourceType: 'GradeResult',
      resourceId: result._id?.toString() || (result as any).id?.toString() || studentId,
      scope: {
        courseId,
        batchId,
        studentId,
      },
      previousValue,
      newValue: {
        finalPercentage: newFinalPercentage,
        letterGrade: newLetterGrade,
        gpa: newGpa,
        isPassed,
      },
      reason: dto.reason,
      severity: AuditSeverity.HIGH,
      result: AuditResult.SUCCESS,
    });

    return result.toObject() as unknown as IStudentGradeResult;
  }

  public static async correctStudentGrade(
    actorId: string,
    actorRoles: UserRole[],
    courseId: string,
    batchId: string,
    studentId: string,
    dto: CorrectGradeDto
  ): Promise<IStudentGradeResult> {
    await this.verifyTeacherOrAdmin(actorId, actorRoles, courseId, batchId);

    const result = await GradeResult.findOne({ courseId, batchId, studentId });
    if (!result) {
      throw new NotFoundError('Student grade record not found.');
    }

    const previousValue = {
      finalPercentage: result.finalPercentage,
      letterGrade: result.letterGrade,
      gpa: result.gpa,
      isPassed: result.isPassed,
      publicationStatus: result.publicationStatus,
    };

    const config = await this.getOrCreateConfig(courseId, batchId);
    const newPercentage = GradeCalculationEngine.round2(dto.newContribution);
    const newLetterGrade =
      dto.newLetterGrade ||
      GradeCalculationEngine.deriveLetterGrade(newPercentage, config.gradeScale);
    const newGpa =
      dto.newGpa !== undefined
        ? dto.newGpa
        : GradeCalculationEngine.deriveGpa(newPercentage, config.gradeScale);
    const isPassed = newPercentage >= config.passingPercentage;

    if (!result.correctionHistory) {
      result.correctionHistory = [];
    }

    result.correctionHistory.push({
      previousPercentage: result.finalPercentage,
      newPercentage,
      previousLetterGrade: result.letterGrade,
      newLetterGrade,
      previousGpa: result.gpa,
      newGpa,
      reason: dto.reason,
      correctedBy: actorId as any,
      correctedAt: new Date(),
    });

    result.finalPercentage = newPercentage;
    result.letterGrade = newLetterGrade;
    result.gpa = newGpa;
    result.isPassed = isPassed;
    result.publicationStatus = GradePublicationStatus.CORRECTED;

    await result.save();

    await AuditService.record({
      actor: {
        id: actorId,
        role: actorRoles[0],
        type: AuditActorType.USER,
      },
      action: AuditAction.GRADE_CORRECTED,
      category: AuditCategory.GRADEBOOK,
      resourceType: 'GradeResult',
      resourceId: result._id?.toString() || (result as any).id?.toString() || studentId,
      scope: {
        courseId,
        batchId,
        studentId,
      },
      previousValue,
      newValue: {
        finalPercentage: newPercentage,
        letterGrade: newLetterGrade,
        gpa: newGpa,
        isPassed,
        publicationStatus: result.publicationStatus,
      },
      reason: dto.reason,
      severity: AuditSeverity.HIGH,
      result: AuditResult.SUCCESS,
    });

    return result.toObject() as unknown as IStudentGradeResult;
  }

  // ==========================================================================
  // Student & Guardian Queries (Server-side Published Filtering & IDOR Protection)
  // ==========================================================================

  public static async getStudentCourseGrade(
    actorId: string,
    actorRoles: UserRole[],
    courseId: string,
    batchId: string,
    studentId: string
  ): Promise<IStudentGradeResult | null> {
    await this.verifyStudentOrGuardian(actorId, actorRoles, studentId);

    const isPrivileged =
      actorRoles.includes(UserRole.ADMIN) ||
      actorRoles.includes(UserRole.SUPER_ADMIN) ||
      actorRoles.includes(UserRole.TEACHER);

    const query: any = { courseId, batchId, studentId };

    // Students and Guardians can ONLY view published or corrected results
    if (!isPrivileged) {
      query.publicationStatus = {
        $in: [GradePublicationStatus.PUBLISHED, GradePublicationStatus.CORRECTED],
      };
    }

    const result = await GradeResult.findOne(query).lean();
    if (!result && !isPrivileged) {
      // Result not published yet
      return null;
    }

    return result as unknown as IStudentGradeResult;
  }

  public static async getMyGrades(
    actorId: string,
    actorRoles: UserRole[],
    targetStudentId?: string
  ): Promise<IStudentGradeResult[]> {
    const studentIdToFetch = targetStudentId || actorId;
    await this.verifyStudentOrGuardian(actorId, actorRoles, studentIdToFetch);

    const isPrivileged =
      actorRoles.includes(UserRole.ADMIN) ||
      actorRoles.includes(UserRole.SUPER_ADMIN);

    const query: any = { studentId: studentIdToFetch };
    if (!isPrivileged) {
      query.publicationStatus = {
        $in: [GradePublicationStatus.PUBLISHED, GradePublicationStatus.CORRECTED],
      };
    }

    const results = await GradeResult.find(query)
      .populate('courseId', 'title code')
      .populate('batchId', 'name code')
      .lean();

    return results as unknown as IStudentGradeResult[];
  }
}
