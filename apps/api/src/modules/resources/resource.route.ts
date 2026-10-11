import { Router } from 'express';
import { ResourceController } from './resource.controller.js';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { Permission } from '@eta/types';

const router = Router();

// ============================================================================
// Public Endpoints with Optional Auth Context (PRD §52)
// ============================================================================
router.get('/', optionalAuthenticate, ResourceController.getPublicResources);
router.get('/public', optionalAuthenticate, ResourceController.getPublicResources);

// ============================================================================
// Admin / Editorial Authenticated Endpoints
// NOTE: Must be defined before `/:slug` to prevent route collision
// ============================================================================
router.get(
  '/admin/all',
  authenticate,
  requirePermissions(Permission.RESOURCE_VIEW),
  ResourceController.getAdminResources
);

router.get(
  '/admin/:id',
  authenticate,
  requirePermissions(Permission.RESOURCE_VIEW),
  ResourceController.getAdminResourceById
);

router.post(
  '/',
  authenticate,
  requirePermissions(Permission.RESOURCE_CREATE),
  ResourceController.createResource
);

router.patch(
  '/:id',
  authenticate,
  requirePermissions(Permission.RESOURCE_UPDATE),
  ResourceController.updateResource
);

router.post(
  '/:id/publish',
  authenticate,
  requirePermissions(Permission.RESOURCE_PUBLISH),
  ResourceController.publishResource
);

router.post(
  '/:id/archive',
  authenticate,
  requirePermissions(Permission.RESOURCE_PUBLISH),
  ResourceController.archiveResource
);

router.delete(
  '/:id',
  authenticate,
  requirePermissions(Permission.RESOURCE_DELETE),
  ResourceController.deleteResource
);

// ============================================================================
// Public Single Resource by Slug (Mounted after admin routes)
// ============================================================================
router.get('/public/:slug', optionalAuthenticate, ResourceController.getPublicResourceBySlug);
router.get('/:slug', optionalAuthenticate, ResourceController.getPublicResourceBySlug);

export { router as resourceRouter };
