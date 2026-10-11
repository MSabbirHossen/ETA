import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  GradePublicationStatus,
  GradeSourceType,
  type IStudentGradeResult,
  type ICategoryGradeContribution,
  type IGradeItemScore,
  type IGradeOverride,
  type IGradeCorrectionAudit,
} from '@eta/types';

export interface GradeResultDocument extends Omit<IStudentGradeResult, '_id' | 'createdAt' | 'updatedAt'>, Document {
  createdAt: Date;
  updatedAt: Date;
}

const gradeItemScoreSchema = new Schema<IGradeItemScore>(
  {
    sourceType: {
      type: String,
      enum: Object.values(GradeSourceType),
      required: true,
    },
    sourceId: { type: String, required: true },
    sourceTitle: { type: String, required: true },
    maxMarks: { type: Number, required: true },
    obtainedMarks: { type: Number, required: true },
    normalizedPercentage: { type: Number, required: true },
    isLate: { type: Boolean, default: false },
    latePenaltyDeduction: { type: Number, default: 0 },
    isDropped: { type: Boolean, default: false },
    isExcused: { type: Boolean, default: false },
    isMissing: { type: Boolean, default: false },
    rawStatus: { type: String },
  },
  { _id: false }
);

const categoryContributionSchema = new Schema<ICategoryGradeContribution>(
  {
    categoryId: { type: String, required: true },
    categoryName: { type: String, required: true },
    sourceType: {
      type: String,
      enum: Object.values(GradeSourceType),
      required: true,
    },
    weight: { type: Number, required: true },
    rawScoreTotal: { type: Number, required: true },
    rawMaxTotal: { type: Number, required: true },
    categoryPercentage: { type: Number, required: true },
    weightedContribution: { type: Number, required: true },
    itemScores: { type: [gradeItemScoreSchema], default: [] },
  },
  { _id: false }
);

const gradeOverrideSchema = new Schema<IGradeOverride>(
  {
    isOverridden: { type: Boolean, default: false },
    originalContribution: { type: Number },
    overrideContribution: { type: Number },
    originalLetterGrade: { type: String },
    overrideLetterGrade: { type: String },
    originalGpa: { type: Number },
    overrideGpa: { type: Number },
    reason: { type: String },
    overriddenBy: { type: Schema.Types.ObjectId as unknown as typeof String, ref: 'User' },
    overriddenAt: { type: Date },
  },
  { _id: false }
);

const gradeCorrectionAuditSchema = new Schema<IGradeCorrectionAudit>(
  {
    previousPercentage: { type: Number, required: true },
    newPercentage: { type: Number, required: true },
    previousLetterGrade: { type: String, required: true },
    newLetterGrade: { type: String, required: true },
    previousGpa: { type: Number, required: true },
    newGpa: { type: Number, required: true },
    reason: { type: String, required: true },
    correctedBy: { type: Schema.Types.ObjectId as unknown as typeof String, ref: 'User', required: true },
    correctedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const gradeResultSchema = new Schema<GradeResultDocument>(
  {
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
    studentId: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: 'User',
      required: [true, 'Student ID is required'],
      index: true,
    },
    categoryContributions: {
      type: [categoryContributionSchema],
      default: [],
    },
    calculatedPercentage: {
      type: Number,
      required: true,
      default: 0,
    },
    finalPercentage: {
      type: Number,
      required: true,
      default: 0,
    },
    letterGrade: {
      type: String,
      required: true,
      default: 'F',
    },
    gpa: {
      type: Number,
      required: true,
      default: 0,
    },
    isPassed: {
      type: Boolean,
      required: true,
      default: false,
    },
    publicationStatus: {
      type: String,
      enum: Object.values(GradePublicationStatus),
      default: GradePublicationStatus.DRAFT,
      index: true,
    },
    override: {
      type: gradeOverrideSchema,
      default: () => ({ isOverridden: false }),
    },
    correctionHistory: {
      type: [gradeCorrectionAuditSchema],
      default: [],
    },
    teacherFeedback: {
      type: String,
      maxlength: [2000, 'Feedback cannot exceed 2000 characters'],
    },
    reviewedBy: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    publishedBy: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: 'User',
    },
    publishedAt: {
      type: Date,
    },
    calculatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'grade_results',
  }
);

gradeResultSchema.index({ courseId: 1, batchId: 1, studentId: 1 }, { unique: true });
gradeResultSchema.index({ batchId: 1, publicationStatus: 1 });
gradeResultSchema.index({ studentId: 1, publicationStatus: 1 });

export const GradeResult: Model<GradeResultDocument> =
  mongoose.models.GradeResult ||
  mongoose.model<GradeResultDocument>('GradeResult', gradeResultSchema);
