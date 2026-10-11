import { Router } from 'express';
import { userController } from './user.controller.js';
import {
  authenticate,
  requireUser,
  requirePermissions,
  validate,
} from '../../middleware/index.js';
import { updateProfileSchema, assignRolesSchema, paginationSchema } from '@eta/validation';
import { Permission } from '@eta/types';

const userRouter: Router = Router();

/**
 * GET /api/v1/users/profile
 * Retrieves self profile of current authenticated user
 */
userRouter.get('/profile', authenticate, requireUser, (req, res, next) => {
  userController.getProfile(req, res, next);
});

/**
 * PATCH /api/v1/users/profile
 * Updates self profile attributes
 */
userRouter.patch(
  '/profile',
  authenticate,
  requireUser,
  validate(updateProfileSchema),
  (req, res, next) => {
    userController.updateProfile(req, res, next);
  },
);

/**
 * GET /api/v1/users
 * Lists users with pagination (requires USER_VIEW permission)
 */
userRouter.get(
  '/',
  authenticate,
  requireUser,
  requirePermissions(Permission.USER_VIEW),
  validate(paginationSchema, 'query'),
  (req, res, next) => {
    userController.listUsers(req, res, next);
  },
);

/**
 * GET /api/v1/users/:id
 * Retrieves a user by ID (requires USER_VIEW permission)
 */
userRouter.get(
  '/:id',
  authenticate,
  requireUser,
  requirePermissions(Permission.USER_VIEW),
  (req, res, next) => {
    userController.getUserById(req, res, next);
  },
);

/**
 * PATCH /api/v1/users/:id/roles
 * Administrative role assignment (requires ROLE_ASSIGN permission)
 */
userRouter.patch(
  '/:id/roles',
  authenticate,
  requireUser,
  requirePermissions(Permission.ROLE_ASSIGN),
  validate(assignRolesSchema),
  (req, res, next) => {
    userController.assignRoles(req, res, next);
  },
);

export { userRouter };
