import type { Request, Response, NextFunction } from 'express';
import { academicService } from './academic.service.js';
import { sendSuccess } from '../../common/response.js';
import { ForbiddenError, UnauthorizedError, ValidationError } from '../../common/errors.js';
import { UserRole } from '@eta/types';

export class AcademicController {
  // ----------------------------------------------------
  // Programs
  // ----------------------------------------------------

  async createProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const program = await academicService.createProgram(req.body);
      sendSuccess(res, program, 'Program created successfully', undefined, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const program = await academicService.updateProgram(req.params.id as string, req.body);
      sendSuccess(res, program, 'Program updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async getProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const program = await academicService.getProgram(req.params.idOrSlug as string);
      sendSuccess(res, program, 'Program retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async listPrograms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, category, page, limit } = req.query;
      const result = await academicService.listPrograms({
        status: status as any,
        category: category as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      sendSuccess(res, result.programs, 'Programs retrieved successfully', result.meta);
    } catch (err) {
      next(err);
    }
  }

  async deleteProgram(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await academicService.deleteProgram(req.params.id as string);
      sendSuccess(res, null, 'Program deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  // ----------------------------------------------------
  // Courses
  // ----------------------------------------------------

  async createCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const course = await academicService.createCourse(req.body);
      sendSuccess(res, course, 'Course created successfully', undefined, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const course = await academicService.updateCourse(req.params.id as string, req.body);
      sendSuccess(res, course, 'Course updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async getCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const course = await academicService.getCourse(req.params.idOrSlug as string);
      sendSuccess(res, course, 'Course retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async listCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { programId, status, level, page, limit } = req.query;
      const result = await academicService.listCourses({
        programId: programId as string,
        status: status as any,
        level: level as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      sendSuccess(res, result.courses, 'Courses retrieved successfully', result.meta);
    } catch (err) {
      next(err);
    }
  }

  async assignCourseTeachers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const course = await academicService.assignCourseTeachers(
        req.params.id as string,
        req.body.teacherIds,
      );
      sendSuccess(res, course, 'Teachers assigned to course successfully');
    } catch (err) {
      next(err);
    }
  }

  // ----------------------------------------------------
  // Batches
  // ----------------------------------------------------

  async createBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batch = await academicService.createBatch(req.body);
      sendSuccess(res, batch, 'Batch created successfully', undefined, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batch = await academicService.updateBatch(req.params.id as string, req.body);
      sendSuccess(res, batch, 'Batch updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async getBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batch = await academicService.getBatch(req.params.id as string);
      sendSuccess(res, batch, 'Batch retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async listBatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { courseId, status, page, limit } = req.query;
      const result = await academicService.listBatches({
        courseId: courseId as string,
        status: status as any,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      sendSuccess(res, result.batches, 'Batches retrieved successfully', result.meta);
    } catch (err) {
      next(err);
    }
  }

  async assignBatchTeachers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batch = await academicService.assignBatchTeachers(
        req.params.id as string,
        req.body.teacherIds,
      );
      sendSuccess(res, batch, 'Teachers assigned to batch successfully');
    } catch (err) {
      next(err);
    }
  }

  // ----------------------------------------------------
  // Subjects
  // ----------------------------------------------------

  async createSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = await academicService.createSubject(req.body);
      sendSuccess(res, subject, 'Subject created successfully', undefined, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = await academicService.updateSubject(req.params.id as string, req.body);
      sendSuccess(res, subject, 'Subject updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async getSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = await academicService.getSubject(req.params.id as string);
      sendSuccess(res, subject, 'Subject retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async listSubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const courseId = req.query.courseId as string;
      if (!courseId) {
        throw new ValidationError('courseId query parameter is required to list subjects');
      }
      const subjects = await academicService.listSubjects(courseId);
      sendSuccess(res, subjects, 'Subjects retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async assignSubjectTeachers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = await academicService.assignSubjectTeachers(
        req.params.id as string,
        req.body.teacherIds,
      );
      sendSuccess(res, subject, 'Teachers assigned to subject successfully');
    } catch (err) {
      next(err);
    }
  }

  // ----------------------------------------------------
  // Modules
  // ----------------------------------------------------

  async createModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mod = await academicService.createModule(req.body);
      sendSuccess(res, mod, 'Module created successfully', undefined, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mod = await academicService.updateModule(req.params.id as string, req.body);
      sendSuccess(res, mod, 'Module updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async getModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mod = await academicService.getModule(req.params.id as string);
      sendSuccess(res, mod, 'Module retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async listModules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subjectId = req.query.subjectId as string;
      if (!subjectId) {
        throw new ValidationError('subjectId query parameter is required to list modules');
      }
      const modules = await academicService.listModules(subjectId);
      sendSuccess(res, modules, 'Modules retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // ----------------------------------------------------
  // Enrollments
  // ----------------------------------------------------

  async createEnrollment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const enrollment = await academicService.createEnrollment(req.body);
      sendSuccess(res, enrollment, 'Student enrolled successfully', undefined, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateEnrollmentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const enrollment = await academicService.updateEnrollmentStatus(
        req.params.id as string,
        req.body.status,
      );
      sendSuccess(res, enrollment, 'Enrollment status updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async getEnrollment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const enrollment = await academicService.getEnrollment(req.params.id as string);

      // Student can only view their own enrollment unless admin/staff/super_admin
      const isPrivileged =
        req.user.roles.includes(UserRole.ADMIN) ||
        req.user.roles.includes(UserRole.STAFF) ||
        req.user.roles.includes(UserRole.SUPER_ADMIN);

      if (!isPrivileged && enrollment.studentId !== req.user._id.toString()) {
        throw new ForbiddenError('You do not have permission to view this enrollment record');
      }

      sendSuccess(res, enrollment, 'Enrollment retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async listEnrollments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId, courseId, batchId, status, page, limit } = req.query;
      const result = await academicService.listEnrollments({
        studentId: studentId as string,
        courseId: courseId as string,
        batchId: batchId as string,
        status: status as any,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      sendSuccess(res, result.enrollments, 'Enrollments retrieved successfully', result.meta);
    } catch (err) {
      next(err);
    }
  }

  async getMyEnrollments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const enrollments = await academicService.getStudentEnrollments(req.user._id.toString());
      sendSuccess(res, enrollments, 'Student enrollments retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const academicController = new AcademicController();
