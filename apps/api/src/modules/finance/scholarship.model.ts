import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  ScholarshipType,
  DiscountType,
  type IScholarship,
} from '@eta/types';

export interface ScholarshipDocument extends Document {
  title: string;
  code: string;
  studentId?: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  type: ScholarshipType;
  discountType: DiscountType;
  discountValue: number;
  sponsor?: string;
  maxAmountMinor?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const scholarshipSchema = new Schema<ScholarshipDocument>(
  {
    title: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
    type: {
      type: String,
      enum: Object.values(ScholarshipType),
      default: ScholarshipType.MERIT,
      required: true,
    },
    discountType: {
      type: String,
      enum: Object.values(DiscountType),
      default: DiscountType.PERCENTAGE,
      required: true,
    },
    discountValue: { type: Number, required: true, min: 1 },
    sponsor: { type: String, trim: true },
    maxAmountMinor: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'EXPIRED'],
      default: 'ACTIVE',
      index: true,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'scholarships',
  }
);

// Unique index on code is declared at field-level (code: { unique: true })

export function toScholarshipDTO(doc: any): IScholarship {
  return {
    id: doc._id?.toString() || doc.id,
    title: doc.title,
    code: doc.code,
    studentId: doc.studentId?.toString(),
    studentName: doc.studentId?.name || doc.studentName,
    courseId: doc.courseId?.toString(),
    type: doc.type,
    discountType: doc.discountType,
    discountValue: doc.discountValue,
    sponsor: doc.sponsor,
    maxAmountMinor: doc.maxAmountMinor,
    status: doc.status,
    approvedBy: doc.approvedBy?.toString(),
    approvedAt: doc.approvedAt instanceof Date ? doc.approvedAt.toISOString() : doc.approvedAt,
    notes: doc.notes,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
  };
}

export const Scholarship: Model<ScholarshipDocument> =
  mongoose.models.Scholarship ||
  mongoose.model<ScholarshipDocument>('Scholarship', scholarshipSchema);
