import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { LessonType, LessonStatus, LessonVisibility, type ILesson } from '@eta/types';

export interface LessonDocument extends Document {
  moduleId: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId | null;
  courseId?: mongoose.Types.ObjectId | null;
  title: string;
  slug: string;
  description?: string | null;
  sequenceOrder: number;
  lessonType: LessonType;
  estimatedDurationMinutes?: number | null;
  bodyContent?: string | null;
  videoUrl?: string | null;
  recordingUrl?: string | null;
  attachments?: string[];
  learningObjectives?: string[];
  publishedAt?: Date | null;
  completionRule?: string | null;
  status: LessonStatus;
  visibility: LessonVisibility;
  createdAt: Date;
  updatedAt: Date;
}

const lessonSchema = new Schema<LessonDocument>(
  {
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    sequenceOrder: {
      type: Number,
      default: 1,
      index: true,
    },
    lessonType: {
      type: String,
      enum: Object.values(LessonType),
      default: LessonType.TEXT,
      index: true,
    },
    estimatedDurationMinutes: {
      type: Number,
      default: null,
    },
    bodyContent: {
      type: String,
      default: null,
    },
    videoUrl: {
      type: String,
      default: null,
    },
    recordingUrl: {
      type: String,
      default: null,
    },
    attachments: {
      type: [String],
      default: [],
    },
    learningObjectives: {
      type: [String],
      default: [],
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    completionRule: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(LessonStatus),
      default: LessonStatus.DRAFT,
      index: true,
    },
    visibility: {
      type: String,
      enum: Object.values(LessonVisibility),
      default: LessonVisibility.ENROLLMENT_ONLY,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'lessons',
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret._id = ret._id.toString();
        ret.moduleId = ret.moduleId.toString();
        if (ret.subjectId) ret.subjectId = ret.subjectId.toString();
        if (ret.courseId) ret.courseId = ret.courseId.toString();
        delete ret.__v;
        return ret;
      },
    },
  },
);

lessonSchema.index({ moduleId: 1, sequenceOrder: 1 });
lessonSchema.index({ moduleId: 1, slug: 1 }, { unique: true });

export function toILesson(doc: LessonDocument): ILesson {
  return {
    _id: doc._id.toString(),
    moduleId: doc.moduleId.toString(),
    subjectId: doc.subjectId ? doc.subjectId.toString() : null,
    courseId: doc.courseId ? doc.courseId.toString() : null,
    title: doc.title,
    slug: doc.slug,
    description: doc.description ?? null,
    sequenceOrder: doc.sequenceOrder,
    lessonType: doc.lessonType,
    estimatedDurationMinutes: doc.estimatedDurationMinutes ?? null,
    bodyContent: doc.bodyContent ?? null,
    videoUrl: doc.videoUrl ?? null,
    recordingUrl: doc.recordingUrl ?? null,
    attachments: doc.attachments || [],
    learningObjectives: doc.learningObjectives || [],
    publishedAt: doc.publishedAt instanceof Date ? doc.publishedAt.toISOString() : (doc.publishedAt ? String(doc.publishedAt) : null),
    completionRule: doc.completionRule ?? null,
    status: doc.status,
    visibility: doc.visibility,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export const Lesson: Model<LessonDocument> =
  mongoose.models.Lesson || mongoose.model<LessonDocument>('Lesson', lessonSchema);
