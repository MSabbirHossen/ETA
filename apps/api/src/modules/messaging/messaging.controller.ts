import { Request, Response, NextFunction } from 'express';
import { MessagingService } from './messaging.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/response';
import { UserRole } from '@eta/types';

export class MessagingController {
  /**
   * GET /api/v1/conversations
   */
  static async listConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const activeRole = ((req as any).activeRole || user.activeRole) as UserRole;
      const result = await MessagingService.listConversations(user, activeRole, req.query as any);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/conversations/:id
   */
  static async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const activeRole = ((req as any).activeRole || user.activeRole) as UserRole;
      const result = await MessagingService.getConversation(req.params.id as string, user, activeRole);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/conversations
   */
  static async createConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const activeRole = ((req as any).activeRole || user.activeRole) as UserRole;
      const result = await MessagingService.createConversation(req.body, user, activeRole);
      sendCreated(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/conversations/:id/messages
   */
  static async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const activeRole = ((req as any).activeRole || user.activeRole) as UserRole;
      const result = await MessagingService.getMessages(
        req.params.id as string,
        req.query as any,
        user,
        activeRole
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/conversations/:id/messages
   */
  static async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const activeRole = ((req as any).activeRole || user.activeRole) as UserRole;
      const result = await MessagingService.sendMessage(
        req.params.id as string,
        req.body,
        user,
        activeRole
      );
      sendCreated(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/messages/:id
   */
  static async editMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const result = await MessagingService.editMessage(req.params.id as string, req.body, user);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/messages/:id
   */
  static async deleteMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const activeRole = ((req as any).activeRole || user.activeRole) as UserRole;
      const result = await MessagingService.deleteMessage(req.params.id as string, user, activeRole);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/conversations/:id/read
   */
  static async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const actorIdStr = user.userId || user._id?.toString();
      await MessagingService.markConversationRead(req.params.id as string, actorIdStr);
      sendSuccess(res, { success: true, message: 'Conversation marked as read' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/conversations/:id/archive
   */
  static async archiveConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const actorIdStr = user.userId || user._id?.toString();
      await MessagingService.setConversationArchive(req.params.id as string, actorIdStr, true);
      sendSuccess(res, { success: true, message: 'Conversation archived' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/conversations/:id/unarchive
   */
  static async unarchiveConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const actorIdStr = user.userId || user._id?.toString();
      await MessagingService.setConversationArchive(req.params.id as string, actorIdStr, false);
      sendSuccess(res, { success: true, message: 'Conversation unarchived' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/messages/unread-count
   */
  static async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const result = await MessagingService.getUnreadTotal(user);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}
