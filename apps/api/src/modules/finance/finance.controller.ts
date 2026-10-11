import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '@eta/types';
import { FinanceService } from './finance.service.js';
import { sendSuccess, sendCreated } from '../../common/response.js';
import { UnauthorizedError } from '../../common/errors.js';
import {
  createFeeStructureSchema,
  updateFeeStructureSchema,
  createInvoiceSchema,
  bulkCreateInvoicesSchema,
  recordPaymentSchema,
  createScholarshipSchema,
  requestRefundSchema,
  approveRefundSchema,
  invoiceQuerySchema,
  paymentQuerySchema,
} from '@eta/validation';

export class FinanceController {
  // ==========================================================================
  // Fee Structures
  // ==========================================================================

  static async createFeeStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const input = createFeeStructureSchema.parse(req.body);
      const fs = await FinanceService.createFeeStructure(input, req.user as any);
      sendCreated(res, fs, 'Fee structure created successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getFeeStructureById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const fs = await FinanceService.getFeeStructureById(id);
      sendSuccess(res, fs, 'Fee structure retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async listFeeStructures(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fsList = await FinanceService.listFeeStructures(req.query as any);
      sendSuccess(res, fsList, 'Fee structures retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async updateFeeStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const id = String(req.params.id);
      const input = updateFeeStructureSchema.parse(req.body);
      const fs = await FinanceService.updateFeeStructure(id, input, req.user as any);
      sendSuccess(res, fs, 'Fee structure updated successfully');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================================================
  // Invoices
  // ==========================================================================

  static async createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const input = createInvoiceSchema.parse(req.body);
      const invoice = await FinanceService.createInvoice(input, req.user as any);
      sendCreated(res, invoice, 'Invoice created successfully');
    } catch (err) {
      next(err);
    }
  }

  static async bulkCreateInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const input = bulkCreateInvoicesSchema.parse(req.body);
      const result = await FinanceService.bulkCreateInvoices(input, req.user as any);
      sendCreated(
        res,
        result,
        `Bulk invoice generation completed: ${result.createdCount} created, ${result.skippedCount} skipped`
      );
    } catch (err) {
      next(err);
    }
  }

  static async getMyInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const actor = req.user as any;
      const actorId = actor.userId || actor._id?.toString();
      const query = invoiceQuerySchema.parse(req.query);

      const result = await FinanceService.listInvoices(query, actorId, UserRole.STUDENT);
      sendSuccess(res, result.invoices, 'Invoices retrieved successfully', {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getStudentInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const actor = req.user as any;
      const actorId = actor.userId || actor._id?.toString();
      const studentId = String(req.params.studentId);
      const query = invoiceQuerySchema.parse(req.query);
      query.studentId = studentId;

      const result = await FinanceService.listInvoices(
        query,
        actorId,
        actor.activeRole || UserRole.GUARDIAN
      );
      sendSuccess(res, result.invoices, 'Student invoices retrieved successfully', {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const actor = req.user as any;
      const actorId = actor.userId || actor._id?.toString();
      const id = String(req.params.id);

      const invoice = await FinanceService.getInvoiceById(
        id,
        actorId,
        actor.activeRole || UserRole.STUDENT
      );
      sendSuccess(res, invoice, 'Invoice retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async listInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = invoiceQuerySchema.parse(req.query);
      const result = await FinanceService.listInvoices(query);
      sendSuccess(res, result.invoices, 'Invoices retrieved successfully', {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      });
    } catch (err) {
      next(err);
    }
  }

  static async waiveInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const id = String(req.params.id);
      const reason = String(req.body.reason || 'Administrative tuition waiver');
      const invoice = await FinanceService.waiveInvoice(id, reason, req.user as any);
      sendSuccess(res, invoice, 'Invoice waived successfully');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================================================
  // Payments
  // ==========================================================================

  static async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const input = recordPaymentSchema.parse(req.body);
      const payment = await FinanceService.recordPayment(input, req.user as any);
      sendCreated(res, payment, 'Payment recorded successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getMyPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const actor = req.user as any;
      const actorId = actor.userId || actor._id?.toString();
      const query = paymentQuerySchema.parse(req.query);

      const result = await FinanceService.listPayments(query, actorId, UserRole.STUDENT);
      sendSuccess(res, result.payments, 'Payments retrieved successfully', {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getStudentPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const studentId = String(req.params.studentId);
      const query = paymentQuerySchema.parse(req.query);
      query.studentId = studentId;

      const result = await FinanceService.listPayments(query);
      sendSuccess(res, result.payments, 'Student payments retrieved successfully', {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPaymentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const payment = await FinanceService.getPaymentById(id);
      sendSuccess(res, payment, 'Payment retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async listPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = paymentQuerySchema.parse(req.query);
      const result = await FinanceService.listPayments(query);
      sendSuccess(res, result.payments, 'Payments retrieved successfully', {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const actor = req.user as any;
      const actorId = actor.userId || actor._id?.toString();
      const id = String(req.params.id);

      const receipt = await FinanceService.getReceiptByPaymentId(
        id,
        actorId,
        actor.activeRole || UserRole.STUDENT
      );
      sendSuccess(res, receipt, 'Receipt retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async downloadReceiptPDF(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const actor = req.user as any;
      const actorId = actor.userId || actor._id?.toString();
      const id = String(req.params.id);

      const pdfBuffer = await FinanceService.getReceiptPDF(
        id,
        actorId,
        actor.activeRole || UserRole.STUDENT
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ETA-Receipt-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================================================
  // Refunds
  // ==========================================================================

  static async requestRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const input = requestRefundSchema.parse(req.body);
      const refund = await FinanceService.requestRefund(input, req.user as any);
      sendCreated(res, refund, 'Refund requested successfully');
    } catch (err) {
      next(err);
    }
  }

  static async approveRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const id = String(req.params.id);
      const input = approveRefundSchema.parse(req.body);
      const refund = await FinanceService.approveRefund(id, input, req.user as any);
      sendSuccess(res, refund, `Refund ${input.approved ? 'approved' : 'rejected'} successfully`);
    } catch (err) {
      next(err);
    }
  }

  static async listRefunds(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refunds = await FinanceService.listRefunds();
      sendSuccess(res, refunds, 'Refunds retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================================================
  // Scholarships
  // ==========================================================================

  static async createScholarship(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const input = createScholarshipSchema.parse(req.body);
      const scholarship = await FinanceService.createScholarship(input, req.user as any);
      sendCreated(res, scholarship, 'Scholarship created successfully');
    } catch (err) {
      next(err);
    }
  }

  static async listScholarships(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const scholarships = await FinanceService.listScholarships(req.query as any);
      sendSuccess(res, scholarships, 'Scholarships retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================================================
  // Summary
  // ==========================================================================

  static async getFinanceSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await FinanceService.getFinanceSummary();
      sendSuccess(res, summary, 'Finance summary metrics retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}
