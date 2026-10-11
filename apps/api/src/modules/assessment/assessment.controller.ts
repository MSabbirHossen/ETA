import type { Request, Response, NextFunction } from 'express';
import { assessmentService } from './assessment.service.js';
import { sendSuccess } from '../../common/response.js';
import { UnauthorizedError } from '../../common/errors.js';
import type { UserRole } from '@eta/types';

export class AssessmentController {
  // ==========================================
  // Question Bank
  // ==========================================

  static async createQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const question = await assessmentService.createQuestion(
        req.user._id.toString(),
        req.user.roles as UserRole[],
        req.body
      );
      return sendSuccess(res, question, 'Question created successfully', undefined, 201);
    } catch (err) {
      next(err);
    }
  }

  static async updateQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const question = await assessmentService.updateQuestion(
        req.user._id.toString(),
        req.user.roles as UserRole[],
        req.params.id as string,
        req.body
      );
      return sendSuccess(res, question, 'Question updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getQuestionById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const question = await assessmentService.getQuestionById(
        req.user._id.toString(),
        req.user.roles as UserRole[],
        req.params.id as string
      );
      return sendSuccess(res, question, 'Question retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async listQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const questions = await assessmentService.listQuestions(
        req.user._id.toString(),
        req.user.roles as UserRole[],
        {
          courseId: req.query.courseId as string,
          subjectId: req.query.subjectId as string,
          type: req.query.type as string,
          status: req.query.status as string,
          search: req.query.search as string,
        }
      );
      return sendSuccess(res, questions, 'Questions retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Assessment Configuration
  // ==========================================

  static async createAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const assessment = await assessmentService.createAssessment(
        req.user._id.toString(),
        req.user.roles as UserRole[],
        req.body
      );
      return sendSuccess(res, assessment, 'Assessment created successfully', undefined, 201);
    } catch (err) {
      next(err);
    }
  }

  static async updateAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const assessment = await assessmentService.updateAssessment(
        req.user._id.toString(),
        req.user.roles as UserRole[],
        req.params.id as string,
        req.body
      );
      return sendSuccess(res, assessment, 'Assessment updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async publishAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const assessment = await assessmentService.publishAssessment(
        req.user._id.toString(),
        req.user.roles as UserRole[],
        req.params.id as string
      );
      return sendSuccess(res, assessment, 'Assessment published successfully');
    } catch (err) {
      next(err);
    }
  }

  static async listAssessments(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const assessments = await assessmentService.listAssessments(
        req.user._id.toString(),
        req.user.roles as UserRole[],
        {
          courseId: req.query.courseId as string,
          batchId: req.query.batchId as string,
          status: req.query.status as string,
        }
      );
      return sendSuccess(res, assessments, 'Assessments retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getAssessmentById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const assessment = await assessmentService.getAssessmentById(
        req.user._id.toString(),
        req.user.roles as UserRole[],
        req.params.id as string
      );
      return sendSuccess(res, assessment, 'Assessment retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // Assessment Attempts & Taking
  // ==========================================

  static async startAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const attemptView = await assessmentService.startAttempt(
        req.user._id.toString(),
        req.params.id as string
      );
      return sendSuccess(res, attemptView, 'Attempt started successfully', undefined, 201);
    } catch (err) {
      next(err);
    }
  }

  static async saveAnswers(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await assessmentService.saveAnswers(
        req.user._id.toString(),
        req.params.attemptId as string,
        req.body
      );
      return sendSuccess(res, result, 'Answers saved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async submitAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const attempt = await assessmentService.submitAttempt(
        req.user._id.toString(),
        req.params.attemptId as string
      );
      return sendSuccess(res, attempt, 'Attempt submitted successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getMyAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const attempt = await assessmentService.getStudentAttempt(
        req.user._id.toString(),
        req.params.attemptId as string
      );
      return sendSuccess(res, attempt, 'Attempt retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async listCohortAttempts(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const attempts = await assessmentService.listAssessmentAttempts(
        req.user._id.toString(),
        req.user.roles as UserRole[],
        req.params.id as string
      );
      return sendSuccess(res, attempts, 'Cohort attempts retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async reviewAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const attempt = await assessmentService.reviewAttempt(
        req.user._id.toString(),
        req.user.roles as UserRole[],
        req.params.attemptId as string,
        req.body
      );
      return sendSuccess(res, attempt, 'Attempt reviewed successfully');
    } catch (err) {
      next(err);
    }
  }
}
