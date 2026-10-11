import { z } from 'zod';
import {
  FinanceCurrency,
  FeeItemType,
  FeeStructureStatus,
  InvoiceStatus,
  PaymentMethod,
  FinancePaymentStatus,
  ScholarshipType,
  DiscountType,
} from '@eta/types';

export const feeItemSchema = z.object({
  name: z.string().trim().min(1, 'Item name is required').max(150),
  itemType: z.nativeEnum(FeeItemType),
  amountMinor: z.number().int().nonnegative('Amount cannot be negative'),
  isMandatory: z.boolean().default(true),
  description: z.string().max(500).optional(),
});

export const createFeeStructureSchema = z.object({
  name: z.string().trim().min(1, 'Fee structure name is required').max(150),
  code: z.string().trim().min(1, 'Code is required').max(50).toUpperCase(),
  description: z.string().max(1000).optional(),
  programId: z.string().optional(),
  courseId: z.string().optional(),
  batchId: z.string().optional(),
  currency: z.nativeEnum(FinanceCurrency).default(FinanceCurrency.USD),
  items: z.array(feeItemSchema).min(1, 'At least one fee item is required'),
  effectiveFrom: z.string().datetime().or(z.string().min(1)),
  effectiveTo: z.string().datetime().or(z.string().min(1)).optional(),
});

export const updateFeeStructureSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().max(1000).optional(),
  currency: z.nativeEnum(FinanceCurrency).optional(),
  items: z.array(feeItemSchema).min(1).optional(),
  effectiveFrom: z.string().datetime().or(z.string().min(1)).optional(),
  effectiveTo: z.string().datetime().or(z.string().min(1)).optional(),
  status: z.nativeEnum(FeeStructureStatus).optional(),
});

export const invoiceLineItemSchema = z.object({
  name: z.string().trim().min(1).max(150),
  itemType: z.nativeEnum(FeeItemType).default(FeeItemType.TUITION),
  unitAmountMinor: z.number().int().nonnegative(),
  quantity: z.number().int().positive().default(1),
});

export const createInvoiceSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  enrollmentId: z.string().optional(),
  courseId: z.string().optional(),
  batchId: z.string().optional(),
  feeStructureId: z.string().optional(),
  title: z.string().trim().max(200).optional(),
  currency: z.nativeEnum(FinanceCurrency).default(FinanceCurrency.USD),
  lineItems: z.array(invoiceLineItemSchema).optional(),
  discount: z
    .object({
      type: z.nativeEnum(DiscountType),
      value: z.number().nonnegative(),
      reason: z.string().max(300).optional(),
    })
    .optional(),
  scholarshipId: z.string().optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().max(1000).optional(),
});

export const bulkCreateInvoicesSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  batchId: z.string().optional(),
  feeStructureId: z.string().min(1, 'Fee structure ID is required'),
  studentIds: z.array(z.string()).optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  title: z.string().max(200).optional(),
  skipExisting: z.boolean().default(true),
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  amountMinor: z.number().int().positive('Payment amount must be greater than zero'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  reference: z.string().trim().max(200).optional(),
  externalTransactionId: z.string().trim().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

export const createScholarshipSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(150),
  code: z.string().trim().min(1, 'Code is required').max(50).toUpperCase(),
  studentId: z.string().optional(),
  courseId: z.string().optional(),
  type: z.nativeEnum(ScholarshipType),
  discountType: z.nativeEnum(DiscountType),
  discountValue: z.number().positive('Discount value must be greater than 0'),
  sponsor: z.string().max(150).optional(),
  maxAmountMinor: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
});

export const requestRefundSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  amountMinor: z.number().int().positive('Refund amount must be positive'),
  reason: z.string().trim().min(3, 'Reason is required').max(500),
  reference: z.string().max(200).optional(),
});

export const approveRefundSchema = z.object({
  approved: z.boolean(),
  notes: z.string().max(500).optional(),
});

export const invoiceQuerySchema = z.object({
  studentId: z.string().optional(),
  courseId: z.string().optional(),
  batchId: z.string().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const paymentQuerySchema = z.object({
  studentId: z.string().optional(),
  invoiceId: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  status: z.nativeEnum(FinancePaymentStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
