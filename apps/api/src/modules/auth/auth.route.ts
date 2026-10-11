import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate, requireUser, validate } from '../../middleware/index.js';
import { syncUserSchema, switchRoleSchema } from '@eta/validation';

const authRouter: Router = Router();

/**
 * POST /api/v1/auth/sync
 * Idempotent synchronization & provisioning after Firebase login — PRD §9.3
 */
authRouter.post('/sync', authenticate, validate(syncUserSchema), (req, res, next) => {
  authController.sync(req, res, next);
});

/**
 * GET /api/v1/auth/me
 * Retrieves the current authenticated user profile and permissions
 */
authRouter.get('/me', authenticate, requireUser, (req, res, next) => {
  authController.getMe(req, res, next);
});

/**
 * POST /api/v1/auth/switch-role
 * Allows multi-role users to switch their activeRole — PRD §7
 */
authRouter.post(
  '/switch-role',
  authenticate,
  requireUser,
  validate(switchRoleSchema),
  (req, res, next) => {
    authController.switchRole(req, res, next);
  },
);

export { authRouter };
