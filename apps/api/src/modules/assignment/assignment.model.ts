import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  AssignmentStatus,
  SubmissionType,
  AssignmentVisibility,
  type IAssignment,
} from '@eta/types';

export interface AssignmentDocument extends Document {
  title: string;
  slug: string;
  description: string | null;
  instructions: string;
  courseId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId | null;
  moduleId: mongoose.Types.ObjectId | null;
  lessonId: mongoose.Types.ObjectId | null;
  teacherId: mongoose.Types.ObjectId;
  attachments: string[];
  totalMarks: number;
  passMarks: number | null;
  publishDate: Date;
  dueDate: Date;
  closesAt: Date | null;
  allowLateSubmission: boolean;
  latePenalty: number;
  submissionType: SubmissionType;
  maxAttempts: number;
  resubmissionAllowed: boolean;
  status: AssignmentStatus;
  visibility: AssignmentVisibility;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<AssignmentDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: null, trim: true, maxlength: 2000 },
    instructions: { type: String, required: true, trim: true, maxlength: 50000 },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', default: null },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', default: null },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', default: null },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    attachments: { type: [String], default: [] },
    totalMarks: { type: Number, required: true, min: 1, default: 100 },
    passMarks: { type: Number, default: null },
    publishDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    closesAt: { type: Date, default: null },
    allowLateSubmission: { type: Boolean, default: true },
    latePenalty: { type: Number, default: 0, min: 0, max: 100 },
    submissionType: {
      type: String,
      enum: Object.values(SubmissionType),
      default: SubmissionType.MIXED,
    },
    maxAttempts: { type: Number, required: true, default: 1, min: 1, max: 20 },
    resubmissionAllowed: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(AssignmentStatus),
      default: AssignmentStatus.DRAFT,
      index: true,
    },
    visibility: {
      type: String,
      enum: Object.values(AssignmentVisibility),
      default: AssignmentVisibility.ENROLLMENT_ONLY,
    },
  },
  {
    timestamps: true,
  },
);

assignmentSchema.index({ courseId: 1, batchId: 1, status: 1 });
assignmentSchema.index({ batchId: 1, dueDate: 1 });
assignmentSchema.index({ batchId: 1, slug: 1 }, { unique: true });

export function toIAssignment(doc: AssignmentDocument): IAssignment {
  return {
    _id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    description: doc.description,
    instructions: doc.instructions,
    courseId: doc.courseId.toString(),
    batchId: doc.batchId.toString(),
    subjectId: doc.subjectId ? doc.subjectId.toString() : null,
    moduleId: doc.moduleId ? doc.moduleId.toString() : null,
    lessonId: doc.lessonId ? doc.lessonId.toString() : null,
    teacherId: doc.teacherId.toString(),
    attachments: doc.attachments || [],
    totalMarks: doc.totalMarks,
    passMarks: doc.passMarks ?? null,
    publishDate: doc.publishDate.toISOString(),
    dueDate: doc.dueDate.toISOString(),
    closesAt: doc.closesAt ? doc.closesAt.toISOString() : null,
    allowLateSubmission: doc.allowLateSubmission,
    latePenalty: doc.latePenalty,
    submissionType: doc.submissionType,
    maxAttempts: doc.maxAttempts,
    resubmissionAllowed: doc.resubmissionAllowed,
    status: doc.status,
    visibility: doc.visibility,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const Assignment: Model<AssignmentDocument> =
  mongoose.models.Assignment ||
  mongoose.model<AssignmentDocument>('Assignment', assignmentSchema);
