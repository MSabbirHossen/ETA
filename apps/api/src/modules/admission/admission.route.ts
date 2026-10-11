import { Router } from 'express';
import { AdmissionController } from './admission.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import { Permission } from '@eta/types';
import {
  createApplicationDraftSchema,
  updateApplicationDraftSchema,
  submitApplicationSchema,
  reviewApplicationSchema,
  decisionApplicationSchema,
  convertToStudentSchema,
} from '@eta/validation';

export const admissionRouter = Router();

// ============================================================================
// Applicant Endpoints
// ============================================================================
admissionRouter.post(
  '/admissions/draft',
  authenticate,
  requirePermissions(Permission.ADMISSION_CREATE),
  validateBody(createApplicationDraftSchema),
  AdmissionController.createDraft
);

admissionRouter.patch(
  '/admissions/:id/draft',
  authenticate,
  requirePermissions(Permission.ADMISSION_UPDATE),
  validateBody(updateApplicationDraftSchema),
  AdmissionController.updateDraft
);

admissionRouter.post(
  '/admissions/:id/submit',
  authenticate,
  requirePermissions(Permission.ADMISSION_UPDATE),
  AdmissionController.submitApplication
);

admissionRouter.get(
  '/admissions/me',
  authenticate,
  requirePermissions(Permission.ADMISSION_VIEW),
  AdmissionController.getMyApplications
);

admissionRouter.post(
  '/admissions/:id/withdraw',
  authenticate,
  AdmissionController.withdrawApplication
);

// ============================================================================
// Administrative Review & Evaluation Endpoints
// ============================================================================
admissionRouter.get(
  '/admissions',
  authenticate,
  requirePermissions(Permission.ADMISSION_VIEW),
  AdmissionController.listApplications
);

admissionRouter.get(
  '/admissions/:id',
  authenticate,
  requirePermissions(Permission.ADMISSION_VIEW),
  AdmissionController.getApplicationById
);

admissionRouter.post(
  '/admissions/:id/review',
  authenticate,
  requirePermissions(Permission.ADMISSION_REVIEW),
  validateBody(reviewApplicationSchema),
  AdmissionController.reviewApplication
);

admissionRouter.post(
  '/admissions/:id/decision',
  authenticate,
  requirePermissions(Permission.ADMISSION_APPROVE),
  validateBody(decisionApplicationSchema),
  AdmissionController.decideApplication
);

admissionRouter.post(
  '/admissions/:id/convert-to-student',
  authenticate,
  requirePermissions(Permission.ADMISSION_APPROVE),
  validateBody(convertToStudentSchema),
  AdmissionController.convertToStudent
);
