import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  AdmissionStatus,
  type IAdmissionApplication,
  type ISafeAdmissionApplication,
} from '@eta/types';

export interface AdmissionApplicationDocument
  extends Omit<IAdmissionApplication, '_id' | 'createdAt' | 'updatedAt'>,
    Document {
  createdAt: Date;
  updatedAt: Date;
}

const applicationDocumentSubSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    storageKey: { type: String, trim: true, default: null },
    fileSize: { type: Number, default: null },
    mimeType: { type: String, trim: true, default: null },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const applicationReviewSubSchema = new Schema(
  {
    reviewerId: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(AdmissionStatus),
      required: true,
    },
    notes: { type: String, default: null },
    decisionReason: { type: String, default: null },
    reviewedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const admissionApplicationSchema = new Schema<AdmissionApplicationDocument>(
  {
    applicantId: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: 'User',
      required: [true, 'Applicant ID is required'],
      index: true,
    },
    programId: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: 'Program',
      required: [true, 'Program ID is required'],
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true,
    },
    batchId: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: 'Batch',
      required: [true, 'Batch ID is required'],
      index: true,
    },
    personalInfo: {
      fullName: { type: String, default: '', trim: true },
      email: { type: String, default: '', trim: true, lowercase: true },
      phone: { type: String, default: '', trim: true },
      dateOfBirth: { type: Date, default: null },
      gender: { type: String, default: null, trim: true },
      nationalId: { type: String, default: null, trim: true },
      address: {
        street: { type: String, default: null, trim: true },
        city: { type: String, default: null, trim: true },
        state: { type: String, default: null, trim: true },
        postalCode: { type: String, default: null, trim: true },
        country: { type: String, default: null, trim: true },
      },
    },
    education: {
      highestLevel: { type: String, default: '', trim: true },
      institution: { type: String, default: '', trim: true },
      graduationYear: { type: Number, default: null },
      gradeOrGpa: { type: String, default: null, trim: true },
      major: { type: String, default: null, trim: true },
    },
    guardianInfo: {
      name: { type: String, default: null, trim: true },
      relationship: { type: String, default: null, trim: true },
      email: { type: String, default: null, trim: true, lowercase: true },
      phone: { type: String, default: null, trim: true },
      occupation: { type: String, default: null, trim: true },
      address: { type: String, default: null, trim: true },
    },
    documents: {
      type: [applicationDocumentSubSchema],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(AdmissionStatus),
      default: AdmissionStatus.DRAFT,
      index: true,
    },
    submittedAt: {
      type: Date,
      default: null,
      index: true,
    },
    reviews: {
      type: [applicationReviewSubSchema],
      default: [],
    },
    reviewerNotes: {
      type: String,
      default: null,
    },
    decisionReason: {
      type: String,
      default: null,
    },
    decisionDate: {
      type: Date,
      default: null,
    },
    decidedBy: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: 'User',
      default: null,
    },
    enrolledAt: {
      type: Date,
      default: null,
    },
    studentId: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: 'User',
      default: null,
    },
    enrollmentId: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: 'Enrollment',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'applications',
  }
);

// Prevent duplicate application per applicant for the same course + batch
admissionApplicationSchema.index(
  { applicantId: 1, courseId: 1, batchId: 1 },
  { unique: true }
);
admissionApplicationSchema.index({ status: 1, createdAt: -1 });

/**
 * Sanitizes application document for applicant visibility
 * (omits private internal reviewer notes)
 */
export function sanitizeForApplicant(
  application: AdmissionApplicationDocument | IAdmissionApplication
): ISafeAdmissionApplication {
  const obj =
    typeof (application as any).toObject === 'function'
      ? (application as any).toObject()
      : { ...application };

  delete obj.reviewerNotes;
  if (Array.isArray(obj.reviews)) {
    obj.reviews = obj.reviews.map((r: any) => ({
      reviewerId: r.reviewerId,
      status: r.status,
      decisionReason: r.decisionReason,
      reviewedAt: r.reviewedAt,
    }));
  }
  return obj;
}

export const AdmissionApplication: Model<AdmissionApplicationDocument> =
  mongoose.models.AdmissionApplication ||
  mongoose.model<AdmissionApplicationDocument>(
    'AdmissionApplication',
    admissionApplicationSchema
  );
