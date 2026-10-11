import { Router } from 'express';
import { GradebookController } from './gradebook.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import { Permission } from '@eta/types';
import {
  saveGradebookConfigSchema,
  submitForReviewSchema,
  approveResultsSchema,
  publishResultsSchema,
  overrideGradeSchema,
  correctGradeSchema,
} from '@eta/validation';

export const gradebookRouter = Router();

// ============================================================================
// Student & Guardian Grade Endpoints
// ============================================================================
gradebookRouter.get(
  '/grades/me',
  authenticate,
  requirePermissions(Permission.GRADE_VIEW_SELF),
  GradebookController.getMyGrades
);

gradebookRouter.get(
  '/gradebooks/:courseId/:batchId/students/:studentId',
  authenticate,
  GradebookController.getStudentCourseGrade
);

// ============================================================================
// Gradebook Configuration & Overview
// ============================================================================
gradebookRouter.get(
  '/gradebooks/:courseId/:batchId/config',
  authenticate,
  requirePermissions(Permission.GRADE_VIEW),
  GradebookController.getConfig
);

gradebookRouter.put(
  '/gradebooks/:courseId/:batchId/config',
  authenticate,
  requirePermissions(Permission.GRADE_MANAGE),
  validateBody(saveGradebookConfigSchema),
  GradebookController.saveConfig
);

gradebookRouter.get(
  '/gradebooks/:courseId/:batchId',
  authenticate,
  requirePermissions(Permission.GRADE_VIEW),
  GradebookController.getOverview
);

// ============================================================================
// Batch Grade Calculation
// ============================================================================
gradebookRouter.post(
  '/gradebooks/:courseId/:batchId/calculate',
  authenticate,
  requirePermissions(Permission.GRADE_MANAGE),
  GradebookController.calculateBatchGrades
);

// ============================================================================
// Lifecycle & Review Workflows (PRD §38)
// ============================================================================
gradebookRouter.post(
  '/gradebooks/:courseId/:batchId/submit-review',
  authenticate,
  requirePermissions(Permission.GRADE_MANAGE),
  validateBody(submitForReviewSchema),
  GradebookController.submitForReview
);

gradebookRouter.post(
  '/gradebooks/:courseId/:batchId/approve',
  authenticate,
  requirePermissions(Permission.GRADE_FINALIZE),
  validateBody(approveResultsSchema),
  GradebookController.approveResults
);

gradebookRouter.post(
  '/gradebooks/:courseId/:batchId/publish',
  authenticate,
  requirePermissions(Permission.GRADE_PUBLISH),
  validateBody(publishResultsSchema),
  GradebookController.publishResults
);

// ============================================================================
// Overrides & Corrections
// ============================================================================
gradebookRouter.post(
  '/gradebooks/:courseId/:batchId/students/:studentId/override',
  authenticate,
  requirePermissions(Permission.GRADE_OVERRIDE),
  validateBody(overrideGradeSchema),
  GradebookController.overrideGrade
);

gradebookRouter.post(
  '/gradebooks/:courseId/:batchId/students/:studentId/correct',
  authenticate,
  requirePermissions(Permission.GRADE_CORRECT),
  validateBody(correctGradeSchema),
  GradebookController.correctGrade
);
