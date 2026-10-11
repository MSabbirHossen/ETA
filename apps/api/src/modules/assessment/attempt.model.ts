import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  IAssessmentAttempt,
  IAttemptAnswer,
  AttemptStatus,
  GradingStatus,
} from '@eta/types';

export interface AssessmentAttemptDocument extends Document {
  assessmentId: Types.ObjectId;
  studentId: Types.ObjectId;
  batchId: Types.ObjectId;
  attemptNumber: number;
  startedAt: Date;
  expiresAt: Date;
  submittedAt?: Date;
  status: AttemptStatus;
  gradingStatus: GradingStatus;
  answers: Array<{
    questionId: Types.ObjectId;
    selectedOptionId?: string;
    selectedOptionIds?: string[];
    booleanAnswer?: boolean;
    textAnswer?: string;
    obtainedMarks?: number;
    isCorrect?: boolean;
    isAutoGraded?: boolean;
    feedback?: string;
  }>;
  questionOrder: string[];
  obtainedMarks?: number;
  totalMarks: number;
  percentage?: number;
  isPassed?: boolean;
  timeUsedSeconds?: number;
  feedback?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AttemptAnswerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedOptionId: { type: String },
    selectedOptionIds: [{ type: String }],
    booleanAnswer: { type: Boolean },
    textAnswer: { type: String },
    obtainedMarks: { type: Number },
    isCorrect: { type: Boolean },
    isAutoGraded: { type: Boolean, default: false },
    feedback: { type: String },
  },
  { _id: false }
);

const AssessmentAttemptSchema = new Schema<AssessmentAttemptDocument>(
  {
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    attemptNumber: { type: Number, required: true },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    submittedAt: { type: Date },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'EXPIRED', 'UNDER_REVIEW', 'GRADED'],
      default: 'IN_PROGRESS',
    },
    gradingStatus: {
      type: String,
      enum: ['PENDING', 'AUTO_GRADED', 'MANUALLY_GRADED'],
      default: 'PENDING',
    },
    answers: [AttemptAnswerSchema],
    questionOrder: [{ type: String }],
    obtainedMarks: { type: Number },
    totalMarks: { type: Number, required: true },
    percentage: { type: Number },
    isPassed: { type: Boolean },
    timeUsedSeconds: { type: Number },
    feedback: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

AssessmentAttemptSchema.index(
  { assessmentId: 1, studentId: 1, attemptNumber: 1 },
  { unique: true }
);
AssessmentAttemptSchema.index({ studentId: 1, status: 1 });
AssessmentAttemptSchema.index({ assessmentId: 1, status: 1 });

export function toIAssessmentAttempt(doc: AssessmentAttemptDocument): IAssessmentAttempt {
  const docId = (doc._id || (doc as any).id || '').toString();
  return {
    id: docId,
    assessmentId: ((doc.assessmentId as any)?._id || doc.assessmentId || '').toString(),
    studentId: ((doc.studentId as any)?._id || doc.studentId || '').toString(),
    batchId: ((doc.batchId as any)?._id || doc.batchId || '').toString(),
    attemptNumber: doc.attemptNumber,
    startedAt: doc.startedAt,
    expiresAt: doc.expiresAt,
    submittedAt: doc.submittedAt,
    status: doc.status,
    gradingStatus: doc.gradingStatus,
    answers: (doc.answers || []).map((ans) => ({
      questionId: ((ans.questionId as any)?._id || ans.questionId || '').toString(),
      selectedOptionId: ans.selectedOptionId,
      selectedOptionIds: ans.selectedOptionIds,
      booleanAnswer: ans.booleanAnswer,
      textAnswer: ans.textAnswer,
      obtainedMarks: ans.obtainedMarks,
      isCorrect: ans.isCorrect,
      isAutoGraded: ans.isAutoGraded,
      feedback: ans.feedback,
    })),
    questionOrder: doc.questionOrder || [],
    obtainedMarks: doc.obtainedMarks,
    totalMarks: doc.totalMarks,
    percentage: doc.percentage,
    isPassed: doc.isPassed,
    timeUsedSeconds: doc.timeUsedSeconds,
    feedback: doc.feedback,
    reviewedBy: doc.reviewedBy ? doc.reviewedBy.toString() : undefined,
    reviewedAt: doc.reviewedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const AssessmentAttemptModel = mongoose.model<AssessmentAttemptDocument>(
  'AssessmentAttempt',
  AssessmentAttemptSchema
);
