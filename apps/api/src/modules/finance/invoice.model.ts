import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  InvoiceStatus,
  FeeItemType,
  DiscountType,
  FinanceCurrency,
  type IInvoice,
  type IInvoiceLineItem,
  type IInvoiceDiscount,
} from '@eta/types';

export interface InvoiceDocument extends Document {
  invoiceNumber: string;
  studentId: mongoose.Types.ObjectId;
  enrollmentId?: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  feeStructureId?: mongoose.Types.ObjectId;
  title: string;
  currency: string;
  lineItems: IInvoiceLineItem[];
  subtotalMinor: number;
  discountMinor: number;
  discountDetails?: IInvoiceDiscount;
  scholarshipMinor: number;
  scholarshipId?: mongoose.Types.ObjectId;
  totalAmountMinor: number;
  paidAmountMinor: number;
  refundedAmountMinor: number;
  balanceMinor: number;
  dueDate: Date;
  status: InvoiceStatus;
  issuedAt: Date;
  issuedBy: mongoose.Types.ObjectId;
  paidAt?: Date;
  receiptNumber?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceLineItemSchema = new Schema<IInvoiceLineItem>(
  {
    name: { type: String, required: true, trim: true },
    itemType: {
      type: String,
      enum: Object.values(FeeItemType),
      required: true,
      default: FeeItemType.TUITION,
    },
    unitAmountMinor: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    totalAmountMinor: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const invoiceDiscountSchema = new Schema<IInvoiceDiscount>(
  {
    type: { type: String, enum: Object.values(DiscountType), required: true },
    value: { type: Number, required: true, min: 0 },
    amountMinor: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true },
  },
  { _id: false }
);

const invoiceSchema = new Schema<InvoiceDocument>(
  {
    invoiceNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', default: null, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', default: null, index: true },
    feeStructureId: { type: Schema.Types.ObjectId, ref: 'FeeStructure', default: null, index: true },
    title: { type: String, required: true, trim: true, default: 'Tuition & Academic Fees Invoice' },
    currency: { type: String, default: FinanceCurrency.USD, uppercase: true },
    lineItems: { type: [invoiceLineItemSchema], default: [] },
    subtotalMinor: { type: Number, required: true, min: 0 },
    discountMinor: { type: Number, default: 0, min: 0 },
    discountDetails: { type: invoiceDiscountSchema, default: null },
    scholarshipMinor: { type: Number, default: 0, min: 0 },
    scholarshipId: { type: Schema.Types.ObjectId, ref: 'Scholarship', default: null },
    totalAmountMinor: { type: Number, required: true, min: 0 },
    paidAmountMinor: { type: Number, default: 0, min: 0 },
    refundedAmountMinor: { type: Number, default: 0, min: 0 },
    balanceMinor: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.UNPAID,
      index: true,
    },
    issuedAt: { type: Date, required: true, default: Date.now },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paidAt: { type: Date, default: null },
    receiptNumber: { type: String, default: null },
    notes: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'invoices',
  }
);

invoiceSchema.index({ studentId: 1, status: 1 });
invoiceSchema.index({ studentId: 1, courseId: 1 });
invoiceSchema.index({ dueDate: 1, status: 1 });
invoiceSchema.index({ studentId: 1, feeStructureId: 1, batchId: 1 });

export function toInvoiceDTO(doc: any): IInvoice {
  return {
    id: doc._id?.toString() || doc.id,
    invoiceNumber: doc.invoiceNumber,
    studentId: doc.studentId?.toString(),
    studentName: doc.studentId?.name || doc.studentName,
    studentEmail: doc.studentId?.email || doc.studentEmail,
    enrollmentId: doc.enrollmentId?.toString(),
    courseId: doc.courseId?.toString(),
    courseTitle: doc.courseId?.title || doc.courseTitle,
    batchId: doc.batchId?.toString(),
    batchCode: doc.batchId?.batchCode || doc.batchCode,
    feeStructureId: doc.feeStructureId?.toString(),
    title: doc.title,
    currency: doc.currency,
    lineItems: (doc.lineItems || []).map((li: any) => ({
      id: li._id?.toString() || li.id,
      name: li.name,
      itemType: li.itemType,
      unitAmountMinor: li.unitAmountMinor,
      quantity: li.quantity,
      totalAmountMinor: li.totalAmountMinor,
    })),
    subtotalMinor: doc.subtotalMinor,
    discountMinor: doc.discountMinor || 0,
    discountDetails: doc.discountDetails,
    scholarshipMinor: doc.scholarshipMinor || 0,
    scholarshipId: doc.scholarshipId?.toString(),
    scholarshipTitle: doc.scholarshipId?.title || doc.scholarshipTitle,
    totalAmountMinor: doc.totalAmountMinor,
    paidAmountMinor: doc.paidAmountMinor || 0,
    refundedAmountMinor: doc.refundedAmountMinor || 0,
    balanceMinor: doc.balanceMinor,
    dueDate: doc.dueDate instanceof Date ? doc.dueDate.toISOString() : doc.dueDate,
    status: doc.status,
    issuedAt: doc.issuedAt instanceof Date ? doc.issuedAt.toISOString() : doc.issuedAt,
    issuedBy: doc.issuedBy?.toString(),
    paidAt: doc.paidAt instanceof Date ? doc.paidAt.toISOString() : doc.paidAt,
    receiptNumber: doc.receiptNumber,
    notes: doc.notes,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
  };
}

export const Invoice: Model<InvoiceDocument> =
  mongoose.models.Invoice || mongoose.model<InvoiceDocument>('Invoice', invoiceSchema);
