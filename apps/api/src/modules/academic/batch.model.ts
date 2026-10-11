import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { BatchStatus, type IBatch } from '@eta/types';

export interface BatchDocument extends Document {
  courseId: mongoose.Types.ObjectId;
  batchName: string;
  batchCode: string;
  startDate: Date;
  endDate: Date;
  enrollmentStart: Date;
  enrollmentEnd: Date;
  studentLimit: number;
  teacherIds: mongoose.Types.ObjectId[];
  meetingSchedule?: string | null;
  status: BatchStatus;
  createdAt: Date;
  updatedAt: Date;
}

const batchSchema = new Schema<BatchDocument>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    batchName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    batchCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    enrollmentStart: {
      type: Date,
      required: true,
    },
    enrollmentEnd: {
      type: Date,
      required: true,
    },
    studentLimit: {
      type: Number,
      required: true,
      default: 50,
    },
    teacherIds: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
      index: true,
    },
    meetingSchedule: {
      type: String,
      default: null,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: Object.values(BatchStatus),
      default: BatchStatus.UPCOMING,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'batches',
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

export function toIBatch(doc: BatchDocument): IBatch {
  return {
    _id: doc._id.toString(),
    courseId: doc.courseId.toString(),
    batchName: doc.batchName,
    batchCode: doc.batchCode,
    startDate: doc.startDate instanceof Date ? doc.startDate.toISOString() : String(doc.startDate),
    endDate: doc.endDate instanceof Date ? doc.endDate.toISOString() : String(doc.endDate),
    enrollmentStart: doc.enrollmentStart instanceof Date ? doc.enrollmentStart.toISOString() : String(doc.enrollmentStart),
    enrollmentEnd: doc.enrollmentEnd instanceof Date ? doc.enrollmentEnd.toISOString() : String(doc.enrollmentEnd),
    studentLimit: doc.studentLimit,
    teacherIds: (doc.teacherIds || []).map((id) => id.toString()),
    meetingSchedule: doc.meetingSchedule ?? null,
    status: doc.status,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export const Batch: Model<BatchDocument> =
  mongoose.models.Batch || mongoose.model<BatchDocument>('Batch', batchSchema);
