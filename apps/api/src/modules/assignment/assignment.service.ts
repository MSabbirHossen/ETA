import mongoose from 'mongoose';
import {
  Assignment,
  toIAssignment,
  type AssignmentDocument,
} from './assignment.model.js';
import {
  AssignmentSubmission,
  toIAssignmentSubmission,
  type SubmissionDocument,
} from './submission.model.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Subject } from '../academic/subject.model.js';
import { Module } from '../academic/module.model.js';
import { Lesson } from '../learning/lesson.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { User } from '../users/user.model.js';
import { NotificationDispatcher } from '../communication/notification-dispatcher.js';
import {
  UserRole,
  AssignmentStatus,
  SubmissionStatus,
  SubmissionType,
  AssignmentVisibility,
  EnrollmentStatus,
  type IAssignment,
  type IAssignmentSubmission,
  type CreateAssignmentDto,
  type UpdateAssignmentDto,
  type SubmitAssignmentDto,
  type ReviewSubmissionDto,
  type IUser,
} from '@eta/types';
import { slugify } from '@eta/utils';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  PrivateFileUploadsDisabledError,
} from '../../common/errors.js';
import { getEnv } from '../../config/env.js';

export class AssignmentService {
  // ----------------------------------------------------
  // Helper: Verify Teacher Assignment or Admin Privilege
  // ----------------------------------------------------
  private static async verifyTeacherOrAdmin(
    actorId: string,
    actorRoles: UserRole[],
    courseId?: string | null,
    batchId?: string | null,
  ): Promise<void> {
    if (actorRoles.includes(UserRole.ADMIN) || actorRoles.includes(UserRole.SUPER_ADMIN)) {
      return;
    }

    if (!actorRoles.includes(UserRole.TEACHER)) {
      throw new ForbiddenError('You must be a teacher or administrator to manage assignments.');
    }

    let isAssigned = false;
    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      const course = await Course.findById(courseId).select('teacherIds').lean();
      if (course && course.teacherIds?.some((id: any) => id?.toString() === actorId)) {
        isAssigned = true;
      }
    }

    if (!isAssigned && batchId && mongoose.Types.ObjectId.isValid(batchId)) {
      const batch = await Batch.findById(batchId).select('teacherIds').lean();
      if (batch && batch.teacherIds?.some((id: any) => id?.toString() === actorId)) {
        isAssigned = true;
      }
    }


    if (!isAssigned && (courseId || batchId)) {
      throw new ForbiddenError('You are not assigned to manage assignments for this course or cohort.');
    }
  }

  // ----------------------------------------------------
  // Helper: Verify Student Active Enrollment in Batch
  // ----------------------------------------------------
  private static async verifyStudentEnrollment(studentId: string, batchId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(batchId)) {
      return false;
    }
    const enrollment = await Enrollment.findOne({
      studentId: new mongoose.Types.ObjectId(studentId),
      batchId: new mongoose.Types.ObjectId(batchId),
      status: EnrollmentStatus.ACTIVE,
    }).lean();

    return !!enrollment;
  }

  // ====================================================
  // 1. ASSIGNMENT MANAGEMENT
  // ====================================================

  static async createAssignment(
    dto: CreateAssignmentDto,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<IAssignment> {
    if (!mongoose.Types.ObjectId.isValid(dto.batchId) || !mongoose.Types.ObjectId.isValid(dto.courseId)) {
      throw new ValidationError('Invalid batch or course ID format.');
    }

    const batch = await Batch.findById(dto.batchId);
    if (!batch) {
      throw new NotFoundError('Batch not found.');
    }

    if (batch.courseId.toString() !== dto.courseId) {
      throw new ValidationError('Specified batch does not belong to the provided course.');
    }

    // Verify academic relationships if provided
    if (dto.subjectId) {
      if (!mongoose.Types.ObjectId.isValid(dto.subjectId)) {
        throw new ValidationError('Invalid subject ID format.');
      }
      const subject = await Subject.findById(dto.subjectId);
      if (!subject || subject.courseId.toString() !== dto.courseId) {
        throw new ValidationError('Subject does not belong to the specified course.');
      }
    }

    if (dto.moduleId) {
      if (!mongoose.Types.ObjectId.isValid(dto.moduleId)) {
        throw new ValidationError('Invalid module ID format.');
      }
      const moduleDoc = await Module.findById(dto.moduleId);
      if (!moduleDoc) {
        throw new ValidationError('Module not found.');
      }
    }

    if (dto.lessonId) {
      if (!mongoose.Types.ObjectId.isValid(dto.lessonId)) {
        throw new ValidationError('Invalid lesson ID format.');
      }
      const lesson = await Lesson.findById(dto.lessonId);
      if (!lesson) {
        throw new ValidationError('Lesson not found.');
      }
    }

    // Verify creator authorization
    await this.verifyTeacherOrAdmin(actorId, actorRoles, dto.courseId, dto.batchId);

    const targetTeacherId = dto.teacherId || actorId;
    const pubDate = dto.publishDate ? new Date(dto.publishDate) : new Date();
    const dueDate = new Date(dto.dueDate);
    const closesAt = dto.closesAt ? new Date(dto.closesAt) : null;

    if (dueDate.getTime() < pubDate.getTime()) {
      throw new ValidationError('Due date must be after or equal to publish date.');
    }
    if (closesAt && closesAt.getTime() < dueDate.getTime()) {
      throw new ValidationError('Close date must be after or equal to due date.');
    }

    const baseSlug = dto.slug ? slugify(dto.slug) : slugify(dto.title);
    let finalSlug = baseSlug;

    const existingSlug = await Assignment.findOne({
      batchId: new mongoose.Types.ObjectId(dto.batchId),
      slug: finalSlug,
    });
    if (existingSlug) {
      finalSlug = `${baseSlug}-${Date.now().toString(36)}`;
    }

    const doc = new Assignment({
      title: dto.title.trim(),
      slug: finalSlug,
      description: dto.description?.trim() ?? null,
      instructions: dto.instructions.trim(),
      courseId: new mongoose.Types.ObjectId(dto.courseId),
      batchId: new mongoose.Types.ObjectId(dto.batchId),
      subjectId: dto.subjectId && mongoose.Types.ObjectId.isValid(dto.subjectId) ? new mongoose.Types.ObjectId(dto.subjectId) : null,
      moduleId: dto.moduleId && mongoose.Types.ObjectId.isValid(dto.moduleId) ? new mongoose.Types.ObjectId(dto.moduleId) : null,
      lessonId: dto.lessonId && mongoose.Types.ObjectId.isValid(dto.lessonId) ? new mongoose.Types.ObjectId(dto.lessonId) : null,
      teacherId: new mongoose.Types.ObjectId(targetTeacherId),
      attachments: dto.attachments || [],
      totalMarks: dto.totalMarks ?? 100,
      passMarks: dto.passMarks ?? null,
      publishDate: pubDate,
      dueDate: dueDate,
      closesAt: closesAt,
      allowLateSubmission: dto.allowLateSubmission ?? true,
      latePenalty: dto.latePenalty ?? 0,
      submissionType: dto.submissionType ?? SubmissionType.MIXED,
      maxAttempts: dto.maxAttempts ?? 1,
      resubmissionAllowed: dto.resubmissionAllowed ?? false,
      status: dto.status ?? AssignmentStatus.DRAFT,
      visibility: dto.visibility ?? AssignmentVisibility.ENROLLMENT_ONLY,
    });

    await doc.save();
    return toIAssignment(doc);
  }

  static async getAssignments(
    query: {
      courseId?: string;
      batchId?: string;
      subjectId?: string;
      status?: AssignmentStatus;
    },
    user?: IUser,
    activeRole?: UserRole,
  ): Promise<IAssignment[]> {
    const filter: Record<string, any> = {};

    const isStudent = activeRole === UserRole.STUDENT;
    const isTeacher = activeRole === UserRole.TEACHER;
    const isAdmin = activeRole === UserRole.ADMIN || activeRole === UserRole.SUPER_ADMIN;

    if (isStudent && user) {
      // Find all active batch enrollments for student (IDOR protection)
      const enrollments = await Enrollment.find({
        studentId: new mongoose.Types.ObjectId(user._id),
        status: EnrollmentStatus.ACTIVE,
      }).select('batchId');

      const enrolledBatchIds = enrollments.map((e) => e.batchId);
      filter.batchId = { $in: enrolledBatchIds };
      filter.status = { $in: [AssignmentStatus.PUBLISHED, AssignmentStatus.CLOSED] };
      filter.publishDate = { $lte: new Date() };
    } else {
      if (query.batchId && mongoose.Types.ObjectId.isValid(query.batchId)) {
        filter.batchId = new mongoose.Types.ObjectId(query.batchId);
      }
      if (query.courseId && mongoose.Types.ObjectId.isValid(query.courseId)) {
        filter.courseId = new mongoose.Types.ObjectId(query.courseId);
      }
      if (query.subjectId && mongoose.Types.ObjectId.isValid(query.subjectId)) {
        filter.subjectId = new mongoose.Types.ObjectId(query.subjectId);
      }
      if (query.status) {
        filter.status = query.status;
      }
      if (isTeacher && user && !query.batchId && !query.courseId) {
        filter.teacherId = new mongoose.Types.ObjectId(user._id);
      }
    }

    const docs = await Assignment.find(filter).sort({ dueDate: 1, createdAt: -1 });
    return docs.map(toIAssignment);
  }

  static async getAssignmentById(
    id: string,
    user?: IUser,
    activeRole?: UserRole,
  ): Promise<IAssignment> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid assignment ID format.');
    }

    const doc = await Assignment.findById(id);
    if (!doc) {
      throw new NotFoundError('Assignment not found.');
    }

    const isStudent = activeRole === UserRole.STUDENT;
    if (isStudent && user) {
      if (doc.status !== AssignmentStatus.PUBLISHED && doc.status !== AssignmentStatus.CLOSED) {
        throw new NotFoundError('Assignment not found or not published.');
      }
      const isEnrolled = await this.verifyStudentEnrollment(user._id, doc.batchId.toString());
      if (!isEnrolled) {
        throw new ForbiddenError('You are not enrolled in the cohort assigned to this coursework.');
      }
    }

    return toIAssignment(doc);
  }

  static async updateAssignment(
    id: string,
    dto: UpdateAssignmentDto,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<IAssignment> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid assignment ID format.');
    }

    const doc = await Assignment.findById(id);
    if (!doc) {
      throw new NotFoundError('Assignment not found.');
    }

    await this.verifyTeacherOrAdmin(actorId, actorRoles, doc.courseId.toString(), doc.batchId.toString());

    if (dto.title !== undefined) doc.title = dto.title.trim();
    if (dto.slug !== undefined) doc.slug = slugify(dto.slug);
    if (dto.description !== undefined) doc.description = dto.description?.trim() ?? null;
    if (dto.instructions !== undefined) doc.instructions = dto.instructions.trim();
    if (dto.attachments !== undefined) doc.attachments = dto.attachments;
    if (dto.totalMarks !== undefined) doc.totalMarks = dto.totalMarks;
    if (dto.passMarks !== undefined) doc.passMarks = dto.passMarks ?? null;
    if (dto.allowLateSubmission !== undefined) doc.allowLateSubmission = dto.allowLateSubmission;
    if (dto.latePenalty !== undefined) doc.latePenalty = dto.latePenalty;
    if (dto.submissionType !== undefined) doc.submissionType = dto.submissionType;
    if (dto.maxAttempts !== undefined) doc.maxAttempts = dto.maxAttempts;
    if (dto.resubmissionAllowed !== undefined) doc.resubmissionAllowed = dto.resubmissionAllowed;
    if (dto.visibility !== undefined) doc.visibility = dto.visibility;
    if (dto.status !== undefined) doc.status = dto.status;

    if (dto.publishDate !== undefined) doc.publishDate = new Date(dto.publishDate);
    if (dto.dueDate !== undefined) doc.dueDate = new Date(dto.dueDate);
    if (dto.closesAt !== undefined) doc.closesAt = dto.closesAt ? new Date(dto.closesAt) : null;

    if (doc.dueDate.getTime() < doc.publishDate.getTime()) {
      throw new ValidationError('Due date must be after or equal to publish date.');
    }
    if (doc.closesAt && doc.closesAt.getTime() < doc.dueDate.getTime()) {
      throw new ValidationError('Close date must be after or equal to due date.');
    }

    await doc.save();
    return toIAssignment(doc);
  }

  static async publishAssignment(
    id: string,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<IAssignment> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid assignment ID format.');
    }

    const doc = await Assignment.findById(id);
    if (!doc) {
      throw new NotFoundError('Assignment not found.');
    }

    await this.verifyTeacherOrAdmin(actorId, actorRoles, doc.courseId.toString(), doc.batchId.toString());

    doc.status = AssignmentStatus.PUBLISHED;
    if (doc.publishDate.getTime() > Date.now()) {
      doc.publishDate = new Date();
    }
    await doc.save();
    const result = toIAssignment(doc);

    // Side-effect: dispatch notification to enrolled students
    NotificationDispatcher.dispatchAssignmentPublished(result, doc.batchId.toString()).catch((err) => {
      console.error('[AssignmentService] Notification dispatch failed:', err?.message || err);
    });

    return result;
  }

  static async deleteAssignment(
    id: string,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid assignment ID format.');
    }

    const doc = await Assignment.findById(id);
    if (!doc) {
      throw new NotFoundError('Assignment not found.');
    }

    await this.verifyTeacherOrAdmin(actorId, actorRoles, doc.courseId.toString(), doc.batchId.toString());

    await AssignmentSubmission.deleteMany({ assignmentId: doc._id });
    await Assignment.findByIdAndDelete(id);
  }

  // ====================================================
  // 2. SUBMISSION ENGINE
  // ====================================================

  static async submitAssignment(
    assignmentId: string,
    dto: SubmitAssignmentDto,
    studentId: string,
  ): Promise<IAssignmentSubmission> {
    if (!mongoose.Types.ObjectId.isValid(assignmentId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      throw new ValidationError('Invalid assignment or student ID format.');
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundError('Assignment not found.');
    }

    if (assignment.status !== AssignmentStatus.PUBLISHED) {
      throw new ValidationError('This assignment is not accepting submissions.');
    }

    // Verify student active enrollment in cohort (IDOR protection)
    const isEnrolled = await this.verifyStudentEnrollment(studentId, assignment.batchId.toString());
    if (!isEnrolled) {
      throw new ForbiddenError('You must be actively enrolled in this cohort to submit coursework.');
    }

    const now = new Date();

    // Check if open
    if (now.getTime() < assignment.publishDate.getTime()) {
      throw new ValidationError('This assignment is not yet open for submissions.');
    }

    // Check deadlines
    const isLate = now.getTime() > assignment.dueDate.getTime();
    if (isLate && !assignment.allowLateSubmission) {
      throw new ValidationError('Late submissions are not accepted for this assignment.');
    }

    if (assignment.closesAt && now.getTime() > assignment.closesAt.getTime()) {
      throw new ValidationError('The submission window for this assignment has permanently closed.');
    }

    // Check existing attempts
    const existingSubmissions = await AssignmentSubmission.find({
      assignmentId: new mongoose.Types.ObjectId(assignmentId),
      studentId: new mongoose.Types.ObjectId(studentId),
    }).sort({ attemptNumber: 1 });

    const currentAttempts = existingSubmissions.length;
    if (currentAttempts >= assignment.maxAttempts) {
      throw new ValidationError(
        `Maximum attempt limit (${assignment.maxAttempts}) reached for this assignment.`,
      );
    }

    if (currentAttempts > 0 && !assignment.resubmissionAllowed && assignment.maxAttempts <= 1) {
      throw new ValidationError('Resubmission is not permitted for this assignment.');
    }

    const attemptNumber = currentAttempts + 1;

    // Private file uploads disablement enforcement — PRD §103, §104
    if (!getEnv().FEATURE_PRIVATE_FILE_UPLOADS) {
      if (dto.attachments && dto.attachments.length > 0) {
        throw new PrivateFileUploadsDisabledError(
          'Assignment file attachments are disabled during the controlled beta phase.'
        );
      }
      if (assignment.submissionType === SubmissionType.FILE) {
        throw new PrivateFileUploadsDisabledError(
          'File-based assignment submissions are disabled during the controlled beta phase. Please submit text or project links where permitted.'
        );
      }
      if (dto.url && dto.url.trim()) {
        const urlStr = dto.url.trim().toLowerCase();
        if (
          urlStr.match(/\.(pdf|docx?|zip|tar|gz|rar|7z|png|jpe?g|webp)(\?.*)?$/i) ||
          urlStr.startsWith('data:') ||
          urlStr.startsWith('blob:')
        ) {
          throw new PrivateFileUploadsDisabledError(
            'Direct file download links are not permitted as assignment submissions during beta. Use ordinary repository/project references or text submissions.'
          );
        }
      }
    }

    // Validate submission format matches assignment requirement
    const subType = dto.submissionType || assignment.submissionType;
    if (assignment.submissionType === SubmissionType.TEXT && !dto.textContent?.trim()) {
      throw new ValidationError('Text answer is required for this assignment.');
    }
    if (assignment.submissionType === SubmissionType.FILE && (!dto.attachments || dto.attachments.length === 0)) {
      throw new ValidationError('File attachment is required for this assignment.');
    }
    if (assignment.submissionType === SubmissionType.URL && !dto.url?.trim()) {
      throw new ValidationError('Project URL is required for this assignment.');
    }

    const doc = new AssignmentSubmission({
      assignmentId: new mongoose.Types.ObjectId(assignmentId),
      studentId: new mongoose.Types.ObjectId(studentId),
      attemptNumber,
      submissionType: subType,
      textContent: dto.textContent?.trim() ?? null,
      attachments: dto.attachments || [],
      url: dto.url?.trim() ?? null,
      submittedAt: now,
      isLate,
      status: isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED,
    });

    await doc.save();
    return toIAssignmentSubmission(doc);
  }

  static async getMySubmissions(
    assignmentId: string,
    studentId: string,
  ): Promise<IAssignmentSubmission[]> {
    if (!mongoose.Types.ObjectId.isValid(assignmentId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      throw new ValidationError('Invalid ID format.');
    }

    const docs = await AssignmentSubmission.find({
      assignmentId: new mongoose.Types.ObjectId(assignmentId),
      studentId: new mongoose.Types.ObjectId(studentId),
    }).sort({ attemptNumber: -1 });

    return docs.map(toIAssignmentSubmission);
  }

  static async getAssignmentSubmissions(
    assignmentId: string,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<IAssignmentSubmission[]> {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      throw new ValidationError('Invalid assignment ID format.');
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundError('Assignment not found.');
    }

    await this.verifyTeacherOrAdmin(actorId, actorRoles, assignment.courseId.toString(), assignment.batchId.toString());

    const docs = await AssignmentSubmission.find({
      assignmentId: new mongoose.Types.ObjectId(assignmentId),
    }).sort({ submittedAt: -1 });

    return docs.map(toIAssignmentSubmission);
  }

  static async getSubmissionById(
    submissionId: string,
    user: IUser,
    activeRole: UserRole,
  ): Promise<IAssignmentSubmission> {
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      throw new ValidationError('Invalid submission ID format.');
    }

    const submission = await AssignmentSubmission.findById(submissionId);
    if (!submission) {
      throw new NotFoundError('Submission not found.');
    }

    const isStudent = activeRole === UserRole.STUDENT;
    if (isStudent && submission.studentId.toString() !== user._id) {
      throw new ForbiddenError('You can only view your own coursework submissions.');
    }

    if (!isStudent) {
      const assignment = await Assignment.findById(submission.assignmentId);
      if (assignment) {
        await this.verifyTeacherOrAdmin(user._id, user.roles, assignment.courseId.toString(), assignment.batchId.toString());
      }
    }

    return toIAssignmentSubmission(submission);
  }

  static async reviewSubmission(
    submissionId: string,
    dto: ReviewSubmissionDto,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<IAssignmentSubmission> {
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      throw new ValidationError('Invalid submission ID format.');
    }

    const submission = await AssignmentSubmission.findById(submissionId);
    if (!submission) {
      throw new NotFoundError('Submission not found.');
    }

    const assignment = await Assignment.findById(submission.assignmentId);
    if (!assignment) {
      throw new NotFoundError('Associated assignment not found.');
    }

    await this.verifyTeacherOrAdmin(actorId, actorRoles, assignment.courseId.toString(), assignment.batchId.toString());

    if (dto.score !== undefined && dto.score !== null) {
      if (dto.score < 0 || dto.score > assignment.totalMarks) {
        throw new ValidationError(`Score must be between 0 and total marks (${assignment.totalMarks}).`);
      }
      submission.score = dto.score;
    }

    if (dto.feedback !== undefined) submission.feedback = dto.feedback?.trim() ?? null;
    if (dto.privateNotes !== undefined) submission.privateNotes = dto.privateNotes?.trim() ?? null;
    if (dto.feedbackAttachments !== undefined) submission.feedbackAttachments = dto.feedbackAttachments;
    if (dto.status !== undefined) submission.status = dto.status;

    submission.reviewedBy = new mongoose.Types.ObjectId(actorId);
    submission.reviewedAt = new Date();

    await submission.save();
    return toIAssignmentSubmission(submission);
  }
}
