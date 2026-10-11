import { Router } from 'express';
import { BlogController } from './blog.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { Permission } from '@eta/types';

const router = Router();

// ============================================================================
// Public Unauthenticated Endpoints (PRD §52)
// ============================================================================
router.get('/', BlogController.getPublicPosts);
router.get('/public', BlogController.getPublicPosts);
router.get('/categories', BlogController.getPublicCategories);
router.get('/public/categories', BlogController.getPublicCategories);

// ============================================================================
// Admin / Editorial Authenticated Endpoints
// NOTE: Defined before dynamic `/:slug` to prevent route collision
// ============================================================================
router.get(
  '/admin/all',
  authenticate,
  requirePermissions(Permission.BLOG_VIEW),
  BlogController.getAdminPosts
);

router.get(
  '/admin/categories',
  authenticate,
  requirePermissions(Permission.BLOG_VIEW),
  BlogController.getCategories
);

router.post(
  '/admin/categories',
  authenticate,
  requirePermissions(Permission.BLOG_CREATE),
  BlogController.createCategory
);

router.patch(
  '/admin/categories/:id',
  authenticate,
  requirePermissions(Permission.BLOG_UPDATE),
  BlogController.updateCategory
);

router.delete(
  '/admin/categories/:id',
  authenticate,
  requirePermissions(Permission.BLOG_DELETE),
  BlogController.deleteCategory
);

router.get(
  '/admin/:id',
  authenticate,
  requirePermissions(Permission.BLOG_VIEW),
  BlogController.getAdminPostById
);

router.post(
  '/',
  authenticate,
  requirePermissions(Permission.BLOG_CREATE),
  BlogController.createPost
);

router.patch(
  '/:id',
  authenticate,
  requirePermissions(Permission.BLOG_UPDATE),
  BlogController.updatePost
);

router.post(
  '/:id/publish',
  authenticate,
  requirePermissions(Permission.BLOG_PUBLISH),
  BlogController.publishPost
);

router.post(
  '/:id/archive',
  authenticate,
  requirePermissions(Permission.BLOG_PUBLISH),
  BlogController.archivePost
);

router.delete(
  '/:id',
  authenticate,
  requirePermissions(Permission.BLOG_DELETE),
  BlogController.deletePost
);

// ============================================================================
// Public Single Article by Slug (Mounted last to prevent intercepting admin paths)
// ============================================================================
router.get('/public/:slug', BlogController.getPublicPostBySlug);
router.get('/:slug', BlogController.getPublicPostBySlug);

export { router as blogRouter };
