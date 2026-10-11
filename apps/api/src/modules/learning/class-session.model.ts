import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { ClassPlatform, ClassStatus, type IClassSession } from '@eta/types';

export interface ClassSessionDocument extends Document {
  title: string;
  batchId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId | null;
  moduleId?: mongoose.Types.ObjectId | null;
  lessonId?: mongoose.Types.ObjectId | null;
  teacherId: mongoose.Types.ObjectId;
  scheduledStart: Date;
  scheduledEnd: Date;
  timezone: string;
  platform: ClassPlatform;
  meetingUrl?: string | null;
  meetingId?: string | null;
  meetingPassword?: string | null;
  description?: string | null;
  attachments?: string[];
  attendanceRequirement: boolean;
  recordingUrl?: string | null;
  status: ClassStatus;
  createdAt: Date;
  updatedAt: Date;
}

const classSessionSchema = new Schema<ClassSessionDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
      index: true,
    },
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      default: null,
      index: true,
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      default: null,
      index: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scheduledStart: {
      type: Date,
      required: true,
      index: true,
    },
    scheduledEnd: {
      type: Date,
      required: true,
    },
    timezone: {
      type: String,
      default: 'Asia/Riyadh',
    },
    platform: {
      type: String,
      enum: Object.values(ClassPlatform),
      default: ClassPlatform.GOOGLE_MEET,
    },
    meetingUrl: {
      type: String,
      default: null,
    },
    meetingId: {
      type: String,
      default: null,
    },
    meetingPassword: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    attachments: {
      type: [String],
      default: [],
    },
    attendanceRequirement: {
      type: Boolean,
      default: true,
    },
    recordingUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(ClassStatus),
      default: ClassStatus.SCHEDULED,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'class_sessions',
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret._id = ret._id.toString();
        ret.batchId = ret.batchId.toString();
        ret.courseId = ret.courseId.toString();
        if (ret.subjectId) ret.subjectId = ret.subjectId.toString();
        if (ret.moduleId) ret.moduleId = ret.moduleId.toString();
        if (ret.lessonId) ret.lessonId = ret.lessonId.toString();
        ret.teacherId = ret.teacherId.toString();
        delete ret.__v;
        return ret;
      },
    },
  },
);

classSessionSchema.index({ batchId: 1, scheduledStart: 1 });
classSessionSchema.index({ teacherId: 1, scheduledStart: 1 });

export function toIClassSession(doc: ClassSessionDocument): IClassSession {
  return {
    _id: doc._id.toString(),
    title: doc.title,
    batchId: doc.batchId.toString(),
    courseId: doc.courseId.toString(),
    subjectId: doc.subjectId ? doc.subjectId.toString() : null,
    moduleId: doc.moduleId ? doc.moduleId.toString() : null,
    lessonId: doc.lessonId ? doc.lessonId.toString() : null,
    teacherId: doc.teacherId.toString(),
    scheduledStart: doc.scheduledStart instanceof Date ? doc.scheduledStart.toISOString() : String(doc.scheduledStart),
    scheduledEnd: doc.scheduledEnd instanceof Date ? doc.scheduledEnd.toISOString() : String(doc.scheduledEnd),
    timezone: doc.timezone,
    platform: doc.platform,
    meetingUrl: doc.meetingUrl ?? null,
    meetingId: doc.meetingId ?? null,
    meetingPassword: doc.meetingPassword ?? null,
    description: doc.description ?? null,
    attachments: doc.attachments || [],
    attendanceRequirement: doc.attendanceRequirement,
    recordingUrl: doc.recordingUrl ?? null,
    status: doc.status,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export const ClassSession: Model<ClassSessionDocument> =
  mongoose.models.ClassSession ||
  mongoose.model<ClassSessionDocument>('ClassSession', classSessionSchema);
