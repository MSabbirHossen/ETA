import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  RefundStatus,
  FinanceCurrency,
  type IRefund,
} from '@eta/types';

export interface RefundDocument extends Document {
  refundNumber: string;
  paymentId: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  amountMinor: number;
  currency: string;
  reason: string;
  status: RefundStatus;
  requestedBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  refundedAt?: Date;
  reference?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refundSchema = new Schema<RefundDocument>(
  {
    refundNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, default: FinanceCurrency.USD, uppercase: true },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(RefundStatus),
      default: RefundStatus.PENDING,
      index: true,
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    refundedAt: { type: Date, default: null },
    reference: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'refunds',
  }
);



export function toRefundDTO(doc: any): IRefund {
  return {
    id: doc._id?.toString() || doc.id,
    refundNumber: doc.refundNumber,
    paymentId: doc.paymentId?.toString(),
    invoiceId: doc.invoiceId?.toString(),
    studentId: doc.studentId?.toString(),
    amountMinor: doc.amountMinor,
    currency: doc.currency,
    reason: doc.reason,
    status: doc.status,
    requestedBy: doc.requestedBy?.toString(),
    approvedBy: doc.approvedBy?.toString(),
    refundedAt: doc.refundedAt instanceof Date ? doc.refundedAt.toISOString() : doc.refundedAt,
    reference: doc.reference,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
  };
}

export const Refund: Model<RefundDocument> =
  mongoose.models.Refund || mongoose.model<RefundDocument>('Refund', refundSchema);
