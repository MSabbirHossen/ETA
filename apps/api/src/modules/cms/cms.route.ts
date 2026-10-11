import { Router } from 'express';
import { CMSController } from './cms.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { Permission } from '@eta/types';

const router = Router();

// ============================================================================
// Public Unauthenticated Endpoints (PRD §51)
// ============================================================================
router.get('/public/home', CMSController.getPublicHomeData);
router.get('/public/site', CMSController.getPublicSiteSettings);
router.get('/public/hero', CMSController.getPublicHero);
router.get('/public/statistics', CMSController.getPublicStatistics);
router.get('/public/leadership', CMSController.getPublicLeadership);
router.get('/public/testimonials', CMSController.getPublicTestimonials);
router.get('/public/faqs', CMSController.getPublicFAQs);

// ============================================================================
// Admin Authenticated Endpoints (RBAC-protected)
// ============================================================================

// Site Settings
router.get(
  '/settings',
  authenticate,
  requirePermissions(Permission.CMS_VIEW),
  CMSController.getSiteSettings
);
router.patch(
  '/settings',
  authenticate,
  requirePermissions(Permission.CMS_UPDATE),
  CMSController.updateSiteSettings
);

// Hero Section
router.get(
  '/hero',
  authenticate,
  requirePermissions(Permission.CMS_VIEW),
  CMSController.getHero
);
router.patch(
  '/hero',
  authenticate,
  requirePermissions(Permission.CMS_UPDATE),
  CMSController.updateHero
);

// Statistics
router.get(
  '/statistics',
  authenticate,
  requirePermissions(Permission.CMS_VIEW),
  CMSController.getStatistics
);
router.post(
  '/statistics',
  authenticate,
  requirePermissions(Permission.CMS_CREATE),
  CMSController.createStatistic
);
router.patch(
  '/statistics/:id',
  authenticate,
  requirePermissions(Permission.CMS_UPDATE),
  CMSController.updateStatistic
);
router.delete(
  '/statistics/:id',
  authenticate,
  requirePermissions(Permission.CMS_DELETE),
  CMSController.deleteStatistic
);

// Leadership Profiles
router.get(
  '/leadership',
  authenticate,
  requirePermissions(Permission.CMS_VIEW),
  CMSController.getLeadership
);
router.post(
  '/leadership',
  authenticate,
  requirePermissions(Permission.CMS_CREATE),
  CMSController.createLeadership
);
router.patch(
  '/leadership/:id',
  authenticate,
  requirePermissions(Permission.CMS_UPDATE),
  CMSController.updateLeadership
);
router.delete(
  '/leadership/:id',
  authenticate,
  requirePermissions(Permission.CMS_DELETE),
  CMSController.deleteLeadership
);

// Testimonials
router.get(
  '/testimonials',
  authenticate,
  requirePermissions(Permission.CMS_VIEW),
  CMSController.getTestimonials
);
router.post(
  '/testimonials',
  authenticate,
  requirePermissions(Permission.CMS_CREATE),
  CMSController.createTestimonial
);
router.patch(
  '/testimonials/:id',
  authenticate,
  requirePermissions(Permission.CMS_UPDATE),
  CMSController.updateTestimonial
);
router.delete(
  '/testimonials/:id',
  authenticate,
  requirePermissions(Permission.CMS_DELETE),
  CMSController.deleteTestimonial
);

// FAQ Items
router.get(
  '/faqs',
  authenticate,
  requirePermissions(Permission.CMS_VIEW),
  CMSController.getFAQs
);
router.post(
  '/faqs',
  authenticate,
  requirePermissions(Permission.CMS_CREATE),
  CMSController.createFAQ
);
router.patch(
  '/faqs/:id',
  authenticate,
  requirePermissions(Permission.CMS_UPDATE),
  CMSController.updateFAQ
);
router.delete(
  '/faqs/:id',
  authenticate,
  requirePermissions(Permission.CMS_DELETE),
  CMSController.deleteFAQ
);

export { router as cmsRouter };
