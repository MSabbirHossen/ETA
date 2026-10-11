import type { Request, Response, NextFunction } from 'express';
import { GradebookService } from './gradebook.service.js';
import { sendSuccess } from '../../common/response.js';
import { UnauthorizedError } from '../../common/errors.js';

export class GradebookController {
  // ==========================================================================
  // Configuration
  // ==========================================================================

  public static async getConfig(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const courseId = req.params.courseId as string;
      const batchId = req.params.batchId as string;
      const config = await GradebookService.getGradebookConfig(
        req.user._id.toString(),
        req.user.roles,
        courseId,
        batchId
      );
      return sendSuccess(res, config, 'Gradebook configuration retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async saveConfig(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const courseId = req.params.courseId as string;
      const batchId = req.params.batchId as string;
      const config = await GradebookService.saveGradebookConfig(
        req.user._id.toString(),
        req.user.roles,
        courseId,
        batchId,
        req.body
      );
      return sendSuccess(res, config, 'Gradebook configuration saved successfully');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================================================
  // Overview & Calculations
  // ==========================================================================

  public static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const courseId = req.params.courseId as string;
      const batchId = req.params.batchId as string;
      const overview = await GradebookService.getGradebookOverview(
        req.user._id.toString(),
        req.user.roles,
        courseId,
        batchId
      );
      return sendSuccess(res, overview, 'Gradebook overview retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async calculateBatchGrades(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const courseId = req.params.courseId as string;
      const batchId = req.params.batchId as string;
      const results = await GradebookService.calculateBatchGrades(
        req.user._id.toString(),
        req.user.roles,
        courseId,
        batchId
      );
      return sendSuccess(res, results, 'Batch grades calculated successfully');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================================================
  // Review, Approval, Publication
  // ==========================================================================

  public static async submitForReview(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const courseId = req.params.courseId as string;
      const batchId = req.params.batchId as string;
      const result = await GradebookService.submitForReview(
        req.user._id.toString(),
        req.user.roles,
        courseId,
        batchId,
        req.body
      );
      return sendSuccess(res, result, 'Grades submitted for academic administrative review');
    } catch (err) {
      next(err);
    }
  }

  public static async approveResults(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const courseId = req.params.courseId as string;
      const batchId = req.params.batchId as string;
      const result = await GradebookService.approveResults(
        req.user._id.toString(),
        req.user.roles,
        courseId,
        batchId,
        req.body
      );
      return sendSuccess(res, result, 'Grades approved by administrator');
    } catch (err) {
      next(err);
    }
  }

  public static async publishResults(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const courseId = req.params.courseId as string;
      const batchId = req.params.batchId as string;
      const result = await GradebookService.publishResults(
        req.user._id.toString(),
        req.user.roles,
        courseId,
        batchId,
        req.body
      );
      return sendSuccess(res, result, 'Grades published to students and guardians successfully');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================================================
  // Overrides & Corrections
  // ==========================================================================

  public static async overrideGrade(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const courseId = req.params.courseId as string;
      const batchId = req.params.batchId as string;
      const studentId = req.params.studentId as string;
      const result = await GradebookService.overrideStudentGrade(
        req.user._id.toString(),
        req.user.roles,
        courseId,
        batchId,
        studentId,
        req.body
      );
      return sendSuccess(res, result, 'Student grade overridden successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async correctGrade(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const courseId = req.params.courseId as string;
      const batchId = req.params.batchId as string;
      const studentId = req.params.studentId as string;
      const result = await GradebookService.correctStudentGrade(
        req.user._id.toString(),
        req.user.roles,
        courseId,
        batchId,
        studentId,
        req.body
      );
      return sendSuccess(res, result, 'Student grade corrected with audit entry successfully');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================================================
  // Student & Guardian Endpoints
  // ==========================================================================

  public static async getStudentCourseGrade(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const courseId = req.params.courseId as string;
      const batchId = req.params.batchId as string;
      const studentId = req.params.studentId as string;
      const result = await GradebookService.getStudentCourseGrade(
        req.user._id.toString(),
        req.user.roles,
        courseId,
        batchId,
        studentId
      );
      return sendSuccess(res, result, 'Student grade retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async getMyGrades(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const targetStudentId = req.query.studentId as string | undefined;
      const results = await GradebookService.getMyGrades(
        req.user._id.toString(),
        req.user.roles,
        targetStudentId
      );
      return sendSuccess(res, results, 'Published grades retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}
