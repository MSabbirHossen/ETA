import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  CalendarEventType,
  CalendarEventStatus,
  CalendarSourceType,
  type ICalendarEvent,
} from '@eta/types';

export interface ManualCalendarEventDocument extends Document {
  title: string;
  description?: string | null;
  startAt: Date;
  endAt?: Date | null;
  allDay: boolean;
  eventType: CalendarEventType;
  status: CalendarEventStatus;
  courseId?: mongoose.Types.ObjectId | null;
  batchId?: mongoose.Types.ObjectId | null;
  createdBy: mongoose.Types.ObjectId;
  isPublic: boolean;
  targetRoles: string[];
  actionUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const manualCalendarEventSchema = new Schema<ManualCalendarEventDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    startAt: {
      type: Date,
      required: true,
      index: true,
    },
    endAt: {
      type: Date,
      default: null,
    },
    allDay: {
      type: Boolean,
      default: false,
    },
    eventType: {
      type: String,
      enum: Object.values(CalendarEventType),
      default: CalendarEventType.EVENT,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(CalendarEventStatus),
      default: CalendarEventStatus.SCHEDULED,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    targetRoles: {
      type: [String],
      default: [],
    },
    actionUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'calendar_manual_events',
  }
);

manualCalendarEventSchema.index({ startAt: 1, endAt: 1 });
manualCalendarEventSchema.index({ isPublic: 1, startAt: 1 });
manualCalendarEventSchema.index({ batchId: 1, startAt: 1 });

export function toManualCalendarEventDTO(doc: any): ICalendarEvent {
  return {
    id: doc._id.toString(),
    sourceType: CalendarSourceType.MANUAL_EVENT,
    sourceId: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    startAt: new Date(doc.startAt).toISOString(),
    endAt: doc.endAt ? new Date(doc.endAt).toISOString() : null,
    allDay: doc.allDay,
    eventType: doc.eventType,
    status: doc.status,
    courseId: doc.courseId ? doc.courseId.toString() : null,
    batchId: doc.batchId ? doc.batchId.toString() : null,
    actionUrl: doc.actionUrl ?? null,
    metadata: {
      isPublic: doc.isPublic,
      targetRoles: doc.targetRoles,
    },
  };
}

export const ManualCalendarEvent: Model<ManualCalendarEventDocument> =
  mongoose.models.ManualCalendarEvent ||
  mongoose.model<ManualCalendarEventDocument>('ManualCalendarEvent', manualCalendarEventSchema);
