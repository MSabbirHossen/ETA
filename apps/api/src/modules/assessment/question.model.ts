import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  IQuestion,
  ISafeQuestion,
  QuestionType,
  QuestionDifficulty,
  QuestionStatus,
} from '@eta/types';

export interface QuestionDocument extends Document {
  prompt: string;
  type: QuestionType;
  options?: Array<{
    id: string;
    text: string;
    isCorrect?: boolean;
    explanation?: string;
  }>;
  correctAnswer?: string | boolean | string[];
  explanation?: string;
  marks: number;
  difficulty: QuestionDifficulty;
  tags?: string[];
  courseId: Types.ObjectId;
  subjectId?: Types.ObjectId;
  moduleId?: Types.ObjectId;
  lessonId?: Types.ObjectId;
  topic?: string;
  createdBy: Types.ObjectId;
  status: QuestionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionOptionSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false },
    explanation: { type: String },
  },
  { _id: false }
);

const QuestionSchema = new Schema<QuestionDocument>(
  {
    prompt: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['MCQ', 'MULTIPLE_SELECT', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY'],
      required: true,
    },
    options: [QuestionOptionSchema],
    correctAnswer: { type: Schema.Types.Mixed },
    explanation: { type: String },
    marks: { type: Number, required: true, default: 1 },
    difficulty: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD'],
      default: 'MEDIUM',
    },
    tags: [{ type: String, trim: true }],
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module' },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    topic: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

QuestionSchema.index({ courseId: 1, type: 1, status: 1 });
QuestionSchema.index({ subjectId: 1, status: 1 });
QuestionSchema.index({ tags: 1 });

export function toIQuestion(doc: QuestionDocument): IQuestion {
  return {
    id: doc._id.toString(),
    prompt: doc.prompt,
    type: doc.type,
    options: doc.options?.map((opt) => ({
      id: opt.id,
      text: opt.text,
      isCorrect: opt.isCorrect,
      explanation: opt.explanation,
    })),
    correctAnswer: doc.correctAnswer,
    explanation: doc.explanation,
    marks: doc.marks,
    difficulty: doc.difficulty,
    tags: doc.tags,
    courseId: doc.courseId.toString(),
    subjectId: doc.subjectId ? doc.subjectId.toString() : undefined,
    moduleId: doc.moduleId ? doc.moduleId.toString() : undefined,
    lessonId: doc.lessonId ? doc.lessonId.toString() : undefined,
    topic: doc.topic,
    createdBy: doc.createdBy.toString(),
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Strips all answer keys, correct option markers, and teacher explanations.
 * CRITICAL for student protection!
 */
export function toISafeQuestion(doc: QuestionDocument | IQuestion): ISafeQuestion {
  const qId = 'id' in doc ? doc.id : (doc as QuestionDocument)._id.toString();
  return {
    id: qId,
    prompt: doc.prompt,
    type: doc.type,
    options: doc.options?.map((opt) => ({
      id: opt.id,
      text: opt.text,
    })),
    marks: doc.marks,
    difficulty: doc.difficulty,
    topic: doc.topic,
  };
}

export const QuestionModel = mongoose.model<QuestionDocument>('Question', QuestionSchema);
