import { Router } from 'express';
import { Permission } from '@eta/types';
import { authenticate, requirePermissions } from '../../middleware/index.js';
import { AuditController } from './audit.controller.js';

const router = Router();

/**
 * Audit Logging Endpoints — PRD §56
 * All endpoints require authentication and dedicated administrative audit permissions.
 * No creation or modification routes are exposed (audits are emitted internally by domain events).
 */
router.get(
  '/audit-logs',
  authenticate,
  requirePermissions(Permission.AUDIT_VIEW),
  AuditController.getAuditLogs
);

router.get(
  '/audit-logs/export',
  authenticate,
  requirePermissions(Permission.AUDIT_EXPORT),
  AuditController.exportAuditLogs
);

router.get(
  '/audit-logs/:id',
  authenticate,
  requirePermissions(Permission.AUDIT_VIEW),
  AuditController.getAuditLogById
);

export const auditRouter = router;
