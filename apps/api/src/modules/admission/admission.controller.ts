import type { Request, Response, NextFunction } from 'express';
import { AdmissionService } from './admission.service.js';
import { sendSuccess, sendCreated } from '../../common/response.js';
import { UnauthorizedError } from '../../common/errors.js';

export class AdmissionController {
  public static async createDraft(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await AdmissionService.createDraft(
        req.user._id.toString(),
        req.body
      );
      return sendCreated(res, result, 'Application draft created successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async updateDraft(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const applicationId = req.params.id as string;
      const result = await AdmissionService.updateDraft(
        req.user._id.toString(),
        applicationId,
        req.body
      );
      return sendSuccess(res, result, 'Application draft updated successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async submitApplication(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const applicationId = req.params.id as string;
      const result = await AdmissionService.submitApplication(
        req.user._id.toString(),
        applicationId,
        req.body
      );
      return sendSuccess(res, result, 'Application submitted successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async getMyApplications(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const results = await AdmissionService.getMyApplications(
        req.user._id.toString()
      );
      return sendSuccess(res, results, 'Applications retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async getApplicationById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const applicationId = req.params.id as string;
      const result = await AdmissionService.getApplicationById(
        applicationId,
        { userId: req.user._id.toString(), roles: req.user.roles }
      );
      return sendSuccess(res, result, 'Application retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async listApplications(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const filter = {
        status: req.query.status as any,
        programId: req.query.programId as string,
        courseId: req.query.courseId as string,
        batchId: req.query.batchId as string,
        search: req.query.search as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };
      const result = await AdmissionService.listApplications(filter);
      return sendSuccess(
        res,
        result.data,
        'Applications listed successfully',
        result.meta
      );
    } catch (err) {
      next(err);
    }
  }

  public static async reviewApplication(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const applicationId = req.params.id as string;
      const result = await AdmissionService.reviewApplication(
        applicationId,
        req.user._id.toString(),
        req.body
      );
      return sendSuccess(res, result, 'Application review recorded successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async decideApplication(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const applicationId = req.params.id as string;
      const result = await AdmissionService.decideApplication(
        applicationId,
        req.user._id.toString(),
        req.body
      );
      return sendSuccess(res, result, 'Application decision recorded successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async convertToStudent(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const applicationId = req.params.id as string;
      const result = await AdmissionService.convertToStudent(
        applicationId,
        req.user._id.toString(),
        req.body
      );
      return sendSuccess(
        res,
        result,
        result.alreadyEnrolled
          ? 'Applicant was already enrolled'
          : 'Applicant successfully converted to enrolled student'
      );
    } catch (err) {
      next(err);
    }
  }

  public static async withdrawApplication(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const applicationId = req.params.id as string;
      const result = await AdmissionService.withdrawApplication(
        req.user._id.toString(),
        applicationId
      );
      return sendSuccess(res, result, 'Application withdrawn successfully');
    } catch (err) {
      next(err);
    }
  }
}
