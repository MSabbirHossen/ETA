import { Types } from 'mongoose';
import {
  IQuestion,
  ISafeQuestion,
  IAssessment,
  IAssessmentAttempt,
  ISafeAssessmentAttemptView,
  CreateQuestionDto,
  UpdateQuestionDto,
  CreateAssessmentDto,
  UpdateAssessmentDto,
  SaveAnswersDto,
  ReviewAttemptDto,
  UserRole,
} from '@eta/types';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../common/errors.js';
import {
  QuestionModel,
  QuestionDocument,
  toIQuestion,
  toISafeQuestion,
} from './question.model.js';
import {
  AssessmentModel,
  AssessmentDocument,
  toIAssessment,
} from './assessment.model.js';
import { NotificationDispatcher } from '../communication/notification-dispatcher.js';
import {
  AssessmentAttemptModel,
  AssessmentAttemptDocument,
  toIAssessmentAttempt,
} from './attempt.model.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Enrollment } from '../academic/enrollment.model.js';

function toIdString(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof (val as any).toHexString === 'function') return (val as any).toHexString();
  if (typeof (val as any).toString === 'function') {
    const s = (val as any).toString();
    if (s !== '[object Object]') return s;
  }
  if ((val as any)._id) return toIdString((val as any)._id);
  return String(val);
}

export class AssessmentService {
  /**
   * Scope guard: Verifies that the actor has permission to manage the academic area.
   */
  private async verifyTeacherScope(
    actorId: string,
    actorRoles: UserRole[],
    courseId: string,
    batchId?: string
  ): Promise<void> {
    const isSuperAdmin = actorRoles.includes(UserRole.SUPER_ADMIN);
    const isAdmin = actorRoles.includes(UserRole.ADMIN);
    if (isSuperAdmin || isAdmin) return;

    if (!actorRoles.includes(UserRole.TEACHER)) {
      throw new ForbiddenError('Forbidden: Insufficient privileges');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const isCourseTeacher = course.teacherIds?.some(
      (id: Types.ObjectId | string) => id?.toString() === actorId
    );

    let isBatchTeacher = false;
    if (batchId) {
      const batch = await Batch.findById(batchId);
      if (batch) {
        isBatchTeacher = batch.teacherIds?.some(
          (id: Types.ObjectId | string) => id?.toString() === actorId
        );
      }
    }

    if (!isCourseTeacher && !isBatchTeacher) {
      throw new ForbiddenError('Forbidden: You are not assigned to teach this course or batch');
    }
  }

  // ==========================================
  // QUESTION BANK
  // ==========================================

  async createQuestion(
    actorId: string,
    actorRoles: UserRole[],
    dto: CreateQuestionDto
  ): Promise<IQuestion> {
    await this.verifyTeacherScope(actorId, actorRoles, dto.courseId);

    const question = await QuestionModel.create({
      ...dto,
      courseId: new Types.ObjectId(dto.courseId),
      subjectId: dto.subjectId ? new Types.ObjectId(dto.subjectId) : undefined,
      moduleId: dto.moduleId ? new Types.ObjectId(dto.moduleId) : undefined,
      lessonId: dto.lessonId ? new Types.ObjectId(dto.lessonId) : undefined,
      createdBy: new Types.ObjectId(actorId),
    });

    return toIQuestion(question);
  }

  async updateQuestion(
    actorId: string,
    actorRoles: UserRole[],
    questionId: string,
    dto: UpdateQuestionDto
  ): Promise<IQuestion> {
    const question = await QuestionModel.findById(questionId);
    if (!question) {
      throw new NotFoundError('Question not found');
    }

    await this.verifyTeacherScope(actorId, actorRoles, question.courseId.toString());

    Object.assign(question, {
      ...dto,
      subjectId: dto.subjectId ? new Types.ObjectId(dto.subjectId) : question.subjectId,
      moduleId: dto.moduleId ? new Types.ObjectId(dto.moduleId) : question.moduleId,
      lessonId: dto.lessonId ? new Types.ObjectId(dto.lessonId) : question.lessonId,
    });

    await question.save();
    return toIQuestion(question);
  }

  async getQuestionById(
    actorId: string,
    actorRoles: UserRole[],
    questionId: string
  ): Promise<IQuestion> {
    const question = await QuestionModel.findById(questionId);
    if (!question) {
      throw new NotFoundError('Question not found');
    }

    await this.verifyTeacherScope(actorId, actorRoles, question.courseId.toString());
    return toIQuestion(question);
  }

  async listQuestions(
    actorId: string,
    actorRoles: UserRole[],
    filter: {
      courseId?: string;
      subjectId?: string;
      type?: string;
      status?: string;
      search?: string;
    }
  ): Promise<IQuestion[]> {
    const query: Record<string, unknown> = {};

    if (filter.courseId) query.courseId = new Types.ObjectId(filter.courseId);
    if (filter.subjectId) query.subjectId = new Types.ObjectId(filter.subjectId);
    if (filter.type) query.type = filter.type;
    if (filter.status) query.status = filter.status;
    else query.status = { $ne: 'ARCHIVED' };

    if (filter.search) {
      query.prompt = { $regex: filter.search, $options: 'i' };
    }

    if (!actorRoles.includes(UserRole.ADMIN) && !actorRoles.includes(UserRole.SUPER_ADMIN)) {
      if (!filter.courseId) {
        const assignedCourses = await Course.find({ teacherIds: new Types.ObjectId(actorId) });
        query.courseId = { $in: assignedCourses.map((c: any) => c._id) };
      }
    }

    const questions = await QuestionModel.find(query).sort({ createdAt: -1 });
    return questions.map(toIQuestion);
  }

  // ==========================================
  // ASSESSMENT CONFIGURATION & MANAGEMENT
  // ==========================================

  async createAssessment(
    actorId: string,
    actorRoles: UserRole[],
    dto: CreateAssessmentDto
  ): Promise<IAssessment> {
    await this.verifyTeacherScope(actorId, actorRoles, dto.courseId, dto.batchId);

    const batch = await Batch.findById(dto.batchId);
    if (!batch || batch.courseId.toString() !== dto.courseId) {
      throw new BadRequestError('Batch does not belong to the supplied course');
    }

    const questionIds = dto.questions.map((q) => new Types.ObjectId(q.questionId));
    const existingQuestions = await QuestionModel.find({ _id: { $in: questionIds } });
    if (existingQuestions.length !== questionIds.length) {
      throw new BadRequestError('One or more referenced questions do not exist');
    }

    const questionMap = new Map(existingQuestions.map((q) => [q._id.toString(), q]));
    let computedTotalMarks = 0;
    const configuredQuestions = dto.questions.map((q, idx) => {
      const qDoc = questionMap.get(q.questionId);
      const marks = q.marks !== undefined ? q.marks : (qDoc?.marks ?? 1);
      computedTotalMarks += marks;
      return {
        questionId: new Types.ObjectId(q.questionId),
        marks,
        order: q.order !== undefined ? q.order : idx + 1,
      };
    });

    const slug =
      dto.slug ||
      dto.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + `-${Date.now().toString(36)}`;

    const assessment = await AssessmentModel.create({
      ...dto,
      slug,
      courseId: new Types.ObjectId(dto.courseId),
      batchId: new Types.ObjectId(dto.batchId),
      subjectId: dto.subjectId ? new Types.ObjectId(dto.subjectId) : undefined,
      moduleId: dto.moduleId ? new Types.ObjectId(dto.moduleId) : undefined,
      lessonId: dto.lessonId ? new Types.ObjectId(dto.lessonId) : undefined,
      createdBy: new Types.ObjectId(actorId),
      questions: configuredQuestions,
      totalMarks: dto.totalMarks || computedTotalMarks,
      opensAt: new Date(dto.opensAt),
      dueAt: new Date(dto.dueAt),
      closesAt: dto.closesAt ? new Date(dto.closesAt) : undefined,
      status: dto.status || 'DRAFT',
    });

    return toIAssessment(assessment);
  }

  async updateAssessment(
    actorId: string,
    actorRoles: UserRole[],
    assessmentId: string,
    dto: UpdateAssessmentDto
  ): Promise<IAssessment> {
    const assessment = await AssessmentModel.findById(assessmentId);
    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    await this.verifyTeacherScope(
      actorId,
      actorRoles,
      assessment.courseId.toString(),
      assessment.batchId.toString()
    );

    if (dto.questions) {
      const questionIds = dto.questions.map((q) => new Types.ObjectId(q.questionId));
      const existingQuestions = await QuestionModel.find({ _id: { $in: questionIds } });
      const questionMap = new Map(existingQuestions.map((q) => [q._id.toString(), q]));
      let computedTotalMarks = 0;
      assessment.questions = dto.questions.map((q, idx) => {
        const qDoc = questionMap.get(q.questionId);
        const marks = q.marks !== undefined ? q.marks : (qDoc?.marks ?? 1);
        computedTotalMarks += marks;
        return {
          questionId: new Types.ObjectId(q.questionId),
          marks,
          order: q.order !== undefined ? q.order : idx + 1,
        };
      });
      assessment.totalMarks = dto.totalMarks || computedTotalMarks;
    }

    if (dto.title) assessment.title = dto.title;
    if (dto.description !== undefined) assessment.description = dto.description;
    if (dto.instructions !== undefined) assessment.instructions = dto.instructions;
    if (dto.durationMinutes) assessment.durationMinutes = dto.durationMinutes;
    if (dto.passMark !== undefined) assessment.passMark = dto.passMark;
    if (dto.attemptsAllowed) assessment.attemptsAllowed = dto.attemptsAllowed;
    if (dto.shuffleQuestions !== undefined) assessment.shuffleQuestions = dto.shuffleQuestions;
    if (dto.shuffleOptions !== undefined) assessment.shuffleOptions = dto.shuffleOptions;
    if (dto.opensAt) assessment.opensAt = new Date(dto.opensAt);
    if (dto.dueAt) assessment.dueAt = new Date(dto.dueAt);
    if (dto.closesAt !== undefined)
      assessment.closesAt = dto.closesAt ? new Date(dto.closesAt) : undefined;
    if (dto.status) assessment.status = dto.status;

    await assessment.save();
    return toIAssessment(assessment);
  }

  async publishAssessment(
    actorId: string,
    actorRoles: UserRole[],
    assessmentId: string
  ): Promise<IAssessment> {
    const assessment = await AssessmentModel.findById(assessmentId);
    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    await this.verifyTeacherScope(
      actorId,
      actorRoles,
      assessment.courseId.toString(),
      assessment.batchId.toString()
    );

    if (assessment.questions.length === 0) {
      throw new BadRequestError('Cannot publish assessment with no questions');
    }

    assessment.status = 'PUBLISHED';
    await assessment.save();
    const result = toIAssessment(assessment);

    // Side-effect: dispatch notification to enrolled students
    NotificationDispatcher.dispatchAssessmentPublished(result, assessment.batchId.toString()).catch((err) => {
      console.error('[AssessmentService] Notification dispatch failed:', err?.message || err);
    });

    return result;
  }

  async listAssessments(
    actorId: string,
    actorRoles: UserRole[],
    query: { courseId?: string; batchId?: string; status?: string }
  ): Promise<IAssessment[]> {
    const isStudent = actorRoles.includes(UserRole.STUDENT);
    const filter: Record<string, unknown> = {};

    if (query.courseId) filter.courseId = new Types.ObjectId(query.courseId);
    if (query.batchId) filter.batchId = new Types.ObjectId(query.batchId);
    if (query.status) filter.status = query.status;

    if (isStudent) {
      const enrollments = await Enrollment.find({
        studentId: new Types.ObjectId(actorId),
        status: 'ACTIVE',
      });
      const enrolledBatchIds = enrollments.map((e: any) => e.batchId);
      filter.batchId = { $in: enrolledBatchIds };
      filter.status = { $in: ['PUBLISHED', 'LIVE', 'CLOSED'] };
    }

    const assessments = await AssessmentModel.find(filter).sort({ dueAt: 1 });
    return assessments.map(toIAssessment);
  }

  async getAssessmentById(
    actorId: string,
    actorRoles: UserRole[],
    assessmentId: string
  ): Promise<IAssessment> {
    const assessment = await AssessmentModel.findById(assessmentId);
    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    if (actorRoles.includes(UserRole.STUDENT)) {
      const enrollment = await Enrollment.findOne({
        studentId: new Types.ObjectId(actorId),
        batchId: assessment.batchId,
        status: 'ACTIVE',
      });
      if (!enrollment) {
        throw new ForbiddenError('Forbidden: You are not enrolled in this assessment cohort');
      }
      if (assessment.status === 'DRAFT') {
        throw new ForbiddenError('Assessment is not available');
      }
    }

    return toIAssessment(assessment);
  }

  // ==========================================
  // ATTEMPT WORKFLOW & SECURE TAKING
  // ==========================================

  async startAttempt(
    studentId: string,
    assessmentId: string
  ): Promise<ISafeAssessmentAttemptView> {
    const assessment = await AssessmentModel.findById(assessmentId);
    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    const enrollment = await Enrollment.findOne({
      studentId: new Types.ObjectId(studentId),
      batchId: assessment.batchId,
      status: 'ACTIVE',
    });
    if (!enrollment) {
      throw new ForbiddenError('Forbidden: You are not enrolled in this assessment cohort');
    }

    if (assessment.status === 'DRAFT' || assessment.status === 'ARCHIVED') {
      throw new BadRequestError('Assessment is not open for attempts');
    }

    const now = new Date();
    if (now < assessment.opensAt) {
      throw new BadRequestError('Assessment has not opened yet');
    }
    if (assessment.closesAt && now > assessment.closesAt) {
      throw new BadRequestError('Assessment has closed');
    }

    const existingAttempts = await AssessmentAttemptModel.find({
      assessmentId: new Types.ObjectId(assessmentId),
      studentId: new Types.ObjectId(studentId),
    }).sort({ attemptNumber: 1 });

    const activeAttempt = existingAttempts.find((att) => att.status === 'IN_PROGRESS');
    if (activeAttempt) {
      if (now > activeAttempt.expiresAt) {
        await this.autoSubmitAttempt(activeAttempt);
      } else {
        return this.buildSafeAttemptView(activeAttempt, assessment);
      }
    }

    const terminalAttempts = existingAttempts.filter((att) => att.status !== 'IN_PROGRESS');
    if (terminalAttempts.length >= assessment.attemptsAllowed) {
      throw new BadRequestError('Maximum attempts reached for this assessment');
    }

    const attemptNumber = terminalAttempts.length + 1;

    const durationMs = assessment.durationMinutes * 60 * 1000;
    const hardCloseTime = assessment.closesAt ? assessment.closesAt.getTime() : Infinity;
    const expiresAt = new Date(Math.min(now.getTime() + durationMs, hardCloseTime));

    let questionIds = assessment.questions.map((q) => q.questionId.toString());
    if (assessment.shuffleQuestions) {
      questionIds = [...questionIds].sort(() => Math.random() - 0.5);
    }

    const newAttempt = await AssessmentAttemptModel.create({
      assessmentId: assessment._id,
      studentId: new Types.ObjectId(studentId),
      batchId: assessment.batchId,
      attemptNumber,
      startedAt: now,
      expiresAt,
      status: 'IN_PROGRESS',
      gradingStatus: 'PENDING',
      answers: [],
      questionOrder: questionIds,
      totalMarks: assessment.totalMarks,
    });

    return this.buildSafeAttemptView(newAttempt, assessment);
  }

  async saveAnswers(
    studentId: string,
    attemptId: string,
    dto: SaveAnswersDto
  ): Promise<{ savedCount: number; expiresAt: Date }> {
    const attempt = await AssessmentAttemptModel.findById(attemptId);
    if (!attempt) {
      throw new NotFoundError('Attempt not found');
    }

    if (attempt.studentId.toString() !== studentId) {
      throw new ForbiddenError('Forbidden: Cannot modify another student\'s attempt');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestError('Cannot save answers on an inactive or submitted attempt');
    }

    const now = new Date();
    if (now > attempt.expiresAt) {
      await this.autoSubmitAttempt(attempt);
      throw new BadRequestError('Time has expired. Attempt was automatically submitted.');
    }

    const existingAnswerMap = new Map(
      attempt.answers.map((ans) => [ans.questionId.toString(), ans])
    );

    for (const item of dto.answers) {
      if (!attempt.questionOrder.includes(item.questionId)) {
        continue;
      }

      existingAnswerMap.set(item.questionId, {
        questionId: new Types.ObjectId(item.questionId),
        selectedOptionId: item.selectedOptionId,
        selectedOptionIds: item.selectedOptionIds,
        booleanAnswer: item.booleanAnswer,
        textAnswer: item.textAnswer,
      });
    }

    attempt.answers = Array.from(existingAnswerMap.values());
    await attempt.save();

    return {
      savedCount: attempt.answers.length,
      expiresAt: attempt.expiresAt,
    };
  }

  async submitAttempt(studentId: string, attemptId: string): Promise<IAssessmentAttempt> {
    const attempt = await AssessmentAttemptModel.findById(attemptId);
    if (!attempt) {
      throw new NotFoundError('Attempt not found');
    }

    if (attempt.studentId.toString() !== studentId) {
      throw new ForbiddenError('Forbidden: Cannot submit another student\'s attempt');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestError('Attempt has already been submitted or closed');
    }

    const now = new Date();
    const isTimeout = now > attempt.expiresAt;
    attempt.submittedAt = now;
    attempt.status = isTimeout ? 'AUTO_SUBMITTED' : 'SUBMITTED';

    await this.gradeAttempt(attempt);
    return toIAssessmentAttempt(attempt);
  }

  private async autoSubmitAttempt(attempt: AssessmentAttemptDocument): Promise<void> {
    attempt.submittedAt = new Date();
    attempt.status = 'AUTO_SUBMITTED';
    await this.gradeAttempt(attempt);
  }

  private async gradeAttempt(attempt: AssessmentAttemptDocument): Promise<void> {
    const assessment = await AssessmentModel.findById(attempt.assessmentId);
    if (!assessment) return;

    const questionIds = attempt.questionOrder.map((id) => new Types.ObjectId(id));
    const questions = await QuestionModel.find({ _id: { $in: questionIds } });
    const questionMap = new Map(questions.map((q) => [toIdString(q._id || q), q]));

    let obtainedMarks = 0;
    let hasSubjective = questions.some((q) => q.type === 'SHORT_ANSWER' || q.type === 'ESSAY');

    for (const ans of attempt.answers) {
      const ansKey = toIdString(ans.questionId);
      const q = questionMap.get(ansKey);
      if (!q) continue;

      if (q.type === 'MCQ') {
        const correctOpt = q.options?.find((o) => o.isCorrect);
        if (correctOpt && ans.selectedOptionId === correctOpt.id) {
          ans.obtainedMarks = q.marks;
          ans.isCorrect = true;
          obtainedMarks += q.marks;
        } else {
          ans.obtainedMarks = 0;
          ans.isCorrect = false;
        }
        ans.isAutoGraded = true;
      } else if (q.type === 'TRUE_FALSE') {
        if (ans.booleanAnswer === q.correctAnswer) {
          ans.obtainedMarks = q.marks;
          ans.isCorrect = true;
          obtainedMarks += q.marks;
        } else {
          ans.obtainedMarks = 0;
          ans.isCorrect = false;
        }
        ans.isAutoGraded = true;
      } else {
        hasSubjective = true;
        ans.isAutoGraded = false;
      }
    }

    attempt.timeUsedSeconds = Math.max(
      1,
      Math.round(((attempt.submittedAt || new Date()).getTime() - attempt.startedAt.getTime()) / 1000)
    );

    const isAutoSubmitted = attempt.status === 'AUTO_SUBMITTED';

    if (hasSubjective) {
      attempt.gradingStatus = 'PENDING';
      attempt.status = 'UNDER_REVIEW';
      attempt.obtainedMarks = obtainedMarks;
    } else {
      attempt.gradingStatus = 'AUTO_GRADED';
      attempt.status = isAutoSubmitted ? 'AUTO_SUBMITTED' : 'GRADED';
      attempt.obtainedMarks = obtainedMarks;
      attempt.percentage = Math.round((obtainedMarks / attempt.totalMarks) * 100);
      attempt.isPassed = attempt.percentage >= assessment.passMark;
    }

    await attempt.save();
  }

  async reviewAttempt(
    actorId: string,
    actorRoles: UserRole[],
    attemptId: string,
    dto: ReviewAttemptDto
  ): Promise<IAssessmentAttempt> {
    const attempt = await AssessmentAttemptModel.findById(attemptId);
    if (!attempt) {
      throw new NotFoundError('Attempt not found');
    }

    const assessment = await AssessmentModel.findById(attempt.assessmentId);
    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    await this.verifyTeacherScope(
      actorId,
      actorRoles,
      assessment.courseId.toString(),
      assessment.batchId.toString()
    );

    const reviewMap = new Map(dto.reviews.map((r) => [r.questionId, r]));

    let totalScore = 0;
    for (const ans of attempt.answers) {
      const qId = ans.questionId.toString();
      const review = reviewMap.get(qId);
      if (review) {
        ans.obtainedMarks = review.obtainedMarks;
        if (review.feedback) ans.feedback = review.feedback;
      }
      totalScore += ans.obtainedMarks || 0;
    }

    attempt.obtainedMarks = totalScore;
    attempt.percentage = Math.round((totalScore / attempt.totalMarks) * 100);
    attempt.isPassed = attempt.percentage >= assessment.passMark;
    attempt.gradingStatus = 'MANUALLY_GRADED';
    attempt.status = 'GRADED';
    attempt.reviewedBy = new Types.ObjectId(actorId);
    attempt.reviewedAt = new Date();
    if (dto.overallFeedback) attempt.feedback = dto.overallFeedback;

    await attempt.save();
    return toIAssessmentAttempt(attempt);
  }

  async getStudentAttempt(studentId: string, attemptId: string): Promise<IAssessmentAttempt> {
    const attempt = await AssessmentAttemptModel.findById(attemptId);
    if (!attempt) {
      throw new NotFoundError('Attempt not found');
    }

    if (attempt.studentId.toString() !== studentId) {
      throw new ForbiddenError('Forbidden: You cannot view another student\'s attempt');
    }

    if (attempt.status === 'IN_PROGRESS' && new Date() > attempt.expiresAt) {
      await this.autoSubmitAttempt(attempt);
    }

    return toIAssessmentAttempt(attempt);
  }

  async listAssessmentAttempts(
    actorId: string,
    actorRoles: UserRole[],
    assessmentId: string
  ): Promise<IAssessmentAttempt[]> {
    const assessment = await AssessmentModel.findById(assessmentId);
    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    await this.verifyTeacherScope(
      actorId,
      actorRoles,
      assessment.courseId.toString(),
      assessment.batchId.toString()
    );

    const attempts = await AssessmentAttemptModel.find({
      assessmentId: new Types.ObjectId(assessmentId),
    }).sort({ startedAt: -1 });

    return attempts.map(toIAssessmentAttempt);
  }

  private async buildSafeAttemptView(
    attempt: AssessmentAttemptDocument,
    assessment: AssessmentDocument
  ): Promise<ISafeAssessmentAttemptView> {
    const questionIds = attempt.questionOrder.map((id) => new Types.ObjectId(id));
    const questions = await QuestionModel.find({ _id: { $in: questionIds } });
    const questionMap = new Map(questions.map((q) => [toIdString(q._id || q), q]));

    const safeQuestions: ISafeQuestion[] = attempt.questionOrder
      .map((qId) => {
        const qDoc = questionMap.get(toIdString(qId));
        if (!qDoc) return null;
        const safe = toISafeQuestion(qDoc);
        if (assessment.shuffleOptions && safe.options) {
          safe.options = [...safe.options].sort(() => Math.random() - 0.5);
        }
        return safe;
      })
      .filter((q): q is ISafeQuestion => q !== null);

    return {
      attempt: toIAssessmentAttempt(attempt),
      assessment: {
        id: assessment._id.toString(),
        title: assessment.title,
        description: assessment.description,
        instructions: assessment.instructions,
        assessmentType: assessment.assessmentType,
        durationMinutes: assessment.durationMinutes,
        totalMarks: assessment.totalMarks,
        passMark: assessment.passMark,
        opensAt: assessment.opensAt,
        dueAt: assessment.dueAt,
        closesAt: assessment.closesAt,
        status: assessment.status,
        resultReleasePolicy: assessment.resultReleasePolicy,
      },
      questions: safeQuestions,
    };
  }
}

export const assessmentService = new AssessmentService();
