import { Router } from 'express';
import { FinanceController } from './finance.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { Permission } from '@eta/types';

const router = Router();

// ============================================================================
// Fee Structures
// ============================================================================
router.get(
  '/fee-structures',
  authenticate,
  requirePermissions(Permission.FINANCE_VIEW_ANY),
  FinanceController.listFeeStructures
);

router.post(
  '/fee-structures',
  authenticate,
  requirePermissions(Permission.FEE_MANAGE),
  FinanceController.createFeeStructure
);

router.get(
  '/fee-structures/:id',
  authenticate,
  requirePermissions(Permission.FINANCE_VIEW_ANY),
  FinanceController.getFeeStructureById
);

router.patch(
  '/fee-structures/:id',
  authenticate,
  requirePermissions(Permission.FEE_MANAGE),
  FinanceController.updateFeeStructure
);

// ============================================================================
// Invoices
// ============================================================================
router.get(
  '/invoices/me',
  authenticate,
  requirePermissions(Permission.FINANCE_VIEW_SELF),
  FinanceController.getMyInvoices
);

router.get(
  '/invoices/student/:studentId',
  authenticate,
  requirePermissions(Permission.FINANCE_VIEW_SELF),
  FinanceController.getStudentInvoices
);

router.get(
  '/invoices/:id',
  authenticate,
  FinanceController.getInvoiceById
);

router.get(
  '/invoices',
  authenticate,
  requirePermissions(Permission.FINANCE_VIEW_ANY),
  FinanceController.listInvoices
);

router.post(
  '/invoices',
  authenticate,
  requirePermissions(Permission.INVOICE_CREATE),
  FinanceController.createInvoice
);

router.post(
  '/invoices/bulk',
  authenticate,
  requirePermissions(Permission.INVOICE_CREATE),
  FinanceController.bulkCreateInvoices
);

router.post(
  '/invoices/:id/waive',
  authenticate,
  requirePermissions(Permission.FINANCE_MANAGE),
  FinanceController.waiveInvoice
);

// ============================================================================
// Payments & Receipts
// ============================================================================
router.get(
  '/payments/me',
  authenticate,
  requirePermissions(Permission.FINANCE_VIEW_SELF),
  FinanceController.getMyPayments
);

router.get(
  '/payments/student/:studentId',
  authenticate,
  requirePermissions(Permission.FINANCE_VIEW_SELF),
  FinanceController.getStudentPayments
);

router.get(
  '/payments/:id/receipt',
  authenticate,
  FinanceController.getReceipt
);

router.get(
  '/payments/:id/receipt/pdf',
  authenticate,
  FinanceController.downloadReceiptPDF
);

router.get(
  '/payments/:id',
  authenticate,
  FinanceController.getPaymentById
);

router.get(
  '/payments',
  authenticate,
  requirePermissions(Permission.PAYMENT_VIEW),
  FinanceController.listPayments
);

router.post(
  '/payments',
  authenticate,
  requirePermissions(Permission.PAYMENT_RECORD),
  FinanceController.recordPayment
);

// ============================================================================
// Refunds
// ============================================================================
router.post(
  '/refunds',
  authenticate,
  requirePermissions(Permission.REFUND_CREATE),
  FinanceController.requestRefund
);

router.post(
  '/refunds/:id/approve',
  authenticate,
  requirePermissions(Permission.REFUND_APPROVE),
  FinanceController.approveRefund
);

router.get(
  '/refunds',
  authenticate,
  requirePermissions(Permission.FINANCE_VIEW_ANY),
  FinanceController.listRefunds
);

// ============================================================================
// Scholarships
// ============================================================================
router.get(
  '/scholarships',
  authenticate,
  requirePermissions(Permission.FINANCE_VIEW_ANY),
  FinanceController.listScholarships
);

router.post(
  '/scholarships',
  authenticate,
  requirePermissions(Permission.SCHOLARSHIP_MANAGE),
  FinanceController.createScholarship
);

// ============================================================================
// Finance Summary
// ============================================================================
router.get(
  '/summary',
  authenticate,
  requirePermissions(Permission.FINANCE_VIEW_ANY),
  FinanceController.getFinanceSummary
);

export { router as financeRouter };
