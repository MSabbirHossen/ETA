import mongoose from 'mongoose';
import {
  Lesson,
  toILesson,
  type LessonDocument,
} from './lesson.model.js';
import {
  LearningMaterial,
  toILearningMaterial,
  type MaterialDocument,
} from './material.model.js';
import {
  ClassSession,
  toIClassSession,
  type ClassSessionDocument,
} from './class-session.model.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Subject } from '../academic/subject.model.js';
import { Module } from '../academic/module.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { User } from '../users/user.model.js';
import { NotificationDispatcher } from '../communication/notification-dispatcher.js';
import { RAGIngestionService } from '../ai/rag/rag-ingestion.service.js';
import { AIIndexSyncService } from '../ai/services/sync.service.js';
import {
  UserRole,
  LessonStatus,
  LessonVisibility,
  MaterialStatus,
  MaterialVisibility,
  ClassStatus,
  EnrollmentStatus,
  type ILesson,
  type ILearningMaterial,
  type IClassSession,
  type CreateLessonDto,
  type UpdateLessonDto,
  type CreateMaterialDto,
  type UpdateMaterialDto,
  type CreateClassSessionDto,
  type UpdateClassSessionDto,
  type IUser,
} from '@eta/types';
import { slugify } from '@eta/utils';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../../common/errors.js';


export class LearningService {
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
      throw new ForbiddenError('You must be a teacher or administrator to manage course delivery.');
    }

    // Check if teacher is assigned to the course
    let isAssigned = false;
    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      const course = await Course.findById(courseId).select('teacherIds').lean();
      if (course && course.teacherIds?.some((id) => id.toString() === actorId)) {
        isAssigned = true;
      }
    }

    // Or check if teacher is assigned to the batch
    if (!isAssigned && batchId && mongoose.Types.ObjectId.isValid(batchId)) {
      const batch = await Batch.findById(batchId).select('teacherIds').lean();
      if (batch && batch.teacherIds?.some((id) => id.toString() === actorId)) {
        isAssigned = true;
      }
    }

    if (!isAssigned && (courseId || batchId)) {
      throw new ForbiddenError('You are not assigned to teach this course or batch.');
    }
  }

  // ----------------------------------------------------
  // Helper: Verify Student Active Enrollment in Course / Batch
  // ----------------------------------------------------
  private static async verifyStudentEnrollment(studentId: string, courseId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(courseId)) {
      return false;
    }
    const enrollment = await Enrollment.findOne({
      studentId: new mongoose.Types.ObjectId(studentId),
      courseId: new mongoose.Types.ObjectId(courseId),
      status: EnrollmentStatus.ACTIVE,
    }).lean();

    return !!enrollment;
  }

  // ====================================================
  // 1. LESSON MANAGEMENT (PRD §18)
  // ====================================================

  static async createLesson(
    dto: CreateLessonDto,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<ILesson> {
    if (!mongoose.Types.ObjectId.isValid(dto.moduleId)) {
      throw new ValidationError('Invalid module ID format.');
    }

    const parentModule = await Module.findById(dto.moduleId);
    if (!parentModule) {
      throw new NotFoundError('Module not found.');
    }

    // Look up subject & course to denormalize for fast indexed querying
    const subject = await Subject.findById(parentModule.subjectId);
    const courseId = subject ? subject.courseId.toString() : null;
    const subjectId = parentModule.subjectId.toString();

    // Verify teacher assignment
    await this.verifyTeacherOrAdmin(actorId, actorRoles, courseId);

    const baseSlug = dto.slug ? slugify(dto.slug) : slugify(dto.title);
    let finalSlug = baseSlug;

    const existingSlug = await Lesson.findOne({
      moduleId: new mongoose.Types.ObjectId(dto.moduleId),
      slug: finalSlug,
    });
    if (existingSlug) {
      finalSlug = `${baseSlug}-${Date.now().toString(36)}`;
    }

    const doc = new Lesson({
      moduleId: new mongoose.Types.ObjectId(dto.moduleId),
      subjectId: subjectId ? new mongoose.Types.ObjectId(subjectId) : null,
      courseId: courseId ? new mongoose.Types.ObjectId(courseId) : null,
      title: dto.title.trim(),
      slug: finalSlug,
      description: dto.description?.trim() ?? null,
      sequenceOrder: dto.sequenceOrder ?? 1,
      lessonType: dto.lessonType,
      estimatedDurationMinutes: dto.estimatedDurationMinutes ?? null,
      bodyContent: dto.bodyContent ?? null,
      videoUrl: dto.videoUrl ?? null,
      recordingUrl: dto.recordingUrl ?? null,
      attachments: dto.attachments || [],
      learningObjectives: dto.learningObjectives || [],
      publishedAt: dto.status === LessonStatus.PUBLISHED ? (dto.publishedAt ? new Date(dto.publishedAt) : new Date()) : null,
      completionRule: dto.completionRule ?? null,
      status: dto.status,
      visibility: dto.visibility,
    });

    await doc.save();
    if (doc.status === LessonStatus.PUBLISHED) {
      RAGIngestionService.ingestLesson(doc._id.toString()).catch((err) => {
        console.error(`[RAGSync] Failed to ingest lesson ${doc._id}:`, err);
      });
    }
    return toILesson(doc);
  }

  static async getLessons(
    query: {
      moduleId?: string;
      subjectId?: string;
      courseId?: string;
      status?: LessonStatus;
    },
    user?: IUser,
    activeRole?: UserRole,
  ): Promise<ILesson[]> {
    const filter: Record<string, any> = {};

    if (query.moduleId && mongoose.Types.ObjectId.isValid(query.moduleId)) {
      filter.moduleId = new mongoose.Types.ObjectId(query.moduleId);
    }
    if (query.subjectId && mongoose.Types.ObjectId.isValid(query.subjectId)) {
      filter.subjectId = new mongoose.Types.ObjectId(query.subjectId);
    }
    if (query.courseId && mongoose.Types.ObjectId.isValid(query.courseId)) {
      filter.courseId = new mongoose.Types.ObjectId(query.courseId);
    }

    const isStudent = activeRole === UserRole.STUDENT;
    const isTeacher = activeRole === UserRole.TEACHER;
    const isAdmin = activeRole === UserRole.ADMIN || activeRole === UserRole.SUPER_ADMIN;

    if (isStudent || (!isAdmin && !isTeacher)) {
      // Students only see published lessons
      filter.status = LessonStatus.PUBLISHED;
    } else if (query.status) {
      filter.status = query.status;
    }

    const docs = await Lesson.find(filter).sort({ sequenceOrder: 1, createdAt: 1 });
    return docs.map(toILesson);
  }

  static async getLessonById(
    id: string,
    user?: IUser,
    activeRole?: UserRole,
  ): Promise<ILesson> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid lesson ID format.');
    }

    const doc = await Lesson.findById(id);
    if (!doc) {
      throw new NotFoundError('Lesson not found.');
    }

    const isStudent = activeRole === UserRole.STUDENT;
    const isAdmin = activeRole === UserRole.ADMIN || activeRole === UserRole.SUPER_ADMIN;
    const isTeacher = activeRole === UserRole.TEACHER;

    if (isStudent) {
      // Protect draft/unpublished lessons
      if (doc.status !== LessonStatus.PUBLISHED) {
        throw new NotFoundError('Lesson not found or unpublished.');
      }

      // Check enrollment entitlement if visibility is enrollment-only
      if (doc.visibility === LessonVisibility.ENROLLMENT_ONLY && doc.courseId && user) {
        const isEnrolled = await this.verifyStudentEnrollment(user._id, doc.courseId.toString());
        if (!isEnrolled) {
          throw new ForbiddenError('You must be actively enrolled in this course to access this lesson.');
        }
      }
    }

    return toILesson(doc);
  }

  static async updateLesson(
    id: string,
    dto: UpdateLessonDto,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<ILesson> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid lesson ID format.');
    }

    const doc = await Lesson.findById(id);
    if (!doc) {
      throw new NotFoundError('Lesson not found.');
    }

    // Verify teacher assignment
    await this.verifyTeacherOrAdmin(actorId, actorRoles, doc.courseId?.toString());

    if (dto.title !== undefined) doc.title = dto.title.trim();
    if (dto.slug !== undefined) doc.slug = slugify(dto.slug);
    if (dto.description !== undefined) doc.description = dto.description?.trim() ?? null;
    if (dto.sequenceOrder !== undefined) doc.sequenceOrder = dto.sequenceOrder;
    if (dto.lessonType !== undefined) doc.lessonType = dto.lessonType;
    if (dto.estimatedDurationMinutes !== undefined) doc.estimatedDurationMinutes = dto.estimatedDurationMinutes ?? null;
    if (dto.bodyContent !== undefined) doc.bodyContent = dto.bodyContent ?? null;
    if (dto.videoUrl !== undefined) doc.videoUrl = dto.videoUrl ?? null;
    if (dto.recordingUrl !== undefined) doc.recordingUrl = dto.recordingUrl ?? null;
    if (dto.attachments !== undefined) doc.attachments = dto.attachments;
    if (dto.learningObjectives !== undefined) doc.learningObjectives = dto.learningObjectives;
    if (dto.completionRule !== undefined) doc.completionRule = dto.completionRule ?? null;
    if (dto.visibility !== undefined) doc.visibility = dto.visibility;

    if (dto.status !== undefined) {
      doc.status = dto.status;
      if (dto.status === LessonStatus.PUBLISHED && !doc.publishedAt) {
        doc.publishedAt = new Date();
      }
    }

    await doc.save();
    if (doc.status === LessonStatus.PUBLISHED) {
      RAGIngestionService.ingestLesson(doc._id.toString()).catch((err) => {
        void AIIndexSyncService.recordFailure('LESSON', doc._id.toString(), 'INGEST', err);
      });
    } else {
      RAGIngestionService.purgeSource(doc._id.toString(), 'LESSON').catch((err) => {
        void AIIndexSyncService.recordFailure('LESSON', doc._id.toString(), 'PURGE', err);
      });
    }
    return toILesson(doc);
  }

  static async deleteLesson(
    id: string,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid lesson ID format.');
    }

    const doc = await Lesson.findById(id);
    if (!doc) {
      throw new NotFoundError('Lesson not found.');
    }

    await this.verifyTeacherOrAdmin(actorId, actorRoles, doc.courseId?.toString());
    await Lesson.findByIdAndDelete(id);
    RAGIngestionService.purgeSource(id, 'LESSON').catch((err) => {
      void AIIndexSyncService.recordFailure('LESSON', id, 'PURGE', err);
    });
  }

  // ====================================================
  // 2. LEARNING MATERIALS (PRD §19)
  // ====================================================

  static async createMaterial(
    dto: CreateMaterialDto,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<ILearningMaterial> {
    let courseId = dto.courseId || null;
    let moduleId = dto.moduleId || null;

    if (dto.lessonId) {
      if (!mongoose.Types.ObjectId.isValid(dto.lessonId)) {
        throw new ValidationError('Invalid lesson ID format.');
      }
      const lesson = await Lesson.findById(dto.lessonId);
      if (!lesson) {
        throw new NotFoundError('Associated lesson not found.');
      }
      moduleId = lesson.moduleId.toString();
      courseId = lesson.courseId ? lesson.courseId.toString() : courseId;
    }

    // Verify teacher assignment
    await this.verifyTeacherOrAdmin(actorId, actorRoles, courseId);

    const doc = new LearningMaterial({
      lessonId: dto.lessonId ? new mongoose.Types.ObjectId(dto.lessonId) : null,
      courseId: courseId ? new mongoose.Types.ObjectId(courseId) : null,
      moduleId: moduleId ? new mongoose.Types.ObjectId(moduleId) : null,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? null,
      type: dto.type,
      url: dto.url.trim(),
      fileSize: dto.fileSize ?? null,
      mimeType: dto.mimeType ?? null,
      uploadedBy: new mongoose.Types.ObjectId(actorId),
      downloadable: dto.downloadable ?? true,
      visibility: dto.visibility ?? MaterialVisibility.ENROLLMENT_ONLY,
      status: dto.status ?? MaterialStatus.PUBLISHED,
    });

    await doc.save();
    if (doc.status === MaterialStatus.PUBLISHED) {
      RAGIngestionService.ingestMaterial(doc._id.toString()).catch((err) => {
        console.error(`[RAGSync] Failed to ingest material ${doc._id}:`, err);
      });
    }
    return toILearningMaterial(doc);
  }

  static async getMaterials(
    query: {
      lessonId?: string;
      courseId?: string;
      moduleId?: string;
    },
    user?: IUser,
    activeRole?: UserRole,
  ): Promise<ILearningMaterial[]> {
    const filter: Record<string, any> = {};

    if (query.lessonId && mongoose.Types.ObjectId.isValid(query.lessonId)) {
      filter.lessonId = new mongoose.Types.ObjectId(query.lessonId);
    }
    if (query.courseId && mongoose.Types.ObjectId.isValid(query.courseId)) {
      filter.courseId = new mongoose.Types.ObjectId(query.courseId);
    }
    if (query.moduleId && mongoose.Types.ObjectId.isValid(query.moduleId)) {
      filter.moduleId = new mongoose.Types.ObjectId(query.moduleId);
    }

    const isStudent = activeRole === UserRole.STUDENT;
    const isAdmin = activeRole === UserRole.ADMIN || activeRole === UserRole.SUPER_ADMIN;
    const isTeacher = activeRole === UserRole.TEACHER;

    if (isStudent || (!isAdmin && !isTeacher)) {
      filter.status = MaterialStatus.PUBLISHED;
    }

    const docs = await LearningMaterial.find(filter).sort({ createdAt: -1 });
    return docs.map(toILearningMaterial);
  }

  static async getMaterialById(
    id: string,
    user?: IUser,
    activeRole?: UserRole,
  ): Promise<ILearningMaterial> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid material ID format.');
    }

    const doc = await LearningMaterial.findById(id);
    if (!doc) {
      throw new NotFoundError('Learning material not found.');
    }

    const isStudent = activeRole === UserRole.STUDENT;

    if (isStudent) {
      if (doc.status !== MaterialStatus.PUBLISHED) {
        throw new NotFoundError('Learning material not found or unpublished.');
      }
      if (doc.visibility === MaterialVisibility.ENROLLMENT_ONLY && doc.courseId && user) {
        const isEnrolled = await this.verifyStudentEnrollment(user._id, doc.courseId.toString());
        if (!isEnrolled) {
          throw new ForbiddenError('Active course enrollment required to access this material.');
        }
      }
    }

    return toILearningMaterial(doc);
  }

  static async updateMaterial(
    id: string,
    dto: UpdateMaterialDto,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<ILearningMaterial> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid material ID format.');
    }

    const doc = await LearningMaterial.findById(id);
    if (!doc) {
      throw new NotFoundError('Learning material not found.');
    }

    await this.verifyTeacherOrAdmin(actorId, actorRoles, doc.courseId?.toString());

    if (dto.title !== undefined) doc.title = dto.title.trim();
    if (dto.description !== undefined) doc.description = dto.description?.trim() ?? null;
    if (dto.type !== undefined) doc.type = dto.type;
    if (dto.url !== undefined) doc.url = dto.url.trim();
    if (dto.fileSize !== undefined) doc.fileSize = dto.fileSize ?? null;
    if (dto.mimeType !== undefined) doc.mimeType = dto.mimeType ?? null;
    if (dto.downloadable !== undefined) doc.downloadable = dto.downloadable;
    if (dto.visibility !== undefined) doc.visibility = dto.visibility;
    if (dto.status !== undefined) doc.status = dto.status;

    await doc.save();
    if (doc.status === MaterialStatus.PUBLISHED) {
      RAGIngestionService.ingestMaterial(doc._id.toString()).catch((err) => {
        void AIIndexSyncService.recordFailure('MATERIAL', doc._id.toString(), 'INGEST', err);
      });
    } else {
      RAGIngestionService.purgeSource(doc._id.toString(), 'MATERIAL').catch((err) => {
        void AIIndexSyncService.recordFailure('MATERIAL', doc._id.toString(), 'PURGE', err);
      });
    }
    return toILearningMaterial(doc);
  }

  static async deleteMaterial(
    id: string,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid material ID format.');
    }

    const doc = await LearningMaterial.findById(id);
    if (!doc) {
      throw new NotFoundError('Learning material not found.');
    }

    await this.verifyTeacherOrAdmin(actorId, actorRoles, doc.courseId?.toString());
    await LearningMaterial.findByIdAndDelete(id);
    RAGIngestionService.purgeSource(id, 'MATERIAL').catch((err) => {
      void AIIndexSyncService.recordFailure('MATERIAL', id, 'PURGE', err);
    });
  }

  // ====================================================
  // 3. LIVE & SCHEDULED CLASS SESSIONS (PRD §21)
  // ====================================================

  static async createClassSession(
    dto: CreateClassSessionDto,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<IClassSession> {
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

    // Teacher ID resolution
    const targetTeacherId = dto.teacherId || actorId;
    if (!mongoose.Types.ObjectId.isValid(targetTeacherId)) {
      throw new ValidationError('Invalid teacher ID format.');
    }

    const teacherUser = await User.findById(targetTeacherId);
    if (!teacherUser || !teacherUser.roles.includes(UserRole.TEACHER)) {
      throw new ValidationError('Assigned user must exist and possess the TEACHER role.');
    }

    // Verify creator authorization
    await this.verifyTeacherOrAdmin(actorId, actorRoles, dto.courseId, dto.batchId);

    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);
    if (end.getTime() <= start.getTime()) {
      throw new ValidationError('Class scheduled end time must be after scheduled start time.');
    }

    const doc = new ClassSession({
      title: dto.title.trim(),
      batchId: new mongoose.Types.ObjectId(dto.batchId),
      courseId: new mongoose.Types.ObjectId(dto.courseId),
      subjectId: dto.subjectId && mongoose.Types.ObjectId.isValid(dto.subjectId) ? new mongoose.Types.ObjectId(dto.subjectId) : null,
      moduleId: dto.moduleId && mongoose.Types.ObjectId.isValid(dto.moduleId) ? new mongoose.Types.ObjectId(dto.moduleId) : null,
      lessonId: dto.lessonId && mongoose.Types.ObjectId.isValid(dto.lessonId) ? new mongoose.Types.ObjectId(dto.lessonId) : null,
      teacherId: new mongoose.Types.ObjectId(targetTeacherId),
      scheduledStart: start,
      scheduledEnd: end,
      timezone: dto.timezone || 'Asia/Riyadh',
      platform: dto.platform,
      meetingUrl: dto.meetingUrl ?? null,
      meetingId: dto.meetingId ?? null,
      meetingPassword: dto.meetingPassword ?? null,
      description: dto.description?.trim() ?? null,
      attachments: dto.attachments || [],
      attendanceRequirement: dto.attendanceRequirement ?? true,
      recordingUrl: dto.recordingUrl ?? null,
      status: dto.status ?? ClassStatus.SCHEDULED,
    });

    await doc.save();
    const result = toIClassSession(doc);

    // Side-effect: dispatch notification to cohort students and teacher
    NotificationDispatcher.dispatchClassScheduled(result).catch((err) => {
      console.error('[LearningService] Notification dispatch failed:', err?.message || err);
    });

    return result;
  }

  static async getClassSessions(
    query: {
      batchId?: string;
      courseId?: string;
      teacherId?: string;
      status?: ClassStatus;
    },
    user?: IUser,
    activeRole?: UserRole,
  ): Promise<IClassSession[]> {
    const filter: Record<string, any> = {};

    const isStudent = activeRole === UserRole.STUDENT;
    const isTeacher = activeRole === UserRole.TEACHER;
    const isAdmin = activeRole === UserRole.ADMIN || activeRole === UserRole.SUPER_ADMIN;

    if (isStudent && user) {
      // Find all active batch enrollments for this student (IDOR protection)
      const enrollments = await Enrollment.find({
        studentId: new mongoose.Types.ObjectId(user._id),
        status: EnrollmentStatus.ACTIVE,
      }).select('batchId');

      const enrolledBatchIds = enrollments.map((e) => e.batchId);
      filter.batchId = { $in: enrolledBatchIds };
    } else {
      if (query.batchId && mongoose.Types.ObjectId.isValid(query.batchId)) {
        filter.batchId = new mongoose.Types.ObjectId(query.batchId);
      }
      if (query.courseId && mongoose.Types.ObjectId.isValid(query.courseId)) {
        filter.courseId = new mongoose.Types.ObjectId(query.courseId);
      }
      if (query.teacherId && mongoose.Types.ObjectId.isValid(query.teacherId)) {
        filter.teacherId = new mongoose.Types.ObjectId(query.teacherId);
      } else if (isTeacher && user && !query.batchId && !query.courseId) {
        filter.teacherId = new mongoose.Types.ObjectId(user._id);
      }
    }

    if (query.status) {
      filter.status = query.status;
    }

    const docs = await ClassSession.find(filter).sort({ scheduledStart: 1 });
    return docs.map(toIClassSession);
  }

  static async getClassSessionById(
    id: string,
    user?: IUser,
    activeRole?: UserRole,
  ): Promise<IClassSession> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid class session ID format.');
    }

    const doc = await ClassSession.findById(id);
    if (!doc) {
      throw new NotFoundError('Class session not found.');
    }

    const isStudent = activeRole === UserRole.STUDENT;
    if (isStudent && user) {
      // Verify student is enrolled in the session's batch
      const isEnrolled = await Enrollment.findOne({
        studentId: new mongoose.Types.ObjectId(user._id),
        batchId: doc.batchId,
        status: EnrollmentStatus.ACTIVE,
      });

      if (!isEnrolled) {
        throw new ForbiddenError('You are not enrolled in the cohort scheduled for this class session.');
      }
    }

    return toIClassSession(doc);
  }

  static async updateClassSession(
    id: string,
    dto: UpdateClassSessionDto,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<IClassSession> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid class session ID format.');
    }

    const doc = await ClassSession.findById(id);
    if (!doc) {
      throw new NotFoundError('Class session not found.');
    }

    await this.verifyTeacherOrAdmin(actorId, actorRoles, doc.courseId.toString(), doc.batchId.toString());

    if (dto.title !== undefined) doc.title = dto.title.trim();
    if (dto.description !== undefined) doc.description = dto.description?.trim() ?? null;
    if (dto.platform !== undefined) doc.platform = dto.platform;
    if (dto.meetingUrl !== undefined) doc.meetingUrl = dto.meetingUrl ?? null;
    if (dto.meetingId !== undefined) doc.meetingId = dto.meetingId ?? null;
    if (dto.meetingPassword !== undefined) doc.meetingPassword = dto.meetingPassword ?? null;
    if (dto.scheduledStart !== undefined) doc.scheduledStart = new Date(dto.scheduledStart);
    if (dto.scheduledEnd !== undefined) doc.scheduledEnd = new Date(dto.scheduledEnd);
    if (dto.timezone !== undefined) doc.timezone = dto.timezone;
    if (dto.attachments !== undefined) doc.attachments = dto.attachments;
    if (dto.attendanceRequirement !== undefined) doc.attendanceRequirement = dto.attendanceRequirement;
    if (dto.recordingUrl !== undefined) doc.recordingUrl = dto.recordingUrl ?? null;
    if (dto.status !== undefined) doc.status = dto.status;

    if (doc.scheduledEnd.getTime() <= doc.scheduledStart.getTime()) {
      throw new ValidationError('Scheduled end time must be after start time.');
    }

    await doc.save();
    return toIClassSession(doc);
  }

  static async cancelClassSession(
    id: string,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<IClassSession> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid class session ID format.');
    }

    const doc = await ClassSession.findById(id);
    if (!doc) {
      throw new NotFoundError('Class session not found.');
    }

    await this.verifyTeacherOrAdmin(actorId, actorRoles, doc.courseId.toString(), doc.batchId.toString());
    doc.status = ClassStatus.CANCELLED;
    await doc.save();
    const result = toIClassSession(doc);

    // Side-effect: dispatch cancellation notification
    NotificationDispatcher.dispatchClassCancelled(result).catch((err) => {
      console.error('[LearningService] Notification dispatch failed:', err?.message || err);
    });

    return result;
  }

  static async deleteClassSession(
    id: string,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid class session ID format.');
    }

    const doc = await ClassSession.findById(id);
    if (!doc) {
      throw new NotFoundError('Class session not found.');
    }

    await this.verifyTeacherOrAdmin(actorId, actorRoles, doc.courseId.toString(), doc.batchId.toString());
    await ClassSession.findByIdAndDelete(id);
  }
}
