import { Router } from 'express';
import { AnnouncementController } from './announcement.controller.js';
import { authenticate, requireUser, optionalAuthenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { Permission } from '@eta/types';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  announcementFilterSchema,
} from '@eta/validation';

export const announcementRouter = Router();

// Public / Personalized listing
announcementRouter.get(
  '/',
  optionalAuthenticate,
  validateQuery(announcementFilterSchema),
  AnnouncementController.getAnnouncements,
);

announcementRouter.get(
  '/:id',
  optionalAuthenticate,
  AnnouncementController.getAnnouncementById,
);

// Management routes
announcementRouter.post(
  '/',
  authenticate,
  requireUser,
  requirePermissions(Permission.ANNOUNCEMENT_CREATE),
  validateBody(createAnnouncementSchema),
  AnnouncementController.createAnnouncement,
);

announcementRouter.patch(
  '/:id',
  authenticate,
  requireUser,
  requirePermissions(Permission.ANNOUNCEMENT_UPDATE),
  validateBody(updateAnnouncementSchema),
  AnnouncementController.updateAnnouncement,
);

announcementRouter.post(
  '/:id/publish',
  authenticate,
  requireUser,
  requirePermissions(Permission.ANNOUNCEMENT_PUBLISH),
  AnnouncementController.publishAnnouncement,
);

announcementRouter.post(
  '/:id/archive',
  authenticate,
  requireUser,
  requirePermissions(Permission.ANNOUNCEMENT_UPDATE),
  AnnouncementController.archiveAnnouncement,
);

announcementRouter.delete(
  '/:id',
  authenticate,
  requireUser,
  requirePermissions(Permission.ANNOUNCEMENT_DELETE),
  AnnouncementController.deleteAnnouncement,
);
