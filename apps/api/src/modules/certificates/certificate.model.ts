import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  CertificateType,
  CertificateStatus,
  type ICertificate,
  type ICredentialSnapshot,
} from '@eta/types';

export interface CertificateDocument extends Document {
  certificateNumber: string;
  verificationCode: string;
  studentId: mongoose.Types.ObjectId;
  enrollmentId?: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  programId?: mongoose.Types.ObjectId;
  certificateType: CertificateType;
  title: string;
  description?: string;
  issuedAt: Date;
  issuedBy: mongoose.Types.ObjectId;
  status: CertificateStatus;
  completionDate: Date;
  grade?: string;
  gpa?: number;
  credentialSnapshot: ICredentialSnapshot;
  pdfUrl?: string;
  storageRef?: string;
  revokedAt?: Date | null;
  revokedBy?: mongoose.Types.ObjectId | null;
  revocationReason?: string | null;
  replacesCertificateId?: mongoose.Types.ObjectId | null;
  replacedByCertificateId?: mongoose.Types.ObjectId | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const credentialSnapshotSchema = new Schema<ICredentialSnapshot>(
  {
    studentName: { type: String, required: true },
    studentEmail: { type: String },
    courseTitle: { type: String, required: true },
    courseCode: { type: String },
    programTitle: { type: String },
    batchCode: { type: String },
    finalPercentage: { type: Number, required: true },
    letterGrade: { type: String, required: true },
    gpa: { type: Number, required: true },
    completionDate: { type: String, required: true },
    issuerOrganization: { type: String, default: 'Exploratory Training Academy' },
    instructorNames: { type: [String], default: [] },
    issuedByRole: { type: String },
    authorizedSignatures: {
      type: [
        {
          name: { type: String, required: true },
          title: { type: String, required: true },
        },
      ],
      default: [
        { name: 'Academic Director', title: 'Director of Academic Affairs' },
        { name: 'Lead Instructor', title: 'Faculty Lead' },
      ],
    },
  },
  { _id: false }
);

const certificateSchema = new Schema<CertificateDocument>(
  {
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    verificationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
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
      index: true,
    },
    programId: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      index: true,
    },
    certificateType: {
      type: String,
      enum: Object.values(CertificateType),
      default: CertificateType.COURSE_COMPLETION,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(CertificateStatus),
      default: CertificateStatus.ISSUED,
      index: true,
    },
    completionDate: {
      type: Date,
      required: true,
    },
    grade: {
      type: String,
    },
    gpa: {
      type: Number,
    },
    credentialSnapshot: {
      type: credentialSnapshotSchema,
      required: true,
    },
    pdfUrl: {
      type: String,
    },
    storageRef: {
      type: String,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    revocationReason: {
      type: String,
      default: null,
    },
    replacesCertificateId: {
      type: Schema.Types.ObjectId,
      ref: 'Certificate',
      default: null,
    },
    replacedByCertificateId: {
      type: Schema.Types.ObjectId,
      ref: 'Certificate',
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id?.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

certificateSchema.index({ courseId: 1, batchId: 1, status: 1 });

// Ensure only one ACTIVE (ISSUED) certificate exists per student + course + certificateType
certificateSchema.index(
  { studentId: 1, courseId: 1, certificateType: 1 },
  {
    unique: true,
    partialFilterExpression: { status: CertificateStatus.ISSUED },
  }
);

export function toCertificateDTO(doc: CertificateDocument | Record<string, any>): ICertificate {
  const d = doc as any;
  return {
    id: d._id?.toString() || d.id,
    certificateNumber: d.certificateNumber,
    verificationCode: d.verificationCode,
    studentId: d.studentId?.toString() || d.studentId,
    enrollmentId: d.enrollmentId?.toString() || d.enrollmentId,
    courseId: d.courseId?.toString() || d.courseId,
    batchId: d.batchId?.toString() || d.batchId,
    programId: d.programId?.toString() || d.programId,
    certificateType: d.certificateType,
    title: d.title,
    description: d.description,
    issuedAt: d.issuedAt instanceof Date ? d.issuedAt.toISOString() : d.issuedAt,
    issuedBy: d.issuedBy?.toString() || d.issuedBy,
    status: d.status,
    completionDate: d.completionDate instanceof Date ? d.completionDate.toISOString() : d.completionDate,
    grade: d.grade,
    gpa: d.gpa,
    credentialSnapshot: d.credentialSnapshot,
    pdfUrl: d.pdfUrl,
    storageRef: d.storageRef,
    revokedAt: d.revokedAt ? (d.revokedAt instanceof Date ? d.revokedAt.toISOString() : d.revokedAt) : null,
    revokedBy: d.revokedBy?.toString() || null,
    revocationReason: d.revocationReason || null,
    replacesCertificateId: d.replacesCertificateId?.toString() || null,
    replacedByCertificateId: d.replacedByCertificateId?.toString() || null,
    metadata: d.metadata || {},
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
  };
}

export const CertificateModel: Model<CertificateDocument> =
  mongoose.models.Certificate ||
  mongoose.model<CertificateDocument>('Certificate', certificateSchema, 'certificates');
