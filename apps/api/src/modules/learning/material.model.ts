import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { MaterialType, MaterialVisibility, MaterialStatus, type ILearningMaterial } from '@eta/types';

export interface MaterialDocument extends Document {
  lessonId?: mongoose.Types.ObjectId | null;
  courseId?: mongoose.Types.ObjectId | null;
  moduleId?: mongoose.Types.ObjectId | null;
  title: string;
  description?: string | null;
  type: MaterialType;
  url: string;
  fileSize?: number | null;
  mimeType?: string | null;
  uploadedBy: mongoose.Types.ObjectId;
  downloadable: boolean;
  visibility: MaterialVisibility;
  status: MaterialStatus;
  createdAt: Date;
  updatedAt: Date;
}

const materialSchema = new Schema<MaterialDocument>(
  {
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      default: null,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true,
    },
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: null,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: Object.values(MaterialType),
      default: MaterialType.PDF,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    mimeType: {
      type: String,
      default: null,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    downloadable: {
      type: Boolean,
      default: true,
    },
    visibility: {
      type: String,
      enum: Object.values(MaterialVisibility),
      default: MaterialVisibility.ENROLLMENT_ONLY,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(MaterialStatus),
      default: MaterialStatus.PUBLISHED,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'materials',
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret._id = ret._id.toString();
        if (ret.lessonId) ret.lessonId = ret.lessonId.toString();
        if (ret.courseId) ret.courseId = ret.courseId.toString();
        if (ret.moduleId) ret.moduleId = ret.moduleId.toString();
        ret.uploadedBy = ret.uploadedBy.toString();
        delete ret.__v;
        return ret;
      },
    },
  },
);

materialSchema.index({ lessonId: 1, createdAt: -1 });

export function toILearningMaterial(doc: MaterialDocument): ILearningMaterial {
  return {
    _id: doc._id.toString(),
    lessonId: doc.lessonId ? doc.lessonId.toString() : null,
    courseId: doc.courseId ? doc.courseId.toString() : null,
    moduleId: doc.moduleId ? doc.moduleId.toString() : null,
    title: doc.title,
    description: doc.description ?? null,
    type: doc.type,
    url: doc.url,
    fileSize: doc.fileSize ?? null,
    mimeType: doc.mimeType ?? null,
    uploadedBy: doc.uploadedBy.toString(),
    downloadable: doc.downloadable,
    visibility: doc.visibility,
    status: doc.status,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export const LearningMaterial: Model<MaterialDocument> =
  mongoose.models.LearningMaterial ||
  mongoose.model<MaterialDocument>('LearningMaterial', materialSchema);
