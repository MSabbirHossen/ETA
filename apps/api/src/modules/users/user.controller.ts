import type { Request, Response, NextFunction } from 'express';
import { userService } from './user.service.js';
import { sendSuccess } from '../../common/response.js';
import { assertDefined } from '@eta/utils';

export class UserController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = assertDefined(req.user, 'Authenticated user');
      const data = await userService.getProfile(user._id.toString());
      sendSuccess(res, data, 'User profile retrieved');
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = assertDefined(req.user, 'Authenticated user');
      const data = await userService.updateProfile(user._id.toString(), req.body);
      sendSuccess(res, data, 'Profile updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await userService.getUserById(id as string);
      sendSuccess(res, data, 'User retrieved');
    } catch (err) {
      next(err);
    }
  }

  async assignRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = assertDefined(req.user, 'Authenticated administrator');
      const { id } = req.params;
      const data = await userService.assignRoles(id as string, req.body, actor);
      sendSuccess(res, data, 'User roles and status updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { items, meta } = await userService.listUsers(req.query as any);
      sendSuccess(res, items, 'User list retrieved', meta);
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
