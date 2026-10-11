import type { Request, Response, NextFunction } from 'express';
import { GuardianService } from './guardian.service.js';
import { sendSuccess, sendCreated } from '../../common/response.js';
import { UnauthorizedError } from '../../common/errors.js';

export class GuardianController {
  public static async getMyStudents(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const results = await GuardianService.getMyStudents(
        req.user._id.toString()
      );
      return sendSuccess(res, results, 'Linked students retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async listLinks(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const filter = {
        guardianId: req.query.guardianId as string,
        studentId: req.query.studentId as string,
        status: req.query.status as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };
      const result = await GuardianService.listLinks(filter, {
        userId: req.user._id.toString(),
        roles: req.user.roles,
      });
      return sendSuccess(
        res,
        result.data,
        'Guardian links retrieved successfully',
        result.meta
      );
    } catch (err) {
      next(err);
    }
  }

  public static async getLinkById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const linkId = req.params.id as string;
      const result = await GuardianService.getLinkById(linkId, {
        userId: req.user._id.toString(),
        roles: req.user.roles,
      });
      return sendSuccess(res, result, 'Guardian link retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async createLink(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await GuardianService.createLink(
        req.body,
        req.user._id.toString()
      );
      return sendCreated(res, result, 'Guardian link created successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async verifyLink(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const linkId = req.params.id as string;
      const { verified } = req.body;
      const result = await GuardianService.verifyLink(
        linkId,
        verified,
        req.user._id.toString()
      );
      return sendSuccess(res, result, 'Guardian link verification updated');
    } catch (err) {
      next(err);
    }
  }

  public static async updateLink(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const linkId = req.params.id as string;
      const result = await GuardianService.updateLink(linkId, req.body, {
        userId: req.user._id.toString(),
        roles: req.user.roles,
      });
      return sendSuccess(res, result, 'Guardian link updated successfully');
    } catch (err) {
      next(err);
    }
  }

  public static async revokeLink(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError();
      const linkId = req.params.id as string;
      const result = await GuardianService.revokeLink(linkId, {
        userId: req.user._id.toString(),
        roles: req.user.roles,
      });
      return sendSuccess(res, result, 'Guardian link revoked successfully');
    } catch (err) {
      next(err);
    }
  }
}
