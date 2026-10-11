import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  InvoiceStatus,
  PaymentMethod,
  FinancePaymentStatus,
  FeeStructureStatus,
  RefundStatus,
  DiscountType,
  UserRole,
  PaymentStatus as AcademicPaymentStatus,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  type IFeeStructure,
  type IInvoice,
  type IPayment,
  type IScholarship,
  type IRefund,
  type IReceipt,
  type IFinanceSummary,
  type CreateFeeStructureDto,
  type UpdateFeeStructureDto,
  type CreateInvoiceDto,
  type BulkCreateInvoicesDto,
  type RecordPaymentDto,
  type CreateScholarshipDto,
  type RequestRefundDto,
  type ApproveRefundDto,
  type InvoiceQuery,
  type PaymentQuery,
  type IUser,
} from '@eta/types';
import { FeeStructure, toFeeStructureDTO } from './fee-structure.model.js';
import { Invoice, toInvoiceDTO } from './invoice.model.js';
import { Payment, toPaymentDTO } from './payment.model.js';
import { Scholarship, toScholarshipDTO } from './scholarship.model.js';
import { Refund, toRefundDTO } from './refund.model.js';
import { ReceiptGeneratorService } from './receipt-generator.service.js';
import { User } from '../users/user.model.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { GuardianLink } from '../users/guardian-link.model.js';
import { NotificationDispatcher } from '../communication/notification-dispatcher.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../common/errors.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction, AuditCategory, AuditSeverity, AuditResult, AuditActorType } from '@eta/types';

export class FinanceService {
  // ==========================================================================
  // Identifier Generators
  // ==========================================================================

  public static async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    let attempts = 0;
    while (attempts < 10) {
      const code = `INV-${year}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const query = Invoice.findOne({ invoiceNumber: code });
      const existing = query && typeof (query as any).lean === 'function' ? await (query as any).lean() : await query;
      if (!existing) return code;
      attempts++;
    }
    return `INV-${year}-${Date.now().toString(36).toUpperCase()}`;
  }

  public static async generatePaymentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    let attempts = 0;
    while (attempts < 10) {
      const code = `PAY-${year}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const query = Payment.findOne({ paymentNumber: code });
      const existing = query && typeof (query as any).lean === 'function' ? await (query as any).lean() : await query;
      if (!existing) return code;
      attempts++;
    }
    return `PAY-${year}-${Date.now().toString(36).toUpperCase()}`;
  }

  public static async generateReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear();
    let attempts = 0;
    while (attempts < 10) {
      const code = `REC-${year}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const query = Payment.findOne({ receiptNumber: code });
      const existing = query && typeof (query as any).lean === 'function' ? await (query as any).lean() : await query;
      if (!existing) return code;
      attempts++;
    }
    return `REC-${year}-${Date.now().toString(36).toUpperCase()}`;
  }

  public static async generateRefundNumber(): Promise<string> {
    const year = new Date().getFullYear();
    let attempts = 0;
    while (attempts < 10) {
      const code = `REF-${year}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const query = Refund.findOne({ refundNumber: code });
      const existing = query && typeof (query as any).lean === 'function' ? await (query as any).lean() : await query;
      if (!existing) return code;
      attempts++;
    }
    return `REF-${year}-${Date.now().toString(36).toUpperCase()}`;
  }

  // ==========================================================================
  // Fee Structure Engine
  // ==========================================================================

  static async createFeeStructure(
    dto: CreateFeeStructureDto,
    _actor: IUser
  ): Promise<IFeeStructure> {
    const totalAmountMinor = dto.items.reduce((sum, item) => sum + (item.isMandatory !== false ? item.amountMinor : 0), 0);

    const feeStructure = new FeeStructure({
      name: dto.name.trim(),
      code: dto.code.trim().toUpperCase(),
      description: dto.description?.trim(),
      programId: dto.programId && mongoose.Types.ObjectId.isValid(dto.programId) ? new mongoose.Types.ObjectId(dto.programId) : undefined,
      courseId: dto.courseId && mongoose.Types.ObjectId.isValid(dto.courseId) ? new mongoose.Types.ObjectId(dto.courseId) : undefined,
      batchId: dto.batchId && mongoose.Types.ObjectId.isValid(dto.batchId) ? new mongoose.Types.ObjectId(dto.batchId) : undefined,
      currency: dto.currency || 'USD',
      items: dto.items,
      totalAmountMinor,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      status: FeeStructureStatus.ACTIVE,
    });

    await feeStructure.save();

    const actorIdStr = (_actor as any).userId || (_actor as any)._id?.toString();
    await AuditService.record({
      actor: {
        id: actorIdStr,
        name: (_actor as any).name,
        email: (_actor as any).email,
        role: (_actor as any).activeRole || (_actor as any).roles?.[0],
        type: AuditActorType.USER,
      },
      action: AuditAction.FEE_STRUCTURE_CREATED,
      category: AuditCategory.FINANCE,
      resourceType: 'FeeStructure',
      resourceId: feeStructure._id.toString(),
      newValue: {
        name: feeStructure.name,
        code: feeStructure.code,
        currency: feeStructure.currency,
        totalAmountMinor: feeStructure.totalAmountMinor,
        status: feeStructure.status,
      },
      severity: AuditSeverity.MEDIUM,
      result: AuditResult.SUCCESS,
    });

    return toFeeStructureDTO(feeStructure);
  }

  static async getFeeStructureById(id: string): Promise<IFeeStructure> {
    const fs = await FeeStructure.findById(id).lean();
    if (!fs) throw new NotFoundError('FeeStructure');
    return toFeeStructureDTO(fs);
  }

  static async listFeeStructures(query: { status?: FeeStructureStatus; courseId?: string; batchId?: string }): Promise<IFeeStructure[]> {
    const filter: Record<string, any> = {};
    if (query.status) filter.status = query.status;
    if (query.courseId && mongoose.Types.ObjectId.isValid(query.courseId)) filter.courseId = new mongoose.Types.ObjectId(query.courseId);
    if (query.batchId && mongoose.Types.ObjectId.isValid(query.batchId)) filter.batchId = new mongoose.Types.ObjectId(query.batchId);

    const list = await FeeStructure.find(filter).sort({ createdAt: -1 }).lean();
    return list.map(toFeeStructureDTO);
  }

  static async updateFeeStructure(
    id: string,
    dto: UpdateFeeStructureDto,
    _actor: IUser
  ): Promise<IFeeStructure> {
    const fs = await FeeStructure.findById(id);
    if (!fs) throw new NotFoundError('FeeStructure');

    const previousValue = {
      name: fs.name,
      description: fs.description,
      currency: fs.currency,
      status: fs.status,
      totalAmountMinor: fs.totalAmountMinor,
    };

    if (dto.name) fs.name = dto.name.trim();
    if (dto.description !== undefined) fs.description = dto.description?.trim();
    if (dto.currency) fs.currency = dto.currency;
    if (dto.status) fs.status = dto.status;
    if (dto.effectiveFrom) fs.effectiveFrom = new Date(dto.effectiveFrom);
    if (dto.effectiveTo !== undefined) fs.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : undefined;

    if (dto.items) {
      fs.items = dto.items as any;
      fs.totalAmountMinor = dto.items.reduce((sum, item) => sum + (item.isMandatory !== false ? item.amountMinor : 0), 0);
    }

    await fs.save();

    const actorIdStr = (_actor as any).userId || (_actor as any)._id?.toString();
    await AuditService.record({
      actor: {
        id: actorIdStr,
        name: (_actor as any).name,
        email: (_actor as any).email,
        role: (_actor as any).activeRole || (_actor as any).roles?.[0],
        type: AuditActorType.USER,
      },
      action: AuditAction.FEE_STRUCTURE_UPDATED,
      category: AuditCategory.FINANCE,
      resourceType: 'FeeStructure',
      resourceId: fs._id.toString(),
      previousValue,
      newValue: {
        name: fs.name,
        description: fs.description,
        currency: fs.currency,
        status: fs.status,
        totalAmountMinor: fs.totalAmountMinor,
      },
      severity: AuditSeverity.MEDIUM,
      result: AuditResult.SUCCESS,
    });

    return toFeeStructureDTO(fs);
  }

  // ==========================================================================
  // Invoice Engine
  // ==========================================================================

  static async createInvoice(
    dto: CreateInvoiceDto,
    actor: IUser
  ): Promise<IInvoice> {
    const actorIdStr = (actor as any).userId || (actor as any)._id?.toString();

    const student = await User.findById(dto.studentId).lean();
    if (!student) throw new NotFoundError('Student');

    let course = null;
    if (dto.courseId && mongoose.Types.ObjectId.isValid(dto.courseId)) {
      course = await Course.findById(dto.courseId).lean();
    }

    let batch = null;
    if (dto.batchId && mongoose.Types.ObjectId.isValid(dto.batchId)) {
      batch = await Batch.findById(dto.batchId).lean();
    }

    let lineItems = dto.lineItems || [];
    let currency = dto.currency || 'USD';

    // If feeStructureId provided, snapshot items from it
    if (dto.feeStructureId && mongoose.Types.ObjectId.isValid(dto.feeStructureId)) {
      const fs = await FeeStructure.findById(dto.feeStructureId).lean();
      if (fs) {
        currency = fs.currency;
        if (!lineItems.length) {
          lineItems = fs.items.map((i) => ({
            name: i.name,
            itemType: i.itemType,
            unitAmountMinor: i.amountMinor,
            quantity: 1,
            totalAmountMinor: i.amountMinor,
          }));
        }
      }
    }

    if (!lineItems.length) {
      lineItems = [
        {
          name: course ? `Tuition Fee — ${course.title}` : 'Academic Tuition',
          itemType: 'TUITION' as any,
          unitAmountMinor: 10000, // Default $100.00
          quantity: 1,
        },
      ];
    }

    // Precise Subtotal Calculation (minor units)
    const normalizedLineItems = lineItems.map((li) => ({
      name: li.name,
      itemType: li.itemType,
      unitAmountMinor: li.unitAmountMinor,
      quantity: li.quantity || 1,
      totalAmountMinor: li.unitAmountMinor * (li.quantity || 1),
    }));

    const subtotalMinor = normalizedLineItems.reduce((sum, item) => sum + item.totalAmountMinor, 0);

    // Precise Discount Calculation
    let discountMinor = 0;
    let discountDetails = undefined;
    if (dto.discount) {
      if (dto.discount.type === DiscountType.PERCENTAGE) {
        const pct = Math.min(100, Math.max(0, dto.discount.value));
        discountMinor = Math.round((subtotalMinor * pct) / 100);
      } else {
        discountMinor = Math.min(subtotalMinor, Math.round(dto.discount.value));
      }
      discountDetails = {
        type: dto.discount.type,
        value: dto.discount.value,
        amountMinor: discountMinor,
        reason: dto.discount.reason,
      };
    }

    // Precise Scholarship Deduction
    let scholarshipMinor = 0;
    let scholarshipId = undefined;
    if (dto.scholarshipId && mongoose.Types.ObjectId.isValid(dto.scholarshipId)) {
      const sch = await Scholarship.findById(dto.scholarshipId).lean();
      if (sch && sch.status === 'ACTIVE') {
        scholarshipId = sch._id;
        if (sch.discountType === DiscountType.PERCENTAGE) {
          scholarshipMinor = Math.round((subtotalMinor * sch.discountValue) / 100);
        } else {
          scholarshipMinor = sch.discountValue;
        }
        if (sch.maxAmountMinor && scholarshipMinor > sch.maxAmountMinor) {
          scholarshipMinor = sch.maxAmountMinor;
        }
      }
    }

    // Total cannot drop below zero
    const totalAmountMinor = Math.max(0, subtotalMinor - discountMinor - scholarshipMinor);
    const balanceMinor = totalAmountMinor;
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = new Invoice({
      invoiceNumber,
      studentId: new mongoose.Types.ObjectId(dto.studentId),
      enrollmentId: dto.enrollmentId && mongoose.Types.ObjectId.isValid(dto.enrollmentId) ? new mongoose.Types.ObjectId(dto.enrollmentId) : undefined,
      courseId: course ? course._id : undefined,
      batchId: batch ? batch._id : undefined,
      feeStructureId: dto.feeStructureId && mongoose.Types.ObjectId.isValid(dto.feeStructureId) ? new mongoose.Types.ObjectId(dto.feeStructureId) : undefined,
      title: dto.title?.trim() || (course ? `Tuition Invoice — ${course.title}` : 'Academic Tuition & Fees Invoice'),
      currency,
      lineItems: normalizedLineItems,
      subtotalMinor,
      discountMinor,
      discountDetails,
      scholarshipMinor,
      scholarshipId,
      totalAmountMinor,
      paidAmountMinor: 0,
      refundedAmountMinor: 0,
      balanceMinor,
      dueDate: new Date(dto.dueDate),
      status: balanceMinor === 0 ? InvoiceStatus.PAID : InvoiceStatus.UNPAID,
      issuedAt: new Date(),
      issuedBy: new mongoose.Types.ObjectId(actorIdStr),
      notes: dto.notes?.trim(),
    });

    await invoice.save();

    // If zero-balance invoice (100% scholarship/waiver), update enrollment payment status
    if (balanceMinor === 0 && invoice.enrollmentId) {
      await Enrollment.findByIdAndUpdate(invoice.enrollmentId, {
        paymentStatus: AcademicPaymentStatus.WAIVED,
      });
    }

    // Dispatches in-app and email notification
    try {
      await NotificationDispatcher.dispatch({
        type: NotificationType.INVOICE_ISSUED,
        category: NotificationCategory.FINANCE,
        priority: NotificationPriority.IMPORTANT,
        recipientUserIds: [dto.studentId],
        title: `New Invoice Issued: ${invoice.invoiceNumber}`,
        body: `An invoice of ${currency} ${(totalAmountMinor / 100).toFixed(2)} has been issued for "${invoice.title}". Due date: ${new Date(dto.dueDate).toLocaleDateString()}.`,
        actionUrl: '/student/finance',
        metadata: {
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          totalAmountMinor,
          currency,
        },
      });
    } catch (err) {
      console.error('Failed to dispatch invoice notification:', err);
    }

    await AuditService.record({
      actor: {
        id: actorIdStr,
        name: (actor as any).name,
        email: (actor as any).email,
        role: (actor as any).activeRole || (actor as any).roles?.[0],
        type: AuditActorType.USER,
      },
      action: AuditAction.INVOICE_CREATED,
      category: AuditCategory.FINANCE,
      resourceType: 'Invoice',
      resourceId: invoice._id.toString(),
      scope: {
        studentId: invoice.studentId?.toString(),
        courseId: invoice.courseId?.toString(),
        batchId: invoice.batchId?.toString(),
      },
      newValue: {
        invoiceNumber: invoice.invoiceNumber,
        totalAmountMinor: invoice.totalAmountMinor,
        balanceMinor: invoice.balanceMinor,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        status: invoice.status,
      },
      severity: AuditSeverity.MEDIUM,
      result: AuditResult.SUCCESS,
    });

    return toInvoiceDTO(invoice);
  }

  static async bulkCreateInvoices(
    dto: BulkCreateInvoicesDto,
    actor: IUser
  ): Promise<{
    createdCount: number;
    skippedCount: number;
    invoices: IInvoice[];
    skipped: Array<{ studentId: string; reason: string }>;
  }> {
    const fs = await FeeStructure.findById(dto.feeStructureId).lean();
    if (!fs) throw new NotFoundError('FeeStructure');

    // Retrieve candidate students enrolled in course/batch
    let studentIds = dto.studentIds;
    if (!studentIds || !studentIds.length) {
      const enrollQuery: Record<string, any> = {
        courseId: new mongoose.Types.ObjectId(dto.courseId),
      };
      if (dto.batchId && mongoose.Types.ObjectId.isValid(dto.batchId)) {
        enrollQuery.batchId = new mongoose.Types.ObjectId(dto.batchId);
      }
      const enrollments = await Enrollment.find(enrollQuery).select('studentId').lean();
      studentIds = enrollments.map((e) => e.studentId.toString());
    }

    const created: IInvoice[] = [];
    const skipped: Array<{ studentId: string; reason: string }> = [];

    for (const studentId of studentIds) {
      try {
        if (dto.skipExisting) {
          const existing = await Invoice.findOne({
            studentId: new mongoose.Types.ObjectId(studentId),
            feeStructureId: new mongoose.Types.ObjectId(dto.feeStructureId),
          }).lean();
          if (existing) {
            skipped.push({ studentId, reason: `Invoice ${existing.invoiceNumber} already exists for this fee structure` });
            continue;
          }
        }

        const inv = await this.createInvoice(
          {
            studentId,
            courseId: dto.courseId,
            batchId: dto.batchId,
            feeStructureId: dto.feeStructureId,
            dueDate: dto.dueDate,
            title: dto.title,
          },
          actor
        );
        created.push(inv);
      } catch (err: any) {
        skipped.push({ studentId, reason: err.message || 'Creation failed' });
      }
    }

    return {
      createdCount: created.length,
      skippedCount: skipped.length,
      invoices: created,
      skipped,
    };
  }

  static async getInvoiceById(
    invoiceId: string,
    actorId: string,
    actorRole: UserRole
  ): Promise<IInvoice> {
    const invoice = await Invoice.findById(invoiceId)
      .populate('studentId', 'name email')
      .populate('courseId', 'title code')
      .populate('batchId', 'batchCode')
      .populate('scholarshipId', 'title code')
      .lean();

    if (!invoice) throw new NotFoundError('Invoice');

    const sId = (invoice.studentId as any)?._id?.toString() || invoice.studentId?.toString();

    // Verify Access
    if (actorRole === UserRole.STUDENT) {
      if (sId !== actorId) {
        throw new ForbiddenError('Students can only view their own invoices');
      }
    } else if (actorRole === UserRole.GUARDIAN) {
      const link = await GuardianLink.findOne({
        guardianId: new mongoose.Types.ObjectId(actorId),
        studentId: new mongoose.Types.ObjectId(sId),
        status: 'ACTIVE',
        verified: true,
      }).lean();
      if (!link) {
        throw new ForbiddenError('Guardian is not authorized to view this student invoice');
      }
    }

    return toInvoiceDTO(invoice);
  }

  static async listInvoices(
    query: InvoiceQuery,
    actorId?: string,
    actorRole?: UserRole
  ): Promise<{
    invoices: IInvoice[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const filter: Record<string, any> = {};

    // Scoping based on role
    if (actorRole === UserRole.STUDENT) {
      filter.studentId = new mongoose.Types.ObjectId(actorId);
    } else if (query.studentId && mongoose.Types.ObjectId.isValid(query.studentId)) {
      filter.studentId = new mongoose.Types.ObjectId(query.studentId);
    }

    if (query.courseId && mongoose.Types.ObjectId.isValid(query.courseId)) {
      filter.courseId = new mongoose.Types.ObjectId(query.courseId);
    }
    if (query.batchId && mongoose.Types.ObjectId.isValid(query.batchId)) {
      filter.batchId = new mongoose.Types.ObjectId(query.batchId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.search) {
      filter.$or = [
        { invoiceNumber: { $regex: query.search.trim(), $options: 'i' } },
        { title: { $regex: query.search.trim(), $options: 'i' } },
      ];
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('studentId', 'name email')
        .populate('courseId', 'title code')
        .populate('batchId', 'batchCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    return {
      invoices: invoices.map(toInvoiceDTO),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  static async waiveInvoice(
    invoiceId: string,
    reason: string,
    actor: IUser
  ): Promise<IInvoice> {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new NotFoundError('Invoice');

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestError('Cannot waive a fully paid invoice');
    }

    invoice.status = InvoiceStatus.WAIVED;
    invoice.balanceMinor = 0;
    invoice.notes = invoice.notes
      ? `${invoice.notes}\nWaived by ${(actor as any).name || 'Admin'}: ${reason.trim()}`
      : `Waived by ${(actor as any).name || 'Admin'}: ${reason.trim()}`;

    await invoice.save();

    // Synchronize enrollment status if applicable
    if (invoice.enrollmentId) {
      await Enrollment.findByIdAndUpdate(invoice.enrollmentId, {
        paymentStatus: AcademicPaymentStatus.WAIVED,
      });
    }

    return toInvoiceDTO(invoice);
  }

  // ==========================================================================
  // Payment Processing & Allocation
  // ==========================================================================

  static async recordPayment(
    dto: RecordPaymentDto,
    actor: IUser
  ): Promise<IPayment> {
    const actorIdStr = (actor as any).userId || (actor as any)._id?.toString();

    const invoice = await Invoice.findById(dto.invoiceId);
    if (!invoice) throw new NotFoundError('Invoice');

    if ([InvoiceStatus.PAID, InvoiceStatus.WAIVED, InvoiceStatus.REFUNDED].includes(invoice.status)) {
      throw new BadRequestError(`Cannot record payment for invoice with status: ${invoice.status}`);
    }

    // Overpayment prevention
    if (dto.amountMinor > invoice.balanceMinor) {
      throw new BadRequestError(
        `Payment amount (${(dto.amountMinor / 100).toFixed(2)}) exceeds outstanding invoice balance (${(invoice.balanceMinor / 100).toFixed(2)})`
      );
    }

    // Idempotency check for external transaction ID
    if (dto.externalTransactionId) {
      const existingTx = await Payment.findOne({
        externalTransactionId: dto.externalTransactionId.trim(),
      }).lean();
      if (existingTx) {
        return toPaymentDTO(existingTx);
      }
    }

    const paymentNumber = await this.generatePaymentNumber();
    const receiptNumber = await this.generateReceiptNumber();

    const payment = new Payment({
      paymentNumber,
      studentId: invoice.studentId,
      invoiceId: invoice._id,
      amountMinor: dto.amountMinor,
      currency: invoice.currency,
      paymentMethod: dto.paymentMethod,
      reference: dto.reference?.trim(),
      externalTransactionId: dto.externalTransactionId?.trim(),
      status: FinancePaymentStatus.COMPLETED,
      paidAt: new Date(),
      recordedBy: new mongoose.Types.ObjectId(actorIdStr),
      receiptNumber,
      notes: dto.notes?.trim(),
    });

    await payment.save();

    // Atomic update on Invoice
    invoice.paidAmountMinor += dto.amountMinor;
    invoice.balanceMinor = Math.max(0, invoice.totalAmountMinor - invoice.paidAmountMinor + invoice.refundedAmountMinor);

    if (invoice.balanceMinor === 0) {
      invoice.status = InvoiceStatus.PAID;
      invoice.paidAt = new Date();
    } else {
      invoice.status = InvoiceStatus.PARTIALLY_PAID;
    }
    invoice.receiptNumber = receiptNumber;

    await invoice.save();

    // Synchronize Enrollment payment status if full tuition cleared
    if (invoice.balanceMinor === 0 && invoice.enrollmentId) {
      // Check if all other invoices for this enrollment are also paid
      const outstanding = await Invoice.countDocuments({
        enrollmentId: invoice.enrollmentId,
        status: { $in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
        balanceMinor: { $gt: 0 },
      });
      if (outstanding === 0) {
        await Enrollment.findByIdAndUpdate(invoice.enrollmentId, {
          paymentStatus: AcademicPaymentStatus.PAID,
        });
      }
    }

    // Dispatch Notification
    try {
      await NotificationDispatcher.dispatch({
        type: NotificationType.PAYMENT_RECEIVED,
        category: NotificationCategory.FINANCE,
        priority: NotificationPriority.NORMAL,
        recipientUserIds: [invoice.studentId.toString()],
        title: `Payment Received: ${payment.receiptNumber}`,
        body: `Payment of ${invoice.currency} ${(dto.amountMinor / 100).toFixed(2)} received for ${invoice.invoiceNumber}. Remaining balance: ${invoice.currency} ${(invoice.balanceMinor / 100).toFixed(2)}.`,
        actionUrl: '/student/finance',
        metadata: {
          paymentNumber: payment.paymentNumber,
          receiptNumber: payment.receiptNumber,
          invoiceNumber: invoice.invoiceNumber,
        },
      });
    } catch (err) {
      console.error('Failed to dispatch payment notification:', err);
    }

    await AuditService.record({
      actor: {
        id: actorIdStr,
        name: (actor as any).name,
        email: (actor as any).email,
        role: (actor as any).activeRole || (actor as any).roles?.[0],
        type: AuditActorType.USER,
      },
      action: AuditAction.PAYMENT_RECORDED,
      category: AuditCategory.FINANCE,
      resourceType: 'Payment',
      resourceId: payment._id.toString(),
      scope: {
        studentId: invoice.studentId?.toString(),
        courseId: invoice.courseId?.toString(),
        batchId: invoice.batchId?.toString(),
      },
      newValue: {
        paymentNumber: payment.paymentNumber,
        invoiceNumber: invoice.invoiceNumber,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        receiptNumber: payment.receiptNumber,
      },
      severity: AuditSeverity.HIGH,
      result: AuditResult.SUCCESS,
    });

    return toPaymentDTO(payment);
  }

  static async getPaymentById(paymentId: string): Promise<IPayment> {
    const payment = await Payment.findById(paymentId)
      .populate('studentId', 'name email')
      .populate('invoiceId', 'invoiceNumber')
      .lean();
    if (!payment) throw new NotFoundError('Payment');
    return toPaymentDTO(payment);
  }

  static async listPayments(query: PaymentQuery, actorId?: string, actorRole?: UserRole): Promise<{
    payments: IPayment[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const filter: Record<string, any> = {};

    if (actorRole === UserRole.STUDENT) {
      filter.studentId = new mongoose.Types.ObjectId(actorId);
    } else if (query.studentId && mongoose.Types.ObjectId.isValid(query.studentId)) {
      filter.studentId = new mongoose.Types.ObjectId(query.studentId);
    }

    if (query.invoiceId && mongoose.Types.ObjectId.isValid(query.invoiceId)) {
      filter.invoiceId = new mongoose.Types.ObjectId(query.invoiceId);
    }
    if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
    if (query.status) filter.status = query.status;

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('studentId', 'name email')
        .populate('invoiceId', 'invoiceNumber')
        .sort({ paidAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    return {
      payments: payments.map(toPaymentDTO),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  // ==========================================================================
  // Receipt Engine
  // ==========================================================================

  static async getReceiptByPaymentId(
    paymentId: string,
    actorId?: string,
    actorRole?: UserRole
  ): Promise<IReceipt> {
    const payment = await Payment.findById(paymentId).lean();
    if (!payment) throw new NotFoundError('Payment');

    const invoice = await Invoice.findById(payment.invoiceId)
      .populate('courseId', 'title')
      .lean();
    if (!invoice) throw new NotFoundError('Invoice');

    const student = await User.findById(payment.studentId).lean();
    if (!student) throw new NotFoundError('Student');

    // Scoping
    if (actorRole === UserRole.STUDENT && payment.studentId.toString() !== actorId) {
      throw new ForbiddenError('Students can only access receipts for their own payments');
    }

    return {
      receiptNumber: payment.receiptNumber,
      paymentNumber: payment.paymentNumber,
      invoiceNumber: invoice.invoiceNumber,
      studentName: student.name || 'Student',
      studentEmail: student.email,
      courseTitle: (invoice.courseId as any)?.title || invoice.title,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      paidAt: payment.paidAt.toISOString(),
      institutionName: 'Exploratory Training Academy',
    };
  }

  static async getReceiptPDF(paymentId: string, actorId?: string, actorRole?: UserRole): Promise<Buffer> {
    const receipt = await this.getReceiptByPaymentId(paymentId, actorId, actorRole);
    return ReceiptGeneratorService.generatePDFBuffer(receipt);
  }

  // ==========================================================================
  // Refunds Engine
  // ==========================================================================

  static async requestRefund(
    dto: RequestRefundDto,
    actor: IUser
  ): Promise<IRefund> {
    const actorIdStr = (actor as any).userId || (actor as any)._id?.toString();

    const payment = await Payment.findById(dto.paymentId);
    if (!payment) throw new NotFoundError('Payment');

    const invoice = await Invoice.findById(payment.invoiceId);
    if (!invoice) throw new NotFoundError('Invoice');

    // Calculate maximum refundable for this payment
    const priorRefunds = await Refund.aggregate([
      {
        $match: {
          paymentId: payment._id,
          status: { $in: [RefundStatus.APPROVED, RefundStatus.COMPLETED] },
        },
      },
      { $group: { _id: null, total: { $sum: '$amountMinor' } } },
    ]);

    const alreadyRefunded = priorRefunds[0]?.total || 0;
    const maxRefundable = payment.amountMinor - alreadyRefunded;

    if (dto.amountMinor > maxRefundable) {
      throw new BadRequestError(
        `Refund request (${(dto.amountMinor / 100).toFixed(2)}) exceeds maximum refundable balance (${(maxRefundable / 100).toFixed(2)})`
      );
    }

    const refundNumber = await this.generateRefundNumber();

    const refund = new Refund({
      refundNumber,
      paymentId: payment._id,
      invoiceId: invoice._id,
      studentId: payment.studentId,
      amountMinor: dto.amountMinor,
      currency: payment.currency,
      reason: dto.reason.trim(),
      status: RefundStatus.PENDING,
      requestedBy: new mongoose.Types.ObjectId(actorIdStr),
      reference: dto.reference?.trim(),
    });

    await refund.save();
    return toRefundDTO(refund);
  }

  static async approveRefund(
    refundId: string,
    dto: ApproveRefundDto,
    actor: IUser
  ): Promise<IRefund> {
    const actorIdStr = (actor as any).userId || (actor as any)._id?.toString();

    const refund = await Refund.findById(refundId);
    if (!refund) throw new NotFoundError('Refund');

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestError(`Refund is already in status: ${refund.status}`);
    }

    if (!dto.approved) {
      refund.status = RefundStatus.REJECTED;
      refund.approvedBy = new mongoose.Types.ObjectId(actorIdStr);
      await refund.save();

      await AuditService.record({
        actor: {
          id: actorIdStr,
          name: (actor as any).name,
          email: (actor as any).email,
          role: (actor as any).activeRole || (actor as any).roles?.[0],
          type: AuditActorType.USER,
        },
        action: AuditAction.REFUND_REJECTED,
        category: AuditCategory.FINANCE,
        resourceType: 'Refund',
        resourceId: refund._id.toString(),
        previousValue: { status: RefundStatus.PENDING },
        newValue: { status: RefundStatus.REJECTED },
        reason: (dto as any).rejectionReason || 'Refund request rejected by finance administrator',
        severity: AuditSeverity.MEDIUM,
        result: AuditResult.SUCCESS,
      });

      return toRefundDTO(refund);
    }

    // Process approval
    refund.status = RefundStatus.COMPLETED;
    refund.approvedBy = new mongoose.Types.ObjectId(actorIdStr);
    refund.refundedAt = new Date();
    await refund.save();

    // Adjust Invoice
    const invoice = await Invoice.findById(refund.invoiceId);
    if (invoice) {
      invoice.refundedAmountMinor += refund.amountMinor;
      invoice.balanceMinor = Math.max(0, invoice.totalAmountMinor - invoice.paidAmountMinor + invoice.refundedAmountMinor);

      if (invoice.balanceMinor > 0) {
        invoice.status = invoice.paidAmountMinor > 0 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.UNPAID;
      } else if (invoice.paidAmountMinor >= invoice.totalAmountMinor) {
        invoice.status = InvoiceStatus.PAID;
      }
      await invoice.save();

      // Synchronize Enrollment status if liability restored
      if (invoice.balanceMinor > 0 && invoice.enrollmentId) {
        await Enrollment.findByIdAndUpdate(invoice.enrollmentId, {
          paymentStatus: AcademicPaymentStatus.PENDING,
        });
      }
    }

    // Dispatch Notification
    try {
      await NotificationDispatcher.dispatch({
        type: NotificationType.REFUND_PROCESSED,
        category: NotificationCategory.FINANCE,
        priority: NotificationPriority.IMPORTANT,
        recipientUserIds: [refund.studentId.toString()],
        title: `Refund Processed: ${refund.refundNumber}`,
        body: `A refund of ${refund.currency} ${(refund.amountMinor / 100).toFixed(2)} has been completed for reason: ${refund.reason}.`,
        actionUrl: '/student/finance',
        metadata: {
          refundNumber: refund.refundNumber,
          amountMinor: refund.amountMinor,
        },
      });
    } catch (err) {
      console.error('Failed to dispatch refund notification:', err);
    }

    await AuditService.record({
      actor: {
        id: actorIdStr,
        name: (actor as any).name,
        email: (actor as any).email,
        role: (actor as any).activeRole || (actor as any).roles?.[0],
        type: AuditActorType.USER,
      },
      action: AuditAction.REFUND_APPROVED,
      category: AuditCategory.FINANCE,
      resourceType: 'Refund',
      resourceId: refund._id.toString(),
      previousValue: { status: RefundStatus.PENDING },
      newValue: {
        status: RefundStatus.COMPLETED,
        amountMinor: refund.amountMinor,
        refundNumber: refund.refundNumber,
      },
      reason: refund.reason,
      severity: AuditSeverity.HIGH,
      result: AuditResult.SUCCESS,
    });

    return toRefundDTO(refund);
  }

  static async listRefunds(): Promise<IRefund[]> {
    const list = await Refund.find().sort({ createdAt: -1 }).lean();
    return list.map(toRefundDTO);
  }

  // ==========================================================================
  // Scholarships Engine
  // ==========================================================================

  static async createScholarship(
    dto: CreateScholarshipDto,
    actor: IUser
  ): Promise<IScholarship> {
    const actorIdStr = (actor as any).userId || (actor as any)._id?.toString();

    const scholarship = new Scholarship({
      title: dto.title.trim(),
      code: dto.code.trim().toUpperCase(),
      studentId: dto.studentId && mongoose.Types.ObjectId.isValid(dto.studentId) ? new mongoose.Types.ObjectId(dto.studentId) : undefined,
      courseId: dto.courseId && mongoose.Types.ObjectId.isValid(dto.courseId) ? new mongoose.Types.ObjectId(dto.courseId) : undefined,
      type: dto.type,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      sponsor: dto.sponsor?.trim(),
      maxAmountMinor: dto.maxAmountMinor,
      status: 'ACTIVE',
      approvedBy: new mongoose.Types.ObjectId(actorIdStr),
      approvedAt: new Date(),
      notes: dto.notes?.trim(),
    });

    await scholarship.save();
    return toScholarshipDTO(scholarship);
  }

  static async listScholarships(query?: { courseId?: string; studentId?: string }): Promise<IScholarship[]> {
    const filter: Record<string, any> = { status: 'ACTIVE' };
    if (query?.courseId && mongoose.Types.ObjectId.isValid(query.courseId)) filter.courseId = new mongoose.Types.ObjectId(query.courseId);
    if (query?.studentId && mongoose.Types.ObjectId.isValid(query.studentId)) filter.studentId = new mongoose.Types.ObjectId(query.studentId);

    const list = await Scholarship.find(filter).sort({ createdAt: -1 }).lean();
    return list.map(toScholarshipDTO);
  }

  // ==========================================================================
  // Certificate Finance Integration
  // ==========================================================================

  /**
   * Evaluates student tuition clearance strictly against the authoritative Finance domain.
   * Replaces legacy client or temporary enrollment flags.
   */
  static async checkStudentTuitionClearance(
    studentId: string,
    courseId: string,
    enrollmentId?: string
  ): Promise<{
    cleared: boolean;
    totalOutstandingMinor: number;
    currency: string;
    unpaidInvoices: Array<{ invoiceNumber: string; balanceMinor: number; status: InvoiceStatus }>;
    reasons: string[];
  }> {
    const query: Record<string, any> = {
      studentId: new mongoose.Types.ObjectId(studentId),
      courseId: new mongoose.Types.ObjectId(courseId),
    };
    if (enrollmentId && mongoose.Types.ObjectId.isValid(enrollmentId)) {
      query.enrollmentId = new mongoose.Types.ObjectId(enrollmentId);
    }

    const invoices = await Invoice.find(query).lean();

    if (!invoices.length) {
      // If no invoices exist for this course, check if enrollment is waived or self-paced
      return {
        cleared: true,
        totalOutstandingMinor: 0,
        currency: 'USD',
        unpaidInvoices: [],
        reasons: [],
      };
    }

    let totalOutstanding = 0;
    const unpaidInvoices: Array<{ invoiceNumber: string; balanceMinor: number; status: InvoiceStatus }> = [];
    const reasons: string[] = [];

    for (const inv of invoices) {
      if (inv.status === InvoiceStatus.WAIVED) continue;
      if (inv.balanceMinor > 0 || [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE].includes(inv.status)) {
        totalOutstanding += inv.balanceMinor;
        unpaidInvoices.push({
          invoiceNumber: inv.invoiceNumber,
          balanceMinor: inv.balanceMinor,
          status: inv.status,
        });
        reasons.push(
          `Invoice ${inv.invoiceNumber} has outstanding balance of ${inv.currency} ${(inv.balanceMinor / 100).toFixed(2)} (${inv.status}).`
        );
      }
    }

    return {
      cleared: totalOutstanding === 0,
      totalOutstandingMinor: totalOutstanding,
      currency: invoices[0]?.currency || 'USD',
      unpaidInvoices,
      reasons,
    };
  }

  // ==========================================================================
  // Summary & Ledger Metrics
  // ==========================================================================

  static async getFinanceSummary(): Promise<IFinanceSummary> {
    const [stats] = await Invoice.aggregate([
      {
        $group: {
          _id: null,
          totalInvoicedMinor: { $sum: '$totalAmountMinor' },
          totalCollectedMinor: { $sum: '$paidAmountMinor' },
          totalOutstandingMinor: { $sum: '$balanceMinor' },
          totalRefundedMinor: { $sum: '$refundedAmountMinor' },
          totalDiscountsMinor: { $sum: '$discountMinor' },
          invoicesCount: { $sum: 1 },
          paidInvoicesCount: {
            $sum: { $cond: [{ $eq: ['$status', InvoiceStatus.PAID] }, 1, 0] },
          },
          overdueInvoicesCount: {
            $sum: { $cond: [{ $eq: ['$status', InvoiceStatus.OVERDUE] }, 1, 0] },
          },
        },
      },
    ]);

    return {
      totalInvoicedMinor: stats?.totalInvoicedMinor || 0,
      totalCollectedMinor: stats?.totalCollectedMinor || 0,
      totalOutstandingMinor: stats?.totalOutstandingMinor || 0,
      totalRefundedMinor: stats?.totalRefundedMinor || 0,
      totalDiscountsMinor: stats?.totalDiscountsMinor || 0,
      currency: 'USD',
      invoicesCount: stats?.invoicesCount || 0,
      paidInvoicesCount: stats?.paidInvoicesCount || 0,
      overdueInvoicesCount: stats?.overdueInvoicesCount || 0,
    };
  }
}
