import type { Request, Response, NextFunction } from 'express';
import { LearningService } from './learning.service.js';
import { sendSuccess } from '../../common/response.js';
import { UnauthorizedError } from '../../common/errors.js';
import type { LessonStatus, ClassStatus, IUser } from '@eta/types';

export class LearningController {
  // ====================================================
  // Lessons
  // ====================================================

  static async createLesson(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const lesson = await LearningService.createLesson(req.body, req.user._id.toString(), req.user.roles);
      return sendSuccess(res, lesson, 'Lesson created successfully', undefined, 201);
    } catch (err) {
      next(err);
    }
  }

  static async getLessons(req: Request, res: Response, next: NextFunction) {
    try {
      const lessons = await LearningService.getLessons(
        {
          moduleId: req.query.moduleId as string,
          subjectId: req.query.subjectId as string,
          courseId: req.query.courseId as string,
          status: req.query.status as LessonStatus,
        },
        req.user as unknown as IUser,
        req.user?.activeRole,
      );
      return sendSuccess(res, lessons, 'Lessons retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getLessonById(req: Request, res: Response, next: NextFunction) {
    try {
      const lesson = await LearningService.getLessonById(
        req.params.id as string,
        req.user as unknown as IUser,
        req.user?.activeRole,
      );
      return sendSuccess(res, lesson, 'Lesson details retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateLesson(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const lesson = await LearningService.updateLesson(
        req.params.id as string,
        req.body,
        req.user._id.toString(),
        req.user.roles,
      );
      return sendSuccess(res, lesson, 'Lesson updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteLesson(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      await LearningService.deleteLesson(req.params.id as string, req.user._id.toString(), req.user.roles);
      return sendSuccess(res, null, 'Lesson deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  // ====================================================
  // Learning Materials
  // ====================================================

  static async createMaterial(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const material = await LearningService.createMaterial(req.body, req.user._id.toString(), req.user.roles);
      return sendSuccess(res, material, 'Learning material created successfully', undefined, 201);
    } catch (err) {
      next(err);
    }
  }

  static async getMaterials(req: Request, res: Response, next: NextFunction) {
    try {
      const materials = await LearningService.getMaterials(
        {
          lessonId: req.query.lessonId as string,
          courseId: req.query.courseId as string,
          moduleId: req.query.moduleId as string,
        },
        req.user as unknown as IUser,
        req.user?.activeRole,
      );
      return sendSuccess(res, materials, 'Learning materials retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getMaterialById(req: Request, res: Response, next: NextFunction) {
    try {
      const material = await LearningService.getMaterialById(
        req.params.id as string,
        req.user as unknown as IUser,
        req.user?.activeRole,
      );
      return sendSuccess(res, material, 'Learning material retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateMaterial(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const material = await LearningService.updateMaterial(
        req.params.id as string,
        req.body,
        req.user._id.toString(),
        req.user.roles,
      );
      return sendSuccess(res, material, 'Learning material updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteMaterial(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      await LearningService.deleteMaterial(req.params.id as string, req.user._id.toString(), req.user.roles);
      return sendSuccess(res, null, 'Learning material deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  // ====================================================
  // Class Sessions
  // ====================================================

  static async createClassSession(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const session = await LearningService.createClassSession(
        req.body,
        req.user._id.toString(),
        req.user.roles,
      );
      return sendSuccess(res, session, 'Class session scheduled successfully', undefined, 201);
    } catch (err) {
      next(err);
    }
  }

  static async getClassSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = await LearningService.getClassSessions(
        {
          batchId: req.query.batchId as string,
          courseId: req.query.courseId as string,
          teacherId: req.query.teacherId as string,
          status: req.query.status as ClassStatus,
        },
        req.user as unknown as IUser,
        req.user?.activeRole,
      );
      return sendSuccess(res, sessions, 'Class sessions retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getClassSessionById(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await LearningService.getClassSessionById(
        req.params.id as string,
        req.user as unknown as IUser,
        req.user?.activeRole,
      );
      return sendSuccess(res, session, 'Class session retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateClassSession(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const session = await LearningService.updateClassSession(
        req.params.id as string,
        req.body,
        req.user._id.toString(),
        req.user.roles,
      );
      return sendSuccess(res, session, 'Class session updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async cancelClassSession(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const session = await LearningService.cancelClassSession(
        req.params.id as string,
        req.user._id.toString(),
        req.user.roles,
      );
      return sendSuccess(res, session, 'Class session cancelled successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteClassSession(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      await LearningService.deleteClassSession(req.params.id as string, req.user._id.toString(), req.user.roles);
      return sendSuccess(res, null, 'Class session deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}

