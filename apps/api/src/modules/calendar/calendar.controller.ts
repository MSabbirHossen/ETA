import { Request, Response, NextFunction } from 'express';
import { CalendarService } from './calendar.service';
import { sendSuccess, sendCreated } from '../../common/response';
import { UserRole } from '@eta/types';

export class CalendarController {
  /**
   * GET /api/v1/calendar
   * Query unified calendar events within date bounds
   */
  static async getEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const activeRole = (req as any).activeRole || user?.activeRole;

      const result = await CalendarService.getEvents(req.query as any, user, activeRole);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/calendar/upcoming
   * Helper endpoint: returns upcoming events for the next 14 days
   */
  static async getUpcomingEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const activeRole = (req as any).activeRole || user?.activeRole;

      const now = new Date();
      const next14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const query = {
        ...req.query,
        from: now.toISOString(),
        to: next14Days.toISOString(),
      };

      const result = await CalendarService.getEvents(query as any, user, activeRole);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/calendar/events
   * Create a custom/manual calendar event
   */
  static async createManualEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as any).user.userId || (req as any).user._id;
      const actorRoles = (req as any).user.roles as UserRole[];

      const event = await CalendarService.createManualEvent(req.body, actorId, actorRoles);
      sendCreated(res, event);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/calendar/events/:id
   * Update a custom/manual calendar event
   */
  static async updateManualEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as any).user.userId || (req as any).user._id;
      const actorRoles = (req as any).user.roles as UserRole[];

      const event = await CalendarService.updateManualEvent(req.params.id as string, req.body, actorId, actorRoles);
      sendSuccess(res, event);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/calendar/events/:id
   * Delete a custom/manual calendar event
   */
  static async deleteManualEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = (req as any).user.userId || (req as any).user._id;
      const actorRoles = (req as any).user.roles as UserRole[];

      await CalendarService.deleteManualEvent(req.params.id as string, actorId, actorRoles);
      sendSuccess(res, { message: 'Calendar event deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}
