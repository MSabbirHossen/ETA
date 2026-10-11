import type { Request, Response, NextFunction } from 'express';
import { AssignmentService } from './assignment.service.js';
import { sendSuccess } from '../../common/response.js';
import { UnauthorizedError } from '../../common/errors.js';
import type { AssignmentStatus, IUser } from '@eta/types';

export class AssignmentController {
  // ====================================================
  // Assignments
  // ====================================================

  static async createAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const assignment = await AssignmentService.createAssignment(
        req.body,
        req.user._id.toString(),
        req.user.roles,
      );
      return sendSuccess(res, assignment, 'Assignment created successfully', undefined, 201);
    } catch (err) {
      next(err);
    }
  }

  static async getAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const assignments = await AssignmentService.getAssignments(
        {
          courseId: req.query.courseId as string,
          batchId: req.query.batchId as string,
          subjectId: req.query.subjectId as string,
          status: req.query.status as AssignmentStatus,
        },
        req.user as unknown as IUser,
        req.user?.activeRole,
      );
      return sendSuccess(res, assignments, 'Assignments retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getAssignmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const assignment = await AssignmentService.getAssignmentById(
        req.params.id as string,
        req.user as unknown as IUser,
        req.user?.activeRole,
      );
      return sendSuccess(res, assignment, 'Assignment retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const assignment = await AssignmentService.updateAssignment(
        req.params.id as string,
        req.body,
        req.user._id.toString(),
        req.user.roles,
      );
      return sendSuccess(res, assignment, 'Assignment updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async publishAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const assignment = await AssignmentService.publishAssignment(
        req.params.id as string,
        req.user._id.toString(),
        req.user.roles,
      );
      return sendSuccess(res, assignment, 'Assignment published successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      await AssignmentService.deleteAssignment(
        req.params.id as string,
        req.user._id.toString(),
        req.user.roles,
      );
      return sendSuccess(res, null, 'Assignment deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  // ====================================================
  // Submissions
  // ====================================================

  static async submitAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const submission = await AssignmentService.submitAssignment(
        req.params.id as string,
        req.body,
        req.user._id.toString(),
      );
      return sendSuccess(res, submission, 'Assignment submitted successfully', undefined, 201);
    } catch (err) {
      next(err);
    }
  }

  static async getMySubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const submissions = await AssignmentService.getMySubmissions(
        req.params.id as string,
        req.user._id.toString(),
      );
      return sendSuccess(res, submissions, 'My submissions retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getAssignmentSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const submissions = await AssignmentService.getAssignmentSubmissions(
        req.params.id as string,
        req.user._id.toString(),
        req.user.roles,
      );
      return sendSuccess(res, submissions, 'Assignment submissions retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getSubmissionById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const submission = await AssignmentService.getSubmissionById(
        req.params.id as string,
        req.user as unknown as IUser,
        req.user.activeRole,
      );
      return sendSuccess(res, submission, 'Submission retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async reviewSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const submission = await AssignmentService.reviewSubmission(
        req.params.id as string,
        req.body,
        req.user._id.toString(),
        req.user.roles,
      );
      return sendSuccess(res, submission, 'Submission reviewed successfully');
    } catch (err) {
      next(err);
    }
  }
}
