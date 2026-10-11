import { Router } from 'express';
import { Permission } from '@eta/types';
import { authenticate, requirePermissions } from '../../middleware/index.js';
import { AnalyticsController } from './analytics.controller.js';

const router = Router();

// ---------------------------------------------------------------------------
// Student Analytics — PRD §54.1
// ---------------------------------------------------------------------------
router.get(
  '/analytics/student/me',
  authenticate,
  requirePermissions(Permission.ANALYTICS_VIEW_SELF),
  AnalyticsController.getStudentAnalytics
);

// ---------------------------------------------------------------------------
// Teacher Analytics — PRD §54.2
// ---------------------------------------------------------------------------
router.get(
  '/analytics/teacher',
  authenticate,
  requirePermissions(Permission.ANALYTICS_VIEW_TEACHER),
  AnalyticsController.getTeacherAnalytics
);

// ---------------------------------------------------------------------------
// Admin Analytics — PRD §54.3
// ---------------------------------------------------------------------------
router.get(
  '/analytics/admin',
  authenticate,
  requirePermissions(Permission.ANALYTICS_VIEW_ADMIN),
  AnalyticsController.getAdminAnalytics
);

// ---------------------------------------------------------------------------
// Reports & Exports — PRD §55
// ---------------------------------------------------------------------------
router.get(
  '/reports',
  authenticate,
  requirePermissions(Permission.REPORT_VIEW),
  AnalyticsController.getReport
);

router.get(
  '/reports/export',
  authenticate,
  requirePermissions(Permission.REPORT_EXPORT),
  AnalyticsController.exportReport
);

export const analyticsRouter = router;
