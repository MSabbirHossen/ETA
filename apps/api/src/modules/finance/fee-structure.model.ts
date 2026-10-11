import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  FeeItemType,
  FeeStructureStatus,
  FinanceCurrency,
  type IFeeItem,
  type IFeeStructure,
} from '@eta/types';

export interface FeeStructureDocument extends Document {
  name: string;
  code: string;
  description?: string;
  programId?: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  currency: string;
  items: IFeeItem[];
  totalAmountMinor: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  status: FeeStructureStatus;
  createdAt: Date;
  updatedAt: Date;
}

const feeItemSchema = new Schema<IFeeItem>(
  {
    name: { type: String, required: true, trim: true },
    itemType: {
      type: String,
      enum: Object.values(FeeItemType),
      required: true,
      default: FeeItemType.TUITION,
    },
    amountMinor: { type: Number, required: true, min: 0 },
    isMandatory: { type: Boolean, default: true },
    description: { type: String, trim: true },
  },
  { _id: true }
);

const feeStructureSchema = new Schema<FeeStructureDocument>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program', default: null, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', default: null, index: true },
    currency: { type: String, default: FinanceCurrency.USD, uppercase: true },
    items: { type: [feeItemSchema], default: [] },
    totalAmountMinor: { type: Number, required: true, min: 0 },
    effectiveFrom: { type: Date, required: true, default: Date.now },
    effectiveTo: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(FeeStructureStatus),
      default: FeeStructureStatus.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'fee_structures',
  }
);

// Unique index on code is declared at field-level (code: { unique: true })
feeStructureSchema.index({ courseId: 1, batchId: 1, status: 1 });

export function toFeeStructureDTO(doc: any): IFeeStructure {
  return {
    id: doc._id?.toString() || doc.id,
    name: doc.name,
    code: doc.code,
    description: doc.description,
    programId: doc.programId?.toString(),
    courseId: doc.courseId?.toString(),
    batchId: doc.batchId?.toString(),
    currency: doc.currency,
    items: (doc.items || []).map((i: any) => ({
      id: i._id?.toString() || i.id,
      name: i.name,
      itemType: i.itemType,
      amountMinor: i.amountMinor,
      isMandatory: i.isMandatory,
      description: i.description,
    })),
    totalAmountMinor: doc.totalAmountMinor,
    effectiveFrom: doc.effectiveFrom instanceof Date ? doc.effectiveFrom.toISOString() : doc.effectiveFrom,
    effectiveTo: doc.effectiveTo instanceof Date ? doc.effectiveTo.toISOString() : doc.effectiveTo,
    status: doc.status,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
  };
}

export const FeeStructure: Model<FeeStructureDocument> =
  mongoose.models.FeeStructure ||
  mongoose.model<FeeStructureDocument>('FeeStructure', feeStructureSchema);
