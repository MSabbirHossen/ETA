import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { ISubject } from '@eta/types';

export interface SubjectDocument extends Document {
  title: string;
  code: string;
  description?: string | null;
  courseId: mongoose.Types.ObjectId;
  teacherIds: mongoose.Types.ObjectId[];
  sequence: number;
  totalMarks?: number | null;
  passingRules?: {
    minMarks?: number;
    minPercentage?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const subjectSchema = new Schema<SubjectDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: null,
      maxlength: 5000,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    teacherIds: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
      index: true,
    },
    sequence: {
      type: Number,
      default: 0,
      index: true,
    },
    totalMarks: {
      type: Number,
      default: null,
    },
    passingRules: {
      minMarks: { type: Number, default: undefined },
      minPercentage: { type: Number, default: 40 },
    },
  },
  {
    timestamps: true,
    collection: 'subjects',
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret._id = ret._id.toString();
        ret.courseId = ret.courseId.toString();
        ret.teacherIds = (ret.teacherIds || []).map((id: any) => id.toString());
        delete ret.__v;
        return ret;
      },
    },
  },
);

subjectSchema.index({ courseId: 1, sequence: 1 });
subjectSchema.index({ courseId: 1, code: 1 }, { unique: true });

export function toISubject(doc: SubjectDocument): ISubject {
  return {
    _id: doc._id.toString(),
    title: doc.title,
    code: doc.code,
    description: doc.description ?? null,
    courseId: doc.courseId.toString(),
    teacherIds: (doc.teacherIds || []).map((id) => id.toString()),
    sequence: doc.sequence,
    totalMarks: doc.totalMarks ?? null,
    passingRules: doc.passingRules,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export const Subject: Model<SubjectDocument> =
  mongoose.models.Subject || mongoose.model<SubjectDocument>('Subject', subjectSchema);
