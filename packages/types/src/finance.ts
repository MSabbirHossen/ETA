export enum FinanceCurrency {
  USD = 'USD',
  BDT = 'BDT',
  SAR = 'SAR',
  EUR = 'EUR',
  GBP = 'GBP',
}

export enum FeeItemType {
  TUITION = 'TUITION',
  REGISTRATION = 'REGISTRATION',
  EXAMINATION = 'EXAMINATION',
  MATERIALS = 'MATERIALS',
  CERTIFICATE = 'CERTIFICATE',
  ACTIVITY = 'ACTIVITY',
  OTHER = 'OTHER',
}

export enum FeeStructureStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Exact PRD §50 Payment / Invoice statuses
 */
export enum InvoiceStatus {
  UNPAID = 'unpaid',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  WAIVED = 'waived',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
  ONLINE_GATEWAY = 'ONLINE_GATEWAY',
  MANUAL = 'MANUAL',
  WAIVER = 'WAIVER',
}

export enum FinancePaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum ScholarshipType {
  MERIT = 'MERIT',
  NEED_BASED = 'NEED_BASED',
  INSTITUTIONAL = 'INSTITUTIONAL',
  SPONSORED = 'SPONSORED',
  SPECIAL = 'SPECIAL',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

// ----------------------------------------------------
// Entity Interfaces — PRD §50
// ----------------------------------------------------

export interface IFeeItem {
  id?: string;
  name: string;
  itemType: FeeItemType;
  amountMinor: number; // In minor units (e.g., cents, halalas)
  isMandatory: boolean;
  description?: string;
}

export interface IFeeStructure {
  id?: string;
  _id?: string;
  name: string;
  code: string;
  description?: string;
  programId?: string;
  courseId?: string;
  batchId?: string;
  currency: FinanceCurrency | string;
  items: IFeeItem[];
  totalAmountMinor: number;
  effectiveFrom: string;
  effectiveTo?: string;
  status: FeeStructureStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IInvoiceLineItem {
  id?: string;
  _id?: string;
  name: string;
  itemType: FeeItemType | string;
  unitAmountMinor: number;
  quantity: number;
  totalAmountMinor: number;
}

export interface IInvoiceDiscount {
  type: DiscountType;
  value: number; // percentage (1-100) or minor units
  amountMinor: number;
  reason?: string;
}

export interface IInvoice {
  id?: string;
  _id?: string;
  invoiceNumber: string;
  studentId: string | { _id?: string; name?: string; email?: string };
  studentName?: string;
  studentEmail?: string;
  enrollmentId?: string | { _id?: string };
  courseId?: string | { _id?: string; title?: string; code?: string };
  courseTitle?: string;
  batchId?: string | { _id?: string; name?: string; code?: string };
  batchCode?: string;
  feeStructureId?: string | { _id?: string; name?: string };
  title: string;
  currency: FinanceCurrency | string;
  lineItems: IInvoiceLineItem[];
  subtotalMinor: number;
  discountMinor: number;
  discountDetails?: IInvoiceDiscount;
  scholarshipMinor: number;
  scholarshipId?: string;
  scholarshipTitle?: string;
  totalAmountMinor: number;
  paidAmountMinor: number;
  refundedAmountMinor: number;
  balanceMinor: number; // Derived: total - paid + refunded
  dueDate: string;
  status: InvoiceStatus;
  issuedAt: string;
  issuedBy: string | { _id?: string; name?: string };
  paidAt?: string;
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IPayment {
  id?: string;
  _id?: string;
  paymentNumber: string;
  studentId: string | { _id?: string; name?: string; email?: string };
  studentName?: string;
  invoiceId: string | { _id?: string; invoiceNumber?: string };
  invoiceNumber?: string;
  amountMinor: number;
  currency: FinanceCurrency | string;
  paymentMethod: PaymentMethod;
  reference?: string;
  externalTransactionId?: string;
  status: FinancePaymentStatus;
  paidAt: string;
  recordedBy: string | { _id?: string; name?: string };
  receiptNumber: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IScholarship {
  id?: string;
  _id?: string;
  title: string;
  code: string;
  studentId?: string;
  studentName?: string;
  courseId?: string;
  type: ScholarshipType;
  discountType: DiscountType;
  discountValue: number; // percentage (1-100) or minor units
  sponsor?: string;
  maxAmountMinor?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IRefund {
  id?: string;
  _id?: string;
  refundNumber: string;
  paymentId: string;
  invoiceId: string;
  studentId: string;
  amountMinor: number;
  currency: FinanceCurrency | string;
  reason: string;
  status: RefundStatus;
  requestedBy: string;
  approvedBy?: string;
  refundedAt?: string;
  reference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IReceipt {
  receiptNumber: string;
  paymentNumber: string;
  invoiceNumber: string;
  studentName: string;
  studentEmail?: string;
  courseTitle?: string;
  amountMinor: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paidAt: string;
  institutionName: string;
  verificationCode?: string;
}

export interface IFinanceSummary {
  totalInvoicedMinor: number;
  totalCollectedMinor: number;
  totalOutstandingMinor: number;
  totalRefundedMinor: number;
  totalDiscountsMinor: number;
  currency: string;
  invoicesCount: number;
  paidInvoicesCount: number;
  overdueInvoicesCount: number;
}

// ----------------------------------------------------
// DTOs & Queries
// ----------------------------------------------------

export interface CreateFeeStructureDto {
  name: string;
  code: string;
  description?: string;
  programId?: string;
  courseId?: string;
  batchId?: string;
  currency?: FinanceCurrency | string;
  items: Array<{
    name: string;
    itemType: FeeItemType;
    amountMinor: number;
    isMandatory?: boolean;
    description?: string;
  }>;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface UpdateFeeStructureDto {
  name?: string;
  description?: string;
  currency?: FinanceCurrency | string;
  items?: Array<{
    name: string;
    itemType: FeeItemType;
    amountMinor: number;
    isMandatory?: boolean;
    description?: string;
  }>;
  effectiveFrom?: string;
  effectiveTo?: string;
  status?: FeeStructureStatus;
}

export interface CreateInvoiceDto {
  studentId: string;
  enrollmentId?: string;
  courseId?: string;
  batchId?: string;
  feeStructureId?: string;
  title?: string;
  currency?: FinanceCurrency | string;
  lineItems?: Array<{
    name: string;
    itemType: FeeItemType;
    unitAmountMinor: number;
    quantity?: number;
  }>;
  discount?: {
    type: DiscountType;
    value: number;
    reason?: string;
  };
  scholarshipId?: string;
  dueDate: string;
  notes?: string;
}

export interface BulkCreateInvoicesDto {
  courseId: string;
  batchId?: string;
  feeStructureId: string;
  studentIds?: string[];
  dueDate: string;
  title?: string;
  skipExisting?: boolean;
}

export interface RecordPaymentDto {
  invoiceId: string;
  amountMinor: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  externalTransactionId?: string;
  notes?: string;
}

export interface CreateScholarshipDto {
  title: string;
  code: string;
  studentId?: string;
  courseId?: string;
  type: ScholarshipType;
  discountType: DiscountType;
  discountValue: number;
  sponsor?: string;
  maxAmountMinor?: number;
  notes?: string;
}

export interface RequestRefundDto {
  paymentId: string;
  amountMinor: number;
  reason: string;
  reference?: string;
}

export interface ApproveRefundDto {
  approved: boolean;
  notes?: string;
}

export interface InvoiceQuery {
  studentId?: string;
  courseId?: string;
  batchId?: string;
  status?: InvoiceStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaymentQuery {
  studentId?: string;
  invoiceId?: string;
  paymentMethod?: PaymentMethod;
  status?: FinancePaymentStatus;
  search?: string;
  page?: number;
  limit?: number;
}
