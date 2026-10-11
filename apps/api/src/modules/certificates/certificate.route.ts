import { Router } from 'express';
import { CertificateController } from './certificate.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { Permission } from '@eta/types';

const router = Router();

// ============================================================================
// Public Unauthenticated Endpoints (PRD §49)
// ============================================================================
router.get(
  '/verify/:code',
  CertificateController.verifyCertificate
);

router.get(
  '/artifact/:verificationCode',
  CertificateController.getArtifactByCode
);

// ============================================================================
// Authenticated Student Endpoints
// ============================================================================
router.get(
  '/me',
  authenticate,
  requirePermissions(Permission.CERTIFICATE_VIEW_SELF),
  CertificateController.getMyCertificates
);

router.get(
  '/student/:studentId',
  authenticate,
  requirePermissions(Permission.CERTIFICATE_VIEW_SELF),
  CertificateController.getStudentCertificates
);

router.get(
  '/:id/download',
  authenticate,
  CertificateController.downloadCertificate
);

router.get(
  '/:id',
  authenticate,
  CertificateController.getCertificateById
);

// ============================================================================
// Authenticated Admin / Faculty Endpoints
// ============================================================================
router.get(
  '/eligibility',
  authenticate,
  requirePermissions(Permission.CERTIFICATE_VIEW_ANY),
  CertificateController.previewEligibility
);

router.post(
  '/issue',
  authenticate,
  requirePermissions(Permission.CERTIFICATE_ISSUE),
  CertificateController.issueCertificate
);

router.post(
  '/bulk-issue',
  authenticate,
  requirePermissions(Permission.CERTIFICATE_ISSUE),
  CertificateController.bulkIssueCertificates
);

router.post(
  '/:id/revoke',
  authenticate,
  requirePermissions(Permission.CERTIFICATE_REVOKE),
  CertificateController.revokeCertificate
);

router.post(
  '/:id/reissue',
  authenticate,
  requirePermissions(Permission.CERTIFICATE_REISSUE),
  CertificateController.reissueCertificate
);

router.get(
  '/',
  authenticate,
  requirePermissions(Permission.CERTIFICATE_VIEW_ANY),
  CertificateController.listCertificates
);

export { router as certificateRouter };
