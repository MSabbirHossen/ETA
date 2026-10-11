import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  IAssessment,
  AssessmentType,
  AssessmentStatus,
  ResultReleasePolicy,
} from '@eta/types';

export interface AssessmentDocument extends Document {
  title: string;
  slug: string;
  description?: string;
  instructions?: string;
  assessmentType: AssessmentType;
  courseId: Types.ObjectId;
  batchId: Types.ObjectId;
  subjectId?: Types.ObjectId;
  moduleId?: Types.ObjectId;
  lessonId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  questions: Array<{
    questionId: Types.ObjectId;
    marks: number;
    order?: number;
  }>;
  totalMarks: number;
  passMark: number;
  passPercentage?: number;
  durationMinutes: number;
  attemptsAllowed: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  negativeMarking: boolean;
  negativeMarksPerQuestion?: number;
  autoGrading: boolean;
  resultReleasePolicy: ResultReleasePolicy;
  opensAt: Date;
  dueAt: Date;
  closesAt?: Date;
  status: AssessmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentQuestionConfigSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    marks: { type: Number, required: true, default: 1 },
    order: { type: Number },
  },
  { _id: false }
);

const AssessmentSchema = new Schema<AssessmentDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    description: { type: String },
    instructions: { type: String },
    assessmentType: {
      type: String,
      enum: ['QUIZ', 'EXAM', 'PRACTICE', 'CHECKPOINT'],
      default: 'QUIZ',
    },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module' },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    questions: [AssessmentQuestionConfigSchema],
    totalMarks: { type: Number, required: true },
    passMark: { type: Number, required: true, default: 40 },
    passPercentage: { type: Number },
    durationMinutes: { type: Number, required: true, min: 1 },
    attemptsAllowed: { type: Number, required: true, default: 1, min: 1 },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    negativeMarking: { type: Boolean, default: false },
    negativeMarksPerQuestion: { type: Number, default: 0 },
    autoGrading: { type: Boolean, default: true },
    resultReleasePolicy: {
      type: String,
      enum: ['IMMEDIATE', 'AFTER_CLOSE', 'MANUAL'],
      default: 'IMMEDIATE',
    },
    opensAt: { type: Date, required: true },
    dueAt: { type: Date, required: true },
    closesAt: { type: Date },
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'LIVE', 'CLOSED', 'ARCHIVED'],
      default: 'DRAFT',
    },
  },
  {
    timestamps: true,
  }
);

AssessmentSchema.index({ courseId: 1, batchId: 1, status: 1 });
AssessmentSchema.index({ batchId: 1, dueAt: 1 });
AssessmentSchema.index({ batchId: 1, slug: 1 }, { unique: true });

export function toIAssessment(doc: AssessmentDocument): IAssessment {
  const docId = (doc._id || (doc as any).id || '').toString();
  return {
    id: docId,
    title: doc.title,
    slug: doc.slug,
    description: doc.description,
    instructions: doc.instructions,
    assessmentType: doc.assessmentType,
    courseId: doc.courseId ? doc.courseId.toString() : '',
    batchId: doc.batchId ? doc.batchId.toString() : '',
    subjectId: doc.subjectId ? doc.subjectId.toString() : undefined,
    moduleId: doc.moduleId ? doc.moduleId.toString() : undefined,
    lessonId: doc.lessonId ? doc.lessonId.toString() : undefined,
    createdBy: doc.createdBy ? doc.createdBy.toString() : '',
    questions: (doc.questions || []).map((q) => ({
      questionId: ((q.questionId as any)?._id || q.questionId || '').toString(),
      marks: q.marks,
      order: q.order,
    })),
    totalMarks: doc.totalMarks,
    passMark: doc.passMark,
    passPercentage: doc.passPercentage,
    durationMinutes: doc.durationMinutes,
    attemptsAllowed: doc.attemptsAllowed,
    shuffleQuestions: !!doc.shuffleQuestions,
    shuffleOptions: !!doc.shuffleOptions,
    negativeMarking: !!doc.negativeMarking,
    negativeMarksPerQuestion: doc.negativeMarksPerQuestion,
    autoGrading: doc.autoGrading !== false,
    resultReleasePolicy: doc.resultReleasePolicy || 'IMMEDIATE',
    opensAt: doc.opensAt,
    dueAt: doc.dueAt,
    closesAt: doc.closesAt,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const AssessmentModel = mongoose.model<AssessmentDocument>('Assessment', AssessmentSchema);
