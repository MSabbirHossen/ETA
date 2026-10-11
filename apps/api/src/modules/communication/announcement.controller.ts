import type { Request, Response, NextFunction } from 'express';
import { AnnouncementService } from './announcement.service.js';
import { sendSuccess, sendCreated } from '../../common/response.js';
import { UnauthorizedError } from '../../common/errors.js';
import type { UserRole, IUser } from '@eta/types';

export class AnnouncementController {
  static async createAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const announcement = await AnnouncementService.createAnnouncement(
        req.body,
        req.user._id.toString(),
        req.user.roles,
      );
      sendCreated(res, announcement, 'Announcement created successfully.');
    } catch (err) {
      next(err);
    }
  }

  static async updateAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const announcement = await AnnouncementService.updateAnnouncement(
        req.params.id as string,
        req.body,
        req.user._id.toString(),
        req.user.roles,
      );
      sendSuccess(res, announcement, 'Announcement updated successfully.');
    } catch (err) {
      next(err);
    }
  }

  static async publishAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const announcement = await AnnouncementService.publishAnnouncement(
        req.params.id as string,
        req.user._id.toString(),
        req.user.roles,
      );
      sendSuccess(res, announcement, 'Announcement published successfully.');
    } catch (err) {
      next(err);
    }
  }

  static async archiveAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const announcement = await AnnouncementService.archiveAnnouncement(
        req.params.id as string,
        req.user._id.toString(),
        req.user.roles,
      );
      sendSuccess(res, announcement, 'Announcement archived successfully.');
    } catch (err) {
      next(err);
    }
  }

  static async deleteAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      await AnnouncementService.deleteAnnouncement(req.params.id as string, req.user.roles);
      sendSuccess(res, null, 'Announcement deleted successfully.');
    } catch (err) {
      next(err);
    }
  }

  static async getAnnouncements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activeRole = (req.headers['x-active-role'] as UserRole) || req.user?.roles?.[0];
      const safeUser = req.user
        ? (((req.user as any).toObject ? (req.user as any).toObject() : req.user) as unknown as IUser)
        : undefined;

      const result = await AnnouncementService.getAnnouncements(
        req.query,
        safeUser,
        activeRole,
      );
      sendSuccess(res, result.data, 'Announcements retrieved successfully.', {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: Math.ceil(result.total / result.limit),
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAnnouncementById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activeRole = (req.headers['x-active-role'] as UserRole) || req.user?.roles?.[0];
      const safeUser = req.user
        ? (((req.user as any).toObject ? (req.user as any).toObject() : req.user) as unknown as IUser)
        : undefined;

      const announcement = await AnnouncementService.getAnnouncementById(
        req.params.id as string,
        safeUser,
        activeRole,
      );
      sendSuccess(res, announcement, 'Announcement retrieved successfully.');
    } catch (err) {
      next(err);
    }
  }
}
