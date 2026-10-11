import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  CourseLevel,
  CourseVisibility,
  CourseStatus,
  type ICourse,
  type SupportedLanguage,
} from '@eta/types';

export interface CourseDocument extends Document {
  programId?: mongoose.Types.ObjectId | null;
  title: string;
  slug: string;
  code: string;
  description: string;
  thumbnail?: string | null;
  level: CourseLevel;
  language: SupportedLanguage;
  duration?: string | null;
  estimatedStudyHours?: number | null;
  learningOutcomes: string[];
  prerequisites: string[];
  teacherIds: mongoose.Types.ObjectId[];
  certificateRules?: {
    minGradePercentage?: number;
    minAttendancePercentage?: number;
  };
  visibility: CourseVisibility;
  status: CourseStatus;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<CourseDocument>(
  {
    programId: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
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
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    thumbnail: {
      type: String,
      default: null,
    },
    level: {
      type: String,
      enum: Object.values(CourseLevel),
      default: CourseLevel.BEGINNER,
      index: true,
    },
    language: {
      type: String,
      enum: ['en', 'bn', 'ar'],
      default: 'en',
    },
    duration: {
      type: String,
      default: null,
    },
    estimatedStudyHours: {
      type: Number,
      default: null,
    },
    learningOutcomes: {
      type: [String],
      default: [],
    },
    prerequisites: {
      type: [String],
      default: [],
    },
    teacherIds: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
      index: true,
    },
    certificateRules: {
      minGradePercentage: { type: Number, default: 60 },
      minAttendancePercentage: { type: Number, default: 80 },
    },
    visibility: {
      type: String,
      enum: Object.values(CourseVisibility),
      default: CourseVisibility.PUBLIC,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(CourseStatus),
      default: CourseStatus.DRAFT,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'courses',
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret._id = ret._id.toString();
        if (ret.programId) ret.programId = ret.programId.toString();
        ret.teacherIds = (ret.teacherIds || []).map((id: any) => id.toString());
        delete ret.__v;
        return ret;
      },
    },
  },
);

export function toICourse(doc: CourseDocument): ICourse {
  return {
    _id: doc._id.toString(),
    programId: doc.programId ? doc.programId.toString() : null,
    title: doc.title,
    slug: doc.slug,
    code: doc.code,
    description: doc.description,
    thumbnail: doc.thumbnail ?? null,
    level: doc.level,
    language: doc.language,
    duration: doc.duration ?? null,
    estimatedStudyHours: doc.estimatedStudyHours ?? null,
    learningOutcomes: doc.learningOutcomes ?? [],
    prerequisites: doc.prerequisites ?? [],
    teacherIds: (doc.teacherIds || []).map((id) => id.toString()),
    certificateRules: doc.certificateRules,
    visibility: doc.visibility,
    status: doc.status,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export const Course: Model<CourseDocument> =
  mongoose.models.Course || mongoose.model<CourseDocument>('Course', courseSchema);
