import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  PaymentMethod,
  FinancePaymentStatus,
  FinanceCurrency,
  type IPayment,
} from '@eta/types';

export interface PaymentDocument extends Document {
  paymentNumber: string;
  studentId: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  amountMinor: number;
  currency: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  externalTransactionId?: string;
  status: FinancePaymentStatus;
  paidAt: Date;
  recordedBy: mongoose.Types.ObjectId;
  receiptNumber: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    paymentNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, default: FinanceCurrency.USD, uppercase: true },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
      default: PaymentMethod.CASH,
    },
    reference: { type: String, trim: true },
    externalTransactionId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(FinancePaymentStatus),
      default: FinancePaymentStatus.COMPLETED,
      index: true,
    },
    paidAt: { type: Date, required: true, default: Date.now },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiptNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    notes: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'payments',
  }
);

paymentSchema.index({ invoiceId: 1, status: 1 });
paymentSchema.index({ studentId: 1, paidAt: -1 });

export function toPaymentDTO(doc: any): IPayment {
  return {
    id: doc._id?.toString() || doc.id,
    paymentNumber: doc.paymentNumber,
    studentId: doc.studentId?.toString(),
    studentName: doc.studentId?.name || doc.studentName,
    invoiceId: doc.invoiceId?.toString(),
    invoiceNumber: doc.invoiceId?.invoiceNumber || doc.invoiceNumber,
    amountMinor: doc.amountMinor,
    currency: doc.currency,
    paymentMethod: doc.paymentMethod,
    reference: doc.reference,
    externalTransactionId: doc.externalTransactionId,
    status: doc.status,
    paidAt: doc.paidAt instanceof Date ? doc.paidAt.toISOString() : doc.paidAt,
    recordedBy: doc.recordedBy?.toString(),
    receiptNumber: doc.receiptNumber,
    notes: doc.notes,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
  };
}

export const Payment: Model<PaymentDocument> =
  mongoose.models.Payment || mongoose.model<PaymentDocument>('Payment', paymentSchema);
