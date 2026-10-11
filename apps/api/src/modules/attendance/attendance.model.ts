import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  AttendanceStatus,
  AttendanceSessionStatus,
  type IAttendanceRecord,
  type IAttendanceSession,
  type IAttendanceCorrection,
} from '@eta/types';

// ============================================================================
// Attendance Session Document & Schema
// ============================================================================

export interface AttendanceSessionDocument extends Document {
  classSessionId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  status: AttendanceSessionStatus;
  openedBy: mongoose.Types.ObjectId;
  openedAt: Date;
  finalizedBy?: mongoose.Types.ObjectId | null;
  finalizedAt?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSessionSchema = new Schema<AttendanceSessionDocument>(
  {
    classSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'ClassSession',
      required: true,
      unique: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(AttendanceSessionStatus),
      default: AttendanceSessionStatus.OPEN,
      index: true,
    },
    openedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    finalizedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: null,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    collection: 'attendance_sessions',
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret._id = ret._id.toString();
        ret.classSessionId = ret.classSessionId.toString();
        ret.courseId = ret.courseId.toString();
        ret.batchId = ret.batchId.toString();
        ret.openedBy = ret.openedBy.toString();
        if (ret.finalizedBy) ret.finalizedBy = ret.finalizedBy.toString();
        delete ret.__v;
        return ret;
      },
    },
  },
);

attendanceSessionSchema.index({ batchId: 1, status: 1 });
attendanceSessionSchema.index({ courseId: 1, status: 1 });

export const AttendanceSession: Model<AttendanceSessionDocument> =
  mongoose.models.AttendanceSession ||
  mongoose.model<AttendanceSessionDocument>('AttendanceSession', attendanceSessionSchema);

export function toIAttendanceSession(doc: AttendanceSessionDocument): IAttendanceSession {
  return {
    _id: doc._id ? doc._id.toString() : '',
    classSessionId: doc.classSessionId ? doc.classSessionId.toString() : '',
    courseId: doc.courseId ? doc.courseId.toString() : '',
    batchId: doc.batchId ? doc.batchId.toString() : '',
    status: doc.status,
    openedBy: doc.openedBy ? doc.openedBy.toString() : '',
    openedAt: doc.openedAt instanceof Date ? doc.openedAt.toISOString() : String(doc.openedAt || new Date().toISOString()),
    finalizedBy: doc.finalizedBy ? doc.finalizedBy.toString() : null,
    finalizedAt:
      doc.finalizedAt instanceof Date ? doc.finalizedAt.toISOString() : doc.finalizedAt ? String(doc.finalizedAt) : null,
    notes: doc.notes ?? null,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt || new Date().toISOString()),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt || new Date().toISOString()),
  };
}

// ============================================================================
// Attendance Record Document & Schema — PRD §39, §70
// ============================================================================

export interface AttendanceCorrectionSubdocument {
  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  changedBy: mongoose.Types.ObjectId;
  changedAt: Date;
  reason: string;
}

export interface AttendanceRecordDocument extends Document {
  classSessionId: mongoose.Types.ObjectId;
  attendanceSessionId?: mongoose.Types.ObjectId | null;
  courseId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  status: AttendanceStatus;
  markedBy: mongoose.Types.ObjectId;
  markedAt: Date;
  note?: string | null;
  corrections: AttendanceCorrectionSubdocument[];
  createdAt: Date;
  updatedAt: Date;
}

const attendanceCorrectionSchema = new Schema<AttendanceCorrectionSubdocument>(
  {
    previousStatus: {
      type: String,
      enum: Object.values(AttendanceStatus),
      required: true,
    },
    newStatus: {
      type: String,
      enum: Object.values(AttendanceStatus),
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
  },
  { _id: false },
);

const attendanceRecordSchema = new Schema<AttendanceRecordDocument>(
  {
    classSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'ClassSession',
      required: true,
      index: true,
    },
    attendanceSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      default: null,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(AttendanceStatus),
      required: true,
      index: true,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: null,
      maxlength: 500,
    },
    corrections: {
      type: [attendanceCorrectionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'attendance_records',
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret._id = ret._id.toString();
        ret.classSessionId = ret.classSessionId.toString();
        if (ret.attendanceSessionId) ret.attendanceSessionId = ret.attendanceSessionId.toString();
        ret.courseId = ret.courseId.toString();
        ret.batchId = ret.batchId.toString();
        ret.studentId = ret.studentId.toString();
        ret.markedBy = ret.markedBy.toString();
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Compound Unique Index: classSessionId + studentId per PRD §70
attendanceRecordSchema.index({ classSessionId: 1, studentId: 1 }, { unique: true });
attendanceRecordSchema.index({ studentId: 1, classSessionId: 1 });
attendanceRecordSchema.index({ batchId: 1, status: 1 });
attendanceRecordSchema.index({ courseId: 1, status: 1 });
attendanceRecordSchema.index({ studentId: 1, status: 1 });

export const AttendanceRecord: Model<AttendanceRecordDocument> =
  mongoose.models.AttendanceRecord ||
  mongoose.model<AttendanceRecordDocument>('AttendanceRecord', attendanceRecordSchema);

export function toIAttendanceRecord(
  doc: AttendanceRecordDocument,
  extra?: {
    studentName?: string;
    studentEmail?: string;
    studentAvatar?: string | null;
    classTitle?: string;
    batchName?: string;
    courseTitle?: string;
  },
): IAttendanceRecord {
  const corrections: IAttendanceCorrection[] = (doc.corrections || []).map((c) => ({
    previousStatus: c.previousStatus,
    newStatus: c.newStatus,
    changedBy: c.changedBy ? c.changedBy.toString() : '',
    changedAt: c.changedAt instanceof Date ? c.changedAt.toISOString() : String(c.changedAt || new Date().toISOString()),
    reason: c.reason,
  }));

  return {
    _id: doc._id ? doc._id.toString() : '',
    classSessionId: doc.classSessionId ? doc.classSessionId.toString() : '',
    attendanceSessionId: doc.attendanceSessionId ? doc.attendanceSessionId.toString() : null,
    courseId: doc.courseId ? doc.courseId.toString() : '',
    batchId: doc.batchId ? doc.batchId.toString() : '',
    studentId: doc.studentId ? doc.studentId.toString() : '',
    status: doc.status,
    markedBy: doc.markedBy ? doc.markedBy.toString() : '',
    markedAt: doc.markedAt instanceof Date ? doc.markedAt.toISOString() : String(doc.markedAt || new Date().toISOString()),
    note: doc.note ?? null,
    corrections,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt || new Date().toISOString()),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt || new Date().toISOString()),
    studentName: extra?.studentName,
    studentEmail: extra?.studentEmail,
    studentAvatar: extra?.studentAvatar,
    classTitle: extra?.classTitle,
    batchName: extra?.batchName,
    courseTitle: extra?.courseTitle,
  };
}
