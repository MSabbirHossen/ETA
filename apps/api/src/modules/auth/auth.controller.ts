import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { sendSuccess } from '../../common/response.js';
import { assertDefined } from '@eta/utils';

export class AuthController {
  async sync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await authService.syncUser(req.auth, req.body);
      sendSuccess(res, data, 'User authenticated and synchronized successfully');
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = assertDefined(req.user, 'Authenticated user');
      const data = authService.getMe(user);
      sendSuccess(res, data, 'Authenticated user profile retrieved');
    } catch (err) {
      next(err);
    }
  }

  async switchRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = assertDefined(req.user, 'Authenticated user');
      const data = await authService.switchRole(user, req.body.role);
      sendSuccess(res, data, `Active role switched to '${req.body.role}'`);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
