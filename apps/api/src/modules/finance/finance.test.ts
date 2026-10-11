import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import {
  UserRole,
  InvoiceStatus,
  PaymentMethod,
  FinancePaymentStatus,
  FeeStructureStatus,
  ScholarshipType,
  DiscountType,
  RefundStatus,
  type IUser,
} from '@eta/types';
import { FinanceService } from './finance.service.js';
import { FeeStructure } from './fee-structure.model.js';
import { Invoice } from './invoice.model.js';
import { Payment } from './payment.model.js';
import { Scholarship } from './scholarship.model.js';
import { Refund } from './refund.model.js';
import { User } from '../users/user.model.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { GuardianLink } from '../users/guardian-link.model.js';
import { NotificationDispatcher } from '../communication/notification-dispatcher.js';

vi.mock('./fee-structure.model', () => {
  const mockDoc: any = function (data: any) {
    Object.assign(this, data);
    this._id = new mongoose.Types.ObjectId();
    this.save = vi.fn().mockResolvedValue(this);
  };
  mockDoc.find = vi.fn();
  mockDoc.findById = vi.fn();
  mockDoc.findOne = vi.fn();
  return {
    FeeStructure: mockDoc,
    toFeeStructureDTO: vi.fn((doc) => ({
      id: doc._id?.toString() || doc.id || 'fs-1',
      name: doc.name,
      code: doc.code,
      currency: doc.currency || 'USD',
      items: doc.items || [],
      totalAmountMinor: doc.totalAmountMinor || 15000,
      status: doc.status || FeeStructureStatus.ACTIVE,
      effectiveFrom: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  };
});

vi.mock('./invoice.model', () => {
  const mockDoc: any = function (data: any) {
    Object.assign(this, data);
    this._id = new mongoose.Types.ObjectId();
    this.save = vi.fn().mockResolvedValue(this);
  };
  const createChainableQuery = (result: any = null) => {
    const q: any = {
      lean: vi.fn().mockResolvedValue(result),
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(result),
      then: (resolve: any) => Promise.resolve(result).then(resolve),
      catch: (reject: any) => Promise.resolve(result).catch(reject),
    };
    return q;
  };

  mockDoc.find = vi.fn().mockImplementation(() => createChainableQuery([]));
  mockDoc.findById = vi.fn().mockImplementation(() => createChainableQuery(null));
  mockDoc.findOne = vi.fn().mockImplementation(() => createChainableQuery(null));
  mockDoc.countDocuments = vi.fn().mockResolvedValue(0);
  mockDoc.aggregate = vi.fn().mockResolvedValue([]);
  return {
    Invoice: mockDoc,
    toInvoiceDTO: vi.fn((doc) => ({
      id: doc._id?.toString() || doc.id || 'inv-1',
      invoiceNumber: doc.invoiceNumber || 'INV-2026-TEST1234',
      studentId: doc.studentId?.toString() || 'student-1',
      totalAmountMinor: doc.totalAmountMinor,
      paidAmountMinor: doc.paidAmountMinor || 0,
      refundedAmountMinor: doc.refundedAmountMinor || 0,
      balanceMinor: doc.balanceMinor,
      status: doc.status,
      currency: doc.currency || 'USD',
      dueDate: new Date().toISOString(),
      issuedAt: new Date().toISOString(),
      lineItems: doc.lineItems || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  };
});

vi.mock('./payment.model', () => {
  const mockDoc: any = function (data: any) {
    Object.assign(this, data);
    this._id = new mongoose.Types.ObjectId();
    this.save = vi.fn().mockResolvedValue(this);
  };
  const createChainableQuery = (result: any = null) => ({
    lean: vi.fn().mockResolvedValue(result),
    populate: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(result),
    then: (resolve: any) => Promise.resolve(result).then(resolve),
    catch: (reject: any) => Promise.resolve(result).catch(reject),
  });
  mockDoc.find = vi.fn().mockImplementation(() => createChainableQuery([]));
  mockDoc.findById = vi.fn().mockImplementation(() => createChainableQuery(null));
  mockDoc.findOne = vi.fn().mockImplementation(() => createChainableQuery(null));
  mockDoc.countDocuments = vi.fn().mockResolvedValue(0);
  return {
    Payment: mockDoc,
    toPaymentDTO: vi.fn((doc) => ({
      id: doc._id?.toString() || doc.id || 'pay-1',
      paymentNumber: doc.paymentNumber || 'PAY-2026-TEST1234',
      studentId: doc.studentId?.toString() || 'student-1',
      invoiceId: doc.invoiceId?.toString() || 'inv-1',
      amountMinor: doc.amountMinor,
      currency: doc.currency || 'USD',
      paymentMethod: doc.paymentMethod || PaymentMethod.CASH,
      status: doc.status || FinancePaymentStatus.COMPLETED,
      paidAt: new Date().toISOString(),
      receiptNumber: doc.receiptNumber || 'REC-2026-TEST1234',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  };
});

vi.mock('./scholarship.model', () => {
  const mockDoc: any = function (data: any) {
    Object.assign(this, data);
    this._id = new mongoose.Types.ObjectId();
    this.save = vi.fn().mockResolvedValue(this);
  };
  const createChainableQuery = (result: any = null) => ({
    lean: vi.fn().mockResolvedValue(result),
    populate: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(result),
    then: (resolve: any) => Promise.resolve(result).then(resolve),
    catch: (reject: any) => Promise.resolve(result).catch(reject),
  });
  mockDoc.find = vi.fn().mockImplementation(() => createChainableQuery([]));
  mockDoc.findById = vi.fn().mockImplementation(() => createChainableQuery(null));
  mockDoc.findOne = vi.fn().mockImplementation(() => createChainableQuery(null));
  return {
    Scholarship: mockDoc,
    toScholarshipDTO: vi.fn((doc) => ({
      id: doc._id?.toString() || doc.id || 'sch-1',
      title: doc.title,
      code: doc.code,
      discountType: doc.discountType,
      discountValue: doc.discountValue,
      status: doc.status || 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  };
});

vi.mock('./refund.model', () => {
  const mockDoc: any = function (data: any) {
    Object.assign(this, data);
    this._id = new mongoose.Types.ObjectId();
    this.save = vi.fn().mockResolvedValue(this);
  };
  const createChainableQuery = (result: any = null) => ({
    lean: vi.fn().mockResolvedValue(result),
    populate: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(result),
    then: (resolve: any) => Promise.resolve(result).then(resolve),
    catch: (reject: any) => Promise.resolve(result).catch(reject),
  });
  mockDoc.find = vi.fn().mockImplementation(() => createChainableQuery([]));
  mockDoc.findById = vi.fn().mockImplementation(() => createChainableQuery(null));
  mockDoc.findOne = vi.fn().mockImplementation(() => createChainableQuery(null));
  mockDoc.aggregate = vi.fn().mockResolvedValue([]);
  return {
    Refund: mockDoc,
    toRefundDTO: vi.fn((doc) => ({
      id: doc._id?.toString() || doc.id || 'ref-1',
      refundNumber: doc.refundNumber || 'REF-2026-TEST1234',
      paymentId: doc.paymentId?.toString(),
      invoiceId: doc.invoiceId?.toString(),
      studentId: doc.studentId?.toString(),
      amountMinor: doc.amountMinor,
      status: doc.status,
      reason: doc.reason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  };
});

vi.mock('../users/user.model', () => ({
  User: {
    findById: vi.fn(),
  },
}));

vi.mock('../academic/course.model', () => ({
  Course: {
    findById: vi.fn(),
  },
}));

vi.mock('../academic/batch.model', () => ({
  Batch: {
    findById: vi.fn(),
  },
}));

vi.mock('../academic/enrollment.model', () => ({
  Enrollment: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('../users/guardian-link.model', () => ({
  GuardianLink: {
    findOne: vi.fn(),
  },
}));

vi.mock('../communication/notification-dispatcher', () => ({
  NotificationDispatcher: {
    dispatch: vi.fn().mockResolvedValue(1),
  },
}));

describe('Phase 10 Finance & Fee Management Module', () => {
  const studentId = new mongoose.Types.ObjectId().toString();
  const courseId = new mongoose.Types.ObjectId().toString();
  const batchId = new mongoose.Types.ObjectId().toString();
  const adminId = new mongoose.Types.ObjectId().toString();
  const guardianId = new mongoose.Types.ObjectId().toString();

  const mockAdminUser: IUser = {
    _id: adminId,
    email: 'bursar@eta.edu',
    name: 'Bursar Director',
    roles: [UserRole.ADMIN],
    activeRole: UserRole.ADMIN,
    status: 'ACTIVE' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fee Structure & Invoicing', () => {
    it('creates fee structure with precise integer minor units', async () => {
      const fs = await FinanceService.createFeeStructure(
        {
          name: 'Computer Science Standard 2026',
          code: 'CS-2026-STD',
          currency: 'USD',
          items: [
            { name: 'Tuition', itemType: 'TUITION' as any, amountMinor: 10000, isMandatory: true },
            { name: 'Lab Access', itemType: 'MATERIALS' as any, amountMinor: 2500, isMandatory: true },
            { name: 'Optional Activity', itemType: 'ACTIVITY' as any, amountMinor: 1500, isMandatory: false },
          ],
          effectiveFrom: new Date().toISOString(),
        },
        mockAdminUser
      );

      expect(fs).toBeDefined();
      expect(fs.code).toBe('CS-2026-STD');
    });

    it('creates single invoice with percentage discount and scholarship calculation', async () => {
      (User.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: studentId, name: 'Alice Scholar', email: 'alice@eta.edu' }),
      });
      (Course.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: courseId, title: 'Web Architecture' }),
      });
      (Scholarship.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          title: 'Dean Excellence',
          discountType: DiscountType.PERCENTAGE,
          discountValue: 20, // 20% scholarship
          status: 'ACTIVE',
        }),
      });

      // Subtotal: 20000 ($200.00). 10% discount = 2000. 20% scholarship = 4000. Total = 14000 ($140.00).
      const invoice = await FinanceService.createInvoice(
        {
          studentId,
          courseId,
          lineItems: [
            { name: 'Full Semester Tuition', itemType: 'TUITION' as any, unitAmountMinor: 20000, quantity: 1 },
          ],
          discount: {
            type: DiscountType.PERCENTAGE,
            value: 10,
            reason: 'Early Bird Promotion',
          },
          scholarshipId: new mongoose.Types.ObjectId().toString(),
          dueDate: new Date(Date.now() + 86400000 * 30).toISOString(),
        },
        mockAdminUser
      );

      expect(invoice).toBeDefined();
      expect(NotificationDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'INVOICE_ISSUED',
          recipientUserIds: [studentId],
        })
      );
    });

    it('waives an invoice, zeroing balance and recording administrative reason', async () => {
      const invId = new mongoose.Types.ObjectId().toString();
      const mockInvoice = {
        _id: new mongoose.Types.ObjectId(invId),
        status: InvoiceStatus.UNPAID,
        balanceMinor: 15000,
        notes: '',
        save: vi.fn().mockResolvedValue(true),
      };

      (Invoice.findById as any).mockResolvedValue(mockInvoice);

      const waived = await FinanceService.waiveInvoice(
        invId,
        'Full institutional hardship waiver granted by committee',
        mockAdminUser
      );

      expect(mockInvoice.status).toBe(InvoiceStatus.WAIVED);
      expect(mockInvoice.balanceMinor).toBe(0);
      expect(mockInvoice.notes).toContain('hardship waiver');
      expect(mockInvoice.save).toHaveBeenCalled();
    });
  });

  describe('Payments & Allocations', () => {
    it('records partial payment: transitions status to partially_paid and reduces balance', async () => {
      const invId = new mongoose.Types.ObjectId().toString();
      const mockInvoice = {
        _id: new mongoose.Types.ObjectId(invId),
        invoiceNumber: 'INV-2026-0001',
        studentId: new mongoose.Types.ObjectId(studentId),
        totalAmountMinor: 10000, // $100.00
        paidAmountMinor: 0,
        refundedAmountMinor: 0,
        balanceMinor: 10000,
        status: InvoiceStatus.UNPAID,
        currency: 'USD',
        save: vi.fn().mockResolvedValue(true),
      };

      (Invoice.findById as any).mockResolvedValue(mockInvoice);

      const payment = await FinanceService.recordPayment(
        {
          invoiceId: invId,
          amountMinor: 4000, // $40.00 partial
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          reference: 'TXN-WIRE-9988',
        },
        mockAdminUser
      );

      expect(payment).toBeDefined();
      expect(mockInvoice.paidAmountMinor).toBe(4000);
      expect(mockInvoice.balanceMinor).toBe(6000);
      expect(mockInvoice.status).toBe(InvoiceStatus.PARTIALLY_PAID);
      expect(mockInvoice.save).toHaveBeenCalled();
      expect(NotificationDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PAYMENT_RECEIVED',
        })
      );
    });

    it('records full settlement: transitions status to paid and clears balance', async () => {
      const invId = new mongoose.Types.ObjectId().toString();
      const mockInvoice = {
        _id: new mongoose.Types.ObjectId(invId),
        invoiceNumber: 'INV-2026-0002',
        studentId: new mongoose.Types.ObjectId(studentId),
        totalAmountMinor: 10000,
        paidAmountMinor: 6000,
        refundedAmountMinor: 0,
        balanceMinor: 4000, // $40.00 remaining
        status: InvoiceStatus.PARTIALLY_PAID,
        currency: 'USD',
        save: vi.fn().mockResolvedValue(true),
      };

      (Invoice.findById as any).mockResolvedValue(mockInvoice);
      (Invoice.countDocuments as any).mockResolvedValue(0);

      const payment = await FinanceService.recordPayment(
        {
          invoiceId: invId,
          amountMinor: 4000, // Settle full remainder
          paymentMethod: PaymentMethod.CARD,
        },
        mockAdminUser
      );

      expect(mockInvoice.paidAmountMinor).toBe(10000);
      expect(mockInvoice.balanceMinor).toBe(0);
      expect(mockInvoice.status).toBe(InvoiceStatus.PAID);
      expect(mockInvoice.paidAt).toBeDefined();
    });

    it('rejects overpayment exceeding invoice outstanding balance', async () => {
      const invId = new mongoose.Types.ObjectId().toString();
      const mockInvoice = {
        _id: new mongoose.Types.ObjectId(invId),
        invoiceNumber: 'INV-2026-0003',
        totalAmountMinor: 10000,
        paidAmountMinor: 8000,
        refundedAmountMinor: 0,
        balanceMinor: 2000, // Only $20.00 left
        status: InvoiceStatus.PARTIALLY_PAID,
      };

      (Invoice.findById as any).mockResolvedValue(mockInvoice);

      await expect(
        FinanceService.recordPayment(
          {
            invoiceId: invId,
            amountMinor: 5000, // Attempting $50.00!
            paymentMethod: PaymentMethod.CASH,
          },
          mockAdminUser
        )
      ).rejects.toThrow('exceeds outstanding invoice balance');
    });

    it('safely handles idempotency for external gateway transaction ID retries', async () => {
      const invId = new mongoose.Types.ObjectId().toString();
      const mockExistingPayment = {
        _id: new mongoose.Types.ObjectId(),
        paymentNumber: 'PAY-2026-EXISTING',
        externalTransactionId: 'stripe_ch_992211',
        amountMinor: 5000,
        status: FinancePaymentStatus.COMPLETED,
      };

      (Invoice.findById as any).mockResolvedValue({
        _id: new mongoose.Types.ObjectId(invId),
        balanceMinor: 5000,
        status: InvoiceStatus.UNPAID,
      });

      (Payment.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockExistingPayment),
      });

      const res = await FinanceService.recordPayment(
        {
          invoiceId: invId,
          amountMinor: 5000,
          paymentMethod: PaymentMethod.ONLINE_GATEWAY,
          externalTransactionId: 'stripe_ch_992211',
        },
        mockAdminUser
      );

      expect(res.paymentNumber).toBe('PAY-2026-EXISTING');
    });
  });

  describe('Refunds & Reversals', () => {
    it('requests and approves refund, updating invoice balance and liability', async () => {
      const payId = new mongoose.Types.ObjectId().toString();
      const invId = new mongoose.Types.ObjectId().toString();

      const mockPayment = {
        _id: new mongoose.Types.ObjectId(payId),
        invoiceId: new mongoose.Types.ObjectId(invId),
        studentId: new mongoose.Types.ObjectId(studentId),
        amountMinor: 10000,
        currency: 'USD',
      };
      (Payment.findById as any).mockResolvedValue(mockPayment);

      const mockInvoice = {
        _id: new mongoose.Types.ObjectId(invId),
        totalAmountMinor: 10000,
        paidAmountMinor: 10000,
        refundedAmountMinor: 0,
        balanceMinor: 0,
        status: InvoiceStatus.PAID,
        save: vi.fn().mockResolvedValue(true),
      };
      (Invoice.findById as any).mockResolvedValue(mockInvoice);
      (Refund.aggregate as any).mockResolvedValue([]);

      const refundReq = await FinanceService.requestRefund(
        {
          paymentId: payId,
          amountMinor: 5000, // Partial refund $50.00
          reason: 'Student dropped course within refund window',
        },
        mockAdminUser
      );

      expect(refundReq).toBeDefined();

      // Now approve refund
      const mockRefundDoc = {
        _id: new mongoose.Types.ObjectId(),
        refundNumber: 'REF-2026-9900',
        paymentId: new mongoose.Types.ObjectId(payId),
        invoiceId: new mongoose.Types.ObjectId(invId),
        studentId: new mongoose.Types.ObjectId(studentId),
        amountMinor: 5000,
        currency: 'USD',
        reason: 'Student dropped course within refund window',
        status: RefundStatus.PENDING,
        save: vi.fn().mockResolvedValue(true),
      };
      (Refund.findById as any).mockResolvedValue(mockRefundDoc);

      const approved = await FinanceService.approveRefund(
        mockRefundDoc._id.toString(),
        { approved: true },
        mockAdminUser
      );

      expect(mockRefundDoc.status).toBe(RefundStatus.COMPLETED);
      expect(mockInvoice.refundedAmountMinor).toBe(5000);
      expect(mockInvoice.balanceMinor).toBe(5000); // Restored $50 liability
      expect(mockInvoice.status).toBe(InvoiceStatus.PARTIALLY_PAID);
      expect(mockInvoice.save).toHaveBeenCalled();
      expect(NotificationDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REFUND_PROCESSED',
        })
      );
    });

    it('rejects refund request exceeding original payment amount', async () => {
      const payId = new mongoose.Types.ObjectId().toString();
      const mockPayment = {
        _id: new mongoose.Types.ObjectId(payId),
        amountMinor: 5000,
      };
      (Payment.findById as any).mockResolvedValue(mockPayment);
      (Invoice.findById as any).mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
      (Refund.aggregate as any).mockResolvedValue([]);

      await expect(
        FinanceService.requestRefund(
          {
            paymentId: payId,
            amountMinor: 8000, // Exceeds $50.00!
            reason: 'Excessive refund attempt',
          },
          mockAdminUser
        )
      ).rejects.toThrow('exceeds maximum refundable balance');
    });
  });

  describe('Receipt & Digital Artifacts', () => {
    it('generates receipt DTO and PDF buffer for paid transaction', async () => {
      const payId = new mongoose.Types.ObjectId().toString();
      const invId = new mongoose.Types.ObjectId().toString();

      (Payment.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(payId),
          paymentNumber: 'PAY-2026-REC-1',
          receiptNumber: 'REC-2026-0001',
          invoiceId: new mongoose.Types.ObjectId(invId),
          studentId: new mongoose.Types.ObjectId(studentId),
          amountMinor: 15000,
          currency: 'USD',
          paymentMethod: PaymentMethod.CARD,
          paidAt: new Date(),
        }),
      });

      (Invoice.findById as any).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: new mongoose.Types.ObjectId(invId),
            invoiceNumber: 'INV-2026-0099',
            title: 'Tuition and Fees',
            courseId: { title: 'Full-Stack Development' },
          }),
        }),
      });

      (User.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(studentId),
          name: 'Bob Student',
          email: 'bob@eta.edu',
        }),
      });

      const receipt = await FinanceService.getReceiptByPaymentId(payId);
      expect(receipt.receiptNumber).toBe('REC-2026-0001');
      expect(receipt.studentName).toBe('Bob Student');
      expect(receipt.amountMinor).toBe(15000);

      const pdf = await FinanceService.getReceiptPDF(payId);
      expect(Buffer.isBuffer(pdf)).toBe(true);
      expect(pdf.toString('utf-8', 0, 8)).toContain('%PDF-1.4');
    });
  });

  describe('Authorization & IDOR Protection', () => {
    it('rejects student attempting to access another student invoice', async () => {
      const otherStudentId = new mongoose.Types.ObjectId().toString();
      const invId = new mongoose.Types.ObjectId().toString();

      (Invoice.findById as any).mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(invId),
          studentId: new mongoose.Types.ObjectId(otherStudentId),
        }),
      });

      await expect(
        FinanceService.getInvoiceById(invId, studentId, UserRole.STUDENT)
      ).rejects.toThrow('Students can only view their own invoices');
    });

    it('allows active verified guardian to access linked child invoice', async () => {
      const invId = new mongoose.Types.ObjectId().toString();

      (Invoice.findById as any).mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(invId),
          studentId: new mongoose.Types.ObjectId(studentId),
          invoiceNumber: 'INV-2026-WARD',
        }),
      });

      (GuardianLink.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          guardianId: new mongoose.Types.ObjectId(guardianId),
          studentId: new mongoose.Types.ObjectId(studentId),
          status: 'ACTIVE',
          verified: true,
        }),
      });

      const inv = await FinanceService.getInvoiceById(invId, guardianId, UserRole.GUARDIAN);
      expect(inv).toBeDefined();
    });
  });

  describe('Certificate Tuition Clearance Integration (PRD §50)', () => {
    it('reports tuition cleared when all invoices are paid or waived', async () => {
      (Invoice.find as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            invoiceNumber: 'INV-2026-A1',
            status: InvoiceStatus.PAID,
            balanceMinor: 0,
            currency: 'USD',
          },
          {
            invoiceNumber: 'INV-2026-A2',
            status: InvoiceStatus.WAIVED,
            balanceMinor: 0,
            currency: 'USD',
          },
        ]),
      });

      const clearance = await FinanceService.checkStudentTuitionClearance(studentId, courseId);
      expect(clearance.cleared).toBe(true);
      expect(clearance.totalOutstandingMinor).toBe(0);
      expect(clearance.unpaidInvoices).toHaveLength(0);
    });

    it('reports tuition not cleared and lists unpaid invoices when outstanding balance exists', async () => {
      (Invoice.find as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            invoiceNumber: 'INV-2026-DUE',
            status: InvoiceStatus.UNPAID,
            balanceMinor: 7500, // $75.00
            currency: 'USD',
          },
        ]),
      });

      const clearance = await FinanceService.checkStudentTuitionClearance(studentId, courseId);
      expect(clearance.cleared).toBe(false);
      expect(clearance.totalOutstandingMinor).toBe(7500);
      expect(clearance.reasons[0]).toContain('INV-2026-DUE has outstanding balance');
    });
  });
});
