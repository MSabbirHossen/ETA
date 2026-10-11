import { Router } from 'express';
import { GuardianController } from './guardian.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import { Permission } from '@eta/types';
import {
  createGuardianLinkSchema,
  updateGuardianLinkSchema,
  verifyGuardianLinkSchema,
} from '@eta/validation';

export const guardianRouter = Router();

// ============================================================================
// Guardian Portal Endpoints
// ============================================================================
guardianRouter.get(
  '/guardians/my-students',
  authenticate,
  requirePermissions(Permission.GUARDIAN_LINK_VIEW),
  GuardianController.getMyStudents
);

// ============================================================================
// Link Management Endpoints (Admin, Guardian, Student)
// ============================================================================
guardianRouter.get(
  '/guardians/links',
  authenticate,
  requirePermissions(Permission.GUARDIAN_LINK_VIEW),
  GuardianController.listLinks
);

guardianRouter.get(
  '/guardians/links/:id',
  authenticate,
  requirePermissions(Permission.GUARDIAN_LINK_VIEW),
  GuardianController.getLinkById
);

guardianRouter.post(
  '/guardians/links',
  authenticate,
  requirePermissions(Permission.GUARDIAN_LINK_CREATE),
  validateBody(createGuardianLinkSchema),
  GuardianController.createLink
);

guardianRouter.post(
  '/guardians/links/:id/verify',
  authenticate,
  requirePermissions(Permission.GUARDIAN_LINK_APPROVE),
  validateBody(verifyGuardianLinkSchema),
  GuardianController.verifyLink
);

guardianRouter.patch(
  '/guardians/links/:id',
  authenticate,
  validateBody(updateGuardianLinkSchema),
  GuardianController.updateLink
);

guardianRouter.delete(
  '/guardians/links/:id',
  authenticate,
  GuardianController.revokeLink
);

guardianRouter.post(
  '/guardians/links/:id/revoke',
  authenticate,
  GuardianController.revokeLink
);
