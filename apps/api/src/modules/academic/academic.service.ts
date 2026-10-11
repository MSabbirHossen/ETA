import mongoose from 'mongoose';
import {
  Program,
  toIProgram,
  type ProgramDocument,
} from './program.model';
import {
  Course,
  toICourse,
  type CourseDocument,
} from './course.model';
import {
  Batch,
  toIBatch,
  type BatchDocument,
} from './batch.model';
import {
  Subject,
  toISubject,
  type SubjectDocument,
} from './subject.model';
import {
  Module,
  toIModule,
  type ModuleDocument,
} from './module.model';
import {
  Enrollment,
  toIEnrollment,
  type EnrollmentDocument,
} from './enrollment.model';
import { RAGIngestionService } from '../ai/rag/rag-ingestion.service.js';
import { AIIndexSyncService } from '../ai/services/sync.service.js';
import { User } from '../users/user.model';
import {
  UserRole,
  ProgramStatus,
  CourseStatus,
  BatchStatus,
  ModuleStatus,
  EnrollmentStatus,
  type IProgram,
  type ICourse,
  type IBatch,
  type ISubject,
  type IModule,
  type IEnrollment,
  type CreateProgramDto,
  type UpdateProgramDto,
  type CreateCourseDto,
  type UpdateCourseDto,
  type CreateBatchDto,
  type UpdateBatchDto,
  type CreateSubjectDto,
  type UpdateSubjectDto,
  type CreateModuleDto,
  type UpdateModuleDto,
  type CreateEnrollmentDto,
  type PaginationMeta,
} from '@eta/types';
import { slugify, calculatePaginationMeta } from '@eta/utils';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from '../../common/errors';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction, AuditCategory, AuditSeverity, AuditResult, AuditActorType } from '@eta/types';

export class AcademicService {
  // =========================================================================
  // PROGRAM SERVICES — PRD §13
  // =========================================================================

  async createProgram(dto: CreateProgramDto): Promise<IProgram> {
    const slug = slugify(dto.name);
    const existing = await Program.findOne({ slug });
    if (existing) {
      throw new ConflictError(`Program with slug '${slug}' already exists`);
    }

    const program = await Program.create({
      ...dto,
      slug,
      status: dto.status ?? ProgramStatus.DRAFT,
      certificateAvailability: dto.certificateAvailability ?? true,
      enrollmentStatus: dto.enrollmentStatus ?? 'open',
    });

    return toIProgram(program);
  }

  async updateProgram(id: string, dto: UpdateProgramDto): Promise<IProgram> {
    const program = await Program.findById(id);
    if (!program) {
      throw new NotFoundError(`Program not found with ID '${id}'`);
    }

    if (dto.name && dto.name !== program.name) {
      const newSlug = slugify(dto.name);
      const existing = await Program.findOne({ slug: newSlug, _id: { $ne: id } });
      if (existing) {
        throw new ConflictError(`Program with slug '${newSlug}' already exists`);
      }
      program.slug = newSlug;
    }

    Object.assign(program, dto);
    await program.save();
    return toIProgram(program);
  }

  async getProgram(idOrSlug: string): Promise<IProgram> {
    const isId = mongoose.Types.ObjectId.isValid(idOrSlug);
    const program = isId
      ? await Program.findById(idOrSlug)
      : await Program.findOne({ slug: idOrSlug });

    if (!program) {
      throw new NotFoundError(`Program '${idOrSlug}' not found`);
    }
    return toIProgram(program);
  }

  async listPrograms(query: {
    status?: ProgramStatus;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{ programs: IProgram[]; meta: PaginationMeta }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.category) filter.category = query.category;

    const [total, docs] = await Promise.all([
      Program.countDocuments(filter),
      Program.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    return {
      programs: docs.map(toIProgram),
      meta: calculatePaginationMeta(total, page, limit),
    };
  }

  async deleteProgram(id: string): Promise<void> {
    const program = await Program.findById(id);
    if (!program) {
      throw new NotFoundError(`Program not found with ID '${id}'`);
    }

    const linkedCourses = await Course.countDocuments({ programId: id });
    if (linkedCourses > 0) {
      throw new ValidationError(
        `Cannot delete program with ${linkedCourses} associated courses. Archive it instead.`,
      );
    }

    await program.deleteOne();
  }

  // =========================================================================
  // COURSE SERVICES — PRD §14
  // =========================================================================

  async createCourse(dto: CreateCourseDto): Promise<ICourse> {
    if (dto.programId) {
      const program = await Program.findById(dto.programId);
      if (!program) {
        throw new NotFoundError(`Referenced program '${dto.programId}' not found`);
      }
    }

    const slug = slugify(dto.title);
    const existingSlug = await Course.findOne({ slug });
    if (existingSlug) {
      throw new ConflictError(`Course with slug '${slug}' already exists`);
    }

    const existingCode = await Course.findOne({ code: dto.code.toUpperCase() });
    if (existingCode) {
      throw new ConflictError(`Course with code '${dto.code}' already exists`);
    }

    if (dto.teacherIds && dto.teacherIds.length > 0) {
      await this.validateTeachersExist(dto.teacherIds);
    }

    const course = await Course.create({
      ...dto,
      slug,
      code: dto.code.toUpperCase(),
      teacherIds: dto.teacherIds || [],
    });

    if (course.status === CourseStatus.ACTIVE) {
      RAGIngestionService.ingestCourse(course._id.toString()).catch((err) => {
        console.error(`[RAGSync] Failed to ingest course ${course._id}:`, err);
      });
    }

    return toICourse(course);
  }

  async updateCourse(id: string, dto: UpdateCourseDto): Promise<ICourse> {
    const course = await Course.findById(id);
    if (!course) {
      throw new NotFoundError(`Course not found with ID '${id}'`);
    }

    if (dto.programId && dto.programId !== (course.programId?.toString() ?? null)) {
      const program = await Program.findById(dto.programId);
      if (!program) {
        throw new NotFoundError(`Referenced program '${dto.programId}' not found`);
      }
    }

    if (dto.title && dto.title !== course.title) {
      const newSlug = slugify(dto.title);
      const existing = await Course.findOne({ slug: newSlug, _id: { $ne: id } });
      if (existing) {
        throw new ConflictError(`Course with slug '${newSlug}' already exists`);
      }
      course.slug = newSlug;
    }

    if (dto.code && dto.code.toUpperCase() !== course.code) {
      const newCode = dto.code.toUpperCase();
      const existing = await Course.findOne({ code: newCode, _id: { $ne: id } });
      if (existing) {
        throw new ConflictError(`Course with code '${newCode}' already exists`);
      }
      course.code = newCode;
    }

    if (dto.teacherIds) {
      await this.validateTeachersExist(dto.teacherIds);
    }

    Object.assign(course, dto);
    await course.save();

    if (course.status === CourseStatus.ACTIVE) {
      RAGIngestionService.ingestCourse(course._id.toString()).catch((err) => {
        void AIIndexSyncService.recordFailure('COURSE', course._id.toString(), 'INGEST', err);
      });
    } else {
      RAGIngestionService.purgeSource(course._id.toString(), 'COURSE').catch((err) => {
        void AIIndexSyncService.recordFailure('COURSE', course._id.toString(), 'PURGE', err);
      });
    }

    return toICourse(course);
  }

  async getCourse(idOrSlug: string): Promise<ICourse> {
    const isId = mongoose.Types.ObjectId.isValid(idOrSlug);
    const course = isId
      ? await Course.findById(idOrSlug)
      : await Course.findOne({ slug: idOrSlug });

    if (!course) {
      throw new NotFoundError(`Course '${idOrSlug}' not found`);
    }
    return toICourse(course);
  }

  async listCourses(query: {
    programId?: string;
    status?: CourseStatus;
    level?: string;
    page?: number;
    limit?: number;
  }): Promise<{ courses: ICourse[]; meta: PaginationMeta }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.programId) filter.programId = query.programId;
    if (query.status) filter.status = query.status;
    if (query.level) filter.level = query.level;

    const [total, docs] = await Promise.all([
      Course.countDocuments(filter),
      Course.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    return {
      courses: docs.map(toICourse),
      meta: calculatePaginationMeta(total, page, limit),
    };
  }

  async assignCourseTeachers(courseId: string, teacherIds: string[]): Promise<ICourse> {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new NotFoundError(`Course not found with ID '${courseId}'`);
    }

    await this.validateTeachersExist(teacherIds);

    course.teacherIds = teacherIds.map((id) => new mongoose.Types.ObjectId(id));
    await course.save();
    return toICourse(course);
  }

  // =========================================================================
  // BATCH / COHORT SERVICES — PRD §15
  // =========================================================================

  async createBatch(dto: CreateBatchDto): Promise<IBatch> {
    const course = await Course.findById(dto.courseId);
    if (!course) {
      throw new NotFoundError(`Course '${dto.courseId}' not found`);
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const enrollmentStart = new Date(dto.enrollmentStart);
    const enrollmentEnd = new Date(dto.enrollmentEnd);

    if (startDate >= endDate) {
      throw new ValidationError('Batch start date must be before end date');
    }
    if (enrollmentStart >= enrollmentEnd) {
      throw new ValidationError('Enrollment start date must be before enrollment end date');
    }

    const batchCode = dto.batchCode.toUpperCase();
    const existingCode = await Batch.findOne({ batchCode });
    if (existingCode) {
      throw new ConflictError(`Batch with code '${batchCode}' already exists`);
    }

    if (dto.teacherIds && dto.teacherIds.length > 0) {
      await this.validateTeachersExist(dto.teacherIds);
    }

    const batch = await Batch.create({
      ...dto,
      batchCode,
      startDate,
      endDate,
      enrollmentStart,
      enrollmentEnd,
      teacherIds: dto.teacherIds || [],
    });

    return toIBatch(batch);
  }

  async updateBatch(id: string, dto: UpdateBatchDto): Promise<IBatch> {
    const batch = await Batch.findById(id);
    if (!batch) {
      throw new NotFoundError(`Batch not found with ID '${id}'`);
    }

    if (dto.courseId && dto.courseId !== batch.courseId.toString()) {
      const course = await Course.findById(dto.courseId);
      if (!course) {
        throw new NotFoundError(`Course '${dto.courseId}' not found`);
      }
    }

    if (dto.batchCode && dto.batchCode.toUpperCase() !== batch.batchCode) {
      const newCode = dto.batchCode.toUpperCase();
      const existing = await Batch.findOne({ batchCode: newCode, _id: { $ne: id } });
      if (existing) {
        throw new ConflictError(`Batch with code '${newCode}' already exists`);
      }
      batch.batchCode = newCode;
    }

    if (dto.teacherIds) {
      await this.validateTeachersExist(dto.teacherIds);
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : batch.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : batch.endDate;
    if (startDate >= endDate) {
      throw new ValidationError('Batch start date must be before end date');
    }

    Object.assign(batch, dto);
    await batch.save();
    return toIBatch(batch);
  }

  async getBatch(id: string): Promise<IBatch> {
    const batch = await Batch.findById(id);
    if (!batch) {
      throw new NotFoundError(`Batch not found with ID '${id}'`);
    }
    return toIBatch(batch);
  }

  async listBatches(query: {
    courseId?: string;
    status?: BatchStatus;
    page?: number;
    limit?: number;
  }): Promise<{ batches: IBatch[]; meta: PaginationMeta }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.courseId) filter.courseId = query.courseId;
    if (query.status) filter.status = query.status;

    const [total, docs] = await Promise.all([
      Batch.countDocuments(filter),
      Batch.find(filter).sort({ startDate: -1 }).skip(skip).limit(limit),
    ]);

    return {
      batches: docs.map(toIBatch),
      meta: calculatePaginationMeta(total, page, limit),
    };
  }

  async assignBatchTeachers(batchId: string, teacherIds: string[]): Promise<IBatch> {
    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw new NotFoundError(`Batch not found with ID '${batchId}'`);
    }

    await this.validateTeachersExist(teacherIds);

    batch.teacherIds = teacherIds.map((id) => new mongoose.Types.ObjectId(id));
    await batch.save();
    return toIBatch(batch);
  }

  // =========================================================================
  // SUBJECT SERVICES — PRD §16
  // =========================================================================

  async createSubject(dto: CreateSubjectDto): Promise<ISubject> {
    const course = await Course.findById(dto.courseId);
    if (!course) {
      throw new NotFoundError(`Course '${dto.courseId}' not found`);
    }

    const code = dto.code.toUpperCase();
    const existing = await Subject.findOne({ courseId: dto.courseId, code });
    if (existing) {
      throw new ConflictError(`Subject code '${code}' already exists for this course`);
    }

    if (dto.teacherIds && dto.teacherIds.length > 0) {
      await this.validateTeachersExist(dto.teacherIds);
    }

    const subject = await Subject.create({
      ...dto,
      code,
      teacherIds: dto.teacherIds || [],
    });

    return toISubject(subject);
  }

  async updateSubject(id: string, dto: UpdateSubjectDto): Promise<ISubject> {
    const subject = await Subject.findById(id);
    if (!subject) {
      throw new NotFoundError(`Subject not found with ID '${id}'`);
    }

    if (dto.code && dto.code.toUpperCase() !== subject.code) {
      const code = dto.code.toUpperCase();
      const courseId = dto.courseId || subject.courseId;
      const existing = await Subject.findOne({ courseId, code, _id: { $ne: id } });
      if (existing) {
        throw new ConflictError(`Subject code '${code}' already exists for this course`);
      }
      subject.code = code;
    }

    if (dto.teacherIds) {
      await this.validateTeachersExist(dto.teacherIds);
    }

    Object.assign(subject, dto);
    await subject.save();
    return toISubject(subject);
  }

  async getSubject(id: string): Promise<ISubject> {
    const subject = await Subject.findById(id);
    if (!subject) {
      throw new NotFoundError(`Subject not found with ID '${id}'`);
    }
    return toISubject(subject);
  }

  async listSubjects(courseId: string): Promise<ISubject[]> {
    const docs = await Subject.find({ courseId }).sort({ sequence: 1, createdAt: 1 });
    return docs.map(toISubject);
  }

  async assignSubjectTeachers(subjectId: string, teacherIds: string[]): Promise<ISubject> {
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      throw new NotFoundError(`Subject not found with ID '${subjectId}'`);
    }

    await this.validateTeachersExist(teacherIds);

    subject.teacherIds = teacherIds.map((id) => new mongoose.Types.ObjectId(id));
    await subject.save();
    return toISubject(subject);
  }

  // =========================================================================
  // MODULE SERVICES — PRD §17
  // =========================================================================

  async createModule(dto: CreateModuleDto): Promise<IModule> {
    const subject = await Subject.findById(dto.subjectId);
    if (!subject) {
      throw new NotFoundError(`Subject '${dto.subjectId}' not found`);
    }

    if (dto.unlockRules?.prerequisiteModuleId) {
      const prereq = await Module.findById(dto.unlockRules.prerequisiteModuleId);
      if (!prereq) {
        throw new NotFoundError(
          `Prerequisite module '${dto.unlockRules.prerequisiteModuleId}' not found`,
        );
      }
    }

    const mod = await Module.create(dto);
    return toIModule(mod);
  }

  async updateModule(id: string, dto: UpdateModuleDto): Promise<IModule> {
    const mod = await Module.findById(id);
    if (!mod) {
      throw new NotFoundError(`Module not found with ID '${id}'`);
    }

    if (dto.unlockRules?.prerequisiteModuleId) {
      if (dto.unlockRules.prerequisiteModuleId === id) {
        throw new ValidationError('A module cannot have itself as a prerequisite');
      }
      const prereq = await Module.findById(dto.unlockRules.prerequisiteModuleId);
      if (!prereq) {
        throw new NotFoundError(
          `Prerequisite module '${dto.unlockRules.prerequisiteModuleId}' not found`,
        );
      }
    }

    Object.assign(mod, dto);
    await mod.save();
    return toIModule(mod);
  }

  async getModule(id: string): Promise<IModule> {
    const mod = await Module.findById(id);
    if (!mod) {
      throw new NotFoundError(`Module not found with ID '${id}'`);
    }
    return toIModule(mod);
  }

  async listModules(subjectId: string): Promise<IModule[]> {
    const docs = await Module.find({ subjectId }).sort({ sequence: 1, createdAt: 1 });
    return docs.map(toIModule);
  }

  // =========================================================================
  // ENROLLMENT SERVICES — PRD §41, §70
  // =========================================================================

  async createEnrollment(dto: CreateEnrollmentDto): Promise<IEnrollment> {
    const student = await User.findById(dto.studentId);
    if (!student) {
      throw new NotFoundError(`Student user '${dto.studentId}' not found`);
    }

    if (!student.roles.includes(UserRole.STUDENT)) {
      throw new ValidationError(
        `User '${dto.studentId}' does not hold the 'student' role. Only students can be enrolled.`,
      );
    }

    const course = await Course.findById(dto.courseId);
    if (!course) {
      throw new NotFoundError(`Course '${dto.courseId}' not found`);
    }

    const batch = await Batch.findById(dto.batchId);
    if (!batch) {
      throw new NotFoundError(`Batch '${dto.batchId}' not found`);
    }

    if (batch.courseId.toString() !== dto.courseId) {
      throw new ValidationError(
        `Batch '${dto.batchId}' does not belong to Course '${dto.courseId}'`,
      );
    }

    // Check duplicate enrollment per PRD §70
    const existing = await Enrollment.findOne({
      studentId: dto.studentId,
      batchId: dto.batchId,
    });
    if (existing) {
      throw new ConflictError(
        `Student '${dto.studentId}' is already enrolled in Batch '${dto.batchId}'`,
      );
    }

    // Check batch capacity
    const activeEnrollments = await Enrollment.countDocuments({
      batchId: dto.batchId,
      status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING] },
    });

    if (activeEnrollments >= batch.studentLimit) {
      throw new ValidationError(
        `Batch has reached its student capacity limit (${batch.studentLimit})`,
      );
    }

    const enrollment = await Enrollment.create({
      ...dto,
      status: dto.status ?? EnrollmentStatus.ACTIVE,
      enrollmentDate: new Date(),
      progress: {
        completionPercentage: 0,
      },
    });

    await AuditService.record({
      action: AuditAction.ENROLLMENT_CREATED,
      category: AuditCategory.ACADEMIC,
      resourceType: 'Enrollment',
      resourceId: enrollment._id.toString(),
      scope: {
        studentId: dto.studentId,
        courseId: dto.courseId,
        batchId: dto.batchId,
      },
      newValue: {
        studentId: dto.studentId,
        courseId: dto.courseId,
        batchId: dto.batchId,
        status: enrollment.status,
      },
      severity: AuditSeverity.MEDIUM,
      result: AuditResult.SUCCESS,
    });

    return toIEnrollment(enrollment);
  }

  async updateEnrollmentStatus(id: string, status: EnrollmentStatus): Promise<IEnrollment> {
    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      throw new NotFoundError(`Enrollment not found with ID '${id}'`);
    }

    const previousStatus = enrollment.status;
    enrollment.status = status;
    await enrollment.save();

    await AuditService.record({
      action: AuditAction.ENROLLMENT_STATUS_CHANGED,
      category: AuditCategory.ACADEMIC,
      resourceType: 'Enrollment',
      resourceId: enrollment._id.toString(),
      scope: {
        studentId: enrollment.studentId?.toString(),
        courseId: enrollment.courseId?.toString(),
        batchId: enrollment.batchId?.toString(),
      },
      previousValue: {
        status: previousStatus,
      },
      newValue: {
        status,
      },
      severity: AuditSeverity.MEDIUM,
      result: AuditResult.SUCCESS,
    });

    return toIEnrollment(enrollment);
  }

  async getEnrollment(id: string): Promise<IEnrollment> {
    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      throw new NotFoundError(`Enrollment not found with ID '${id}'`);
    }
    return toIEnrollment(enrollment);
  }

  async listEnrollments(query: {
    studentId?: string;
    courseId?: string;
    batchId?: string;
    status?: EnrollmentStatus;
    page?: number;
    limit?: number;
  }): Promise<{ enrollments: IEnrollment[]; meta: PaginationMeta }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.studentId) filter.studentId = query.studentId;
    if (query.courseId) filter.courseId = query.courseId;
    if (query.batchId) filter.batchId = query.batchId;
    if (query.status) filter.status = query.status;

    const [total, docs] = await Promise.all([
      Enrollment.countDocuments(filter),
      Enrollment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    return {
      enrollments: docs.map(toIEnrollment),
      meta: calculatePaginationMeta(total, page, limit),
    };
  }

  async getStudentEnrollments(studentId: string): Promise<IEnrollment[]> {
    const docs = await Enrollment.find({ studentId }).sort({ createdAt: -1 });
    return docs.map(toIEnrollment);
  }

  // =========================================================================
  // HELPER: Validate Teachers Exist & Hold TEACHER Role
  // =========================================================================

  private async validateTeachersExist(teacherIds: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(teacherIds));
    const users = await User.find({ _id: { $in: uniqueIds } });

    if (users.length !== uniqueIds.length) {
      throw new NotFoundError('One or more specified teacher users do not exist');
    }

    for (const user of users) {
      if (!user.roles.includes(UserRole.TEACHER) && !user.roles.includes(UserRole.SUPER_ADMIN)) {
        throw new ValidationError(
          `User '${user.name}' (${user._id}) does not hold the 'teacher' role`,
        );
      }
    }
  }
}

export const academicService = new AcademicService();
