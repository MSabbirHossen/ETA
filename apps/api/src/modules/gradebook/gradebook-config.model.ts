import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  GradeSourceType,
  AttemptSelectionPolicy,
  MissingWorkPolicy,
  type IGradebookConfig,
  type IGradeCategoryConfig,
  type IGradeScaleItem,
} from '@eta/types';

export const DEFAULT_GRADE_SCALE: IGradeScaleItem[] = [
  { letter: 'A+', minPercentage: 90, gpa: 4.0, description: 'Outstanding' },
  { letter: 'A', minPercentage: 85, gpa: 3.75, description: 'Excellent' },
  { letter: 'B+', minPercentage: 80, gpa: 3.5, description: 'Very Good' },
  { letter: 'B', minPercentage: 75, gpa: 3.0, description: 'Good' },
  { letter: 'C+', minPercentage: 70, gpa: 2.5, description: 'Above Average' },
  { letter: 'C', minPercentage: 65, gpa: 2.0, description: 'Average' },
  { letter: 'D', minPercentage: 60, gpa: 1.5, description: 'Pass' },
  { letter: 'F', minPercentage: 0, gpa: 0.0, description: 'Fail' },
];

export interface GradebookConfigDocument extends Omit<IGradebookConfig, '_id' | 'createdAt' | 'updatedAt'>, Document {
  createdAt: Date;
  updatedAt: Date;
}

const gradeCategoryConfigSchema = new Schema<IGradeCategoryConfig>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    sourceType: {
      type: String,
      enum: Object.values(GradeSourceType),
      required: true,
    },
    weight: { type: Number, required: true, min: 0, max: 100 },
    dropLowestCount: { type: Number, default: 0, min: 0 },
    missingWorkPolicy: {
      type: String,
      enum: Object.values(MissingWorkPolicy),
      default: MissingWorkPolicy.ZERO,
    },
    attemptPolicy: {
      type: String,
      enum: Object.values(AttemptSelectionPolicy),
      default: AttemptSelectionPolicy.HIGHEST,
    },
    customSourceIds: [{ type: Schema.Types.ObjectId, refPath: 'sourceType' }],
  },
  { _id: false }
);

const gradeScaleItemSchema = new Schema<IGradeScaleItem>(
  {
    letter: { type: String, required: true, trim: true },
    minPercentage: { type: Number, required: true, min: 0, max: 100 },
    gpa: { type: Number, required: true, min: 0, max: 5 },
    description: { type: String, trim: true },
  },
  { _id: false }
);

const gradebookConfigSchema = new Schema<GradebookConfigDocument>(
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
    categories: {
      type: [gradeCategoryConfigSchema],
      required: true,
      default: [],
    },
    passingPercentage: {
      type: Number,
      required: true,
      default: 60,
      min: 0,
      max: 100,
    },
    gradeScale: {
      type: [gradeScaleItemSchema],
      default: DEFAULT_GRADE_SCALE,
    },
    attendanceFullScorePercentage: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    isConfigured: {
      type: Boolean,
      default: false,
    },
    configuredBy: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    collection: 'gradebook_configs',
  }
);

gradebookConfigSchema.index({ courseId: 1, batchId: 1 }, { unique: true });

export const GradebookConfig: Model<GradebookConfigDocument> =
  mongoose.models.GradebookConfig ||
  mongoose.model<GradebookConfigDocument>('GradebookConfig', gradebookConfigSchema);
