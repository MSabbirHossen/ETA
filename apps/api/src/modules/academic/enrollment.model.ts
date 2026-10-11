import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  EnrollmentStatus,
  EnrollmentSource,
  PaymentStatus,
  type IEnrollment,
} from '@eta/types';

export interface EnrollmentDocument extends Document {
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  enrollmentDate: Date;
  status: EnrollmentStatus;
  source: EnrollmentSource;
  paymentStatus: PaymentStatus;
  progress: {
    completionPercentage: number;
    lastAccessedAt?: Date | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<EnrollmentDocument>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
      index: true,
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: Object.values(EnrollmentStatus),
      default: EnrollmentStatus.ACTIVE,
      index: true,
    },
    source: {
      type: String,
      enum: Object.values(EnrollmentSource),
      default: EnrollmentSource.ADMIN,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.WAIVED,
      index: true,
    },
    progress: {
      completionPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      lastAccessedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
    collection: 'enrollments',
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret._id = ret._id.toString();
        ret.studentId = ret.studentId.toString();
        ret.courseId = ret.courseId.toString();
        ret.batchId = ret.batchId.toString();
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Compound Unique Index: studentId + batchId per PRD §70
enrollmentSchema.index({ studentId: 1, batchId: 1 }, { unique: true });
enrollmentSchema.index({ courseId: 1, status: 1 });

export function toIEnrollment(doc: EnrollmentDocument): IEnrollment {
  return {
    _id: doc._id.toString(),
    studentId: doc.studentId.toString(),
    courseId: doc.courseId.toString(),
    batchId: doc.batchId.toString(),
    enrollmentDate: doc.enrollmentDate instanceof Date ? doc.enrollmentDate.toISOString() : String(doc.enrollmentDate),
    status: doc.status,
    source: doc.source,
    paymentStatus: doc.paymentStatus,
    progress: {
      completionPercentage: doc.progress?.completionPercentage ?? 0,
      lastAccessedAt: doc.progress?.lastAccessedAt
        ? doc.progress.lastAccessedAt instanceof Date
          ? doc.progress.lastAccessedAt.toISOString()
          : String(doc.progress.lastAccessedAt)
        : null,
    },
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export const Enrollment: Model<EnrollmentDocument> =
  mongoose.models.Enrollment || mongoose.model<EnrollmentDocument>('Enrollment', enrollmentSchema);
