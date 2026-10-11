import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  AnnouncementAudience,
  AnnouncementPriority,
  AnnouncementStatus,
  type IAnnouncement,
  type IAnnouncementAttachment,
} from '@eta/types';

export interface AnnouncementDocument extends Document, Omit<IAnnouncement, '_id' | 'audience' | 'createdBy' | 'updatedBy'> {
  _id: mongoose.Types.ObjectId;
  audience: {
    audienceType: AnnouncementAudience;
    targetCourseId?: mongoose.Types.ObjectId;
    targetBatchId?: mongoose.Types.ObjectId;
    targetUserIds?: mongoose.Types.ObjectId[];
  };
  createdBy: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId; name: string; email: string };
  updatedBy?: mongoose.Types.ObjectId;
}

const AnnouncementAttachmentSchema = new Schema<IAnnouncementAttachment>(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    fileType: { type: String },
    fileSize: { type: Number },
  },
  { _id: false },
);

const AnnouncementAudienceSchema = new Schema(
  {
    audienceType: {
      type: String,
      enum: Object.values(AnnouncementAudience),
      required: true,
      default: AnnouncementAudience.ALL,
    },
    targetCourseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    targetBatchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
    targetUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false },
);

const AnnouncementSchema = new Schema<AnnouncementDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    body: { type: String, required: true, trim: true },
    summary: { type: String, trim: true, maxlength: 500 },
    priority: {
      type: String,
      enum: Object.values(AnnouncementPriority),
      default: AnnouncementPriority.NORMAL,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(AnnouncementStatus),
      default: AnnouncementStatus.PUBLISHED,
      required: true,
    },
    audience: { type: AnnouncementAudienceSchema, required: true },
    attachments: [AnnouncementAttachmentSchema],
    isPublic: { type: Boolean, default: false },
    publishAt: { type: Date, default: Date.now, required: true },
    expiresAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    sendNotification: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

// Indexes for query performance
AnnouncementSchema.index({ status: 1, publishAt: 1, expiresAt: 1 });
AnnouncementSchema.index({ 'audience.audienceType': 1 });
AnnouncementSchema.index({ 'audience.targetCourseId': 1 });
AnnouncementSchema.index({ 'audience.targetBatchId': 1 });
AnnouncementSchema.index({ priority: 1 });
AnnouncementSchema.index({ createdAt: -1 });

export function toIAnnouncement(doc: AnnouncementDocument): IAnnouncement {
  return {
    _id: doc._id.toString(),
    title: doc.title,
    body: doc.body,
    summary: doc.summary,
    priority: doc.priority,
    status: doc.status,
    audience: {
      audienceType: doc.audience.audienceType,
      targetCourseId: doc.audience.targetCourseId?.toString(),
      targetBatchId: doc.audience.targetBatchId?.toString(),
      targetUserIds: doc.audience.targetUserIds?.map((id: mongoose.Types.ObjectId) => id.toString()),
    },
    attachments: doc.attachments || [],
    isPublic: doc.isPublic,
    publishAt: doc.publishAt,
    expiresAt: doc.expiresAt ?? null,
    publishedAt: doc.publishedAt ?? null,
    createdBy:
      doc.createdBy && typeof doc.createdBy === 'object' && 'name' in doc.createdBy
        ? {
            _id: (doc.createdBy as any)._id.toString(),
            name: (doc.createdBy as any).name,
            email: (doc.createdBy as any).email,
          }
        : (doc.createdBy as any).toString(),
    updatedBy: doc.updatedBy?.toString(),
    sendNotification: doc.sendNotification,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const Announcement: Model<AnnouncementDocument> =
  mongoose.models.Announcement || mongoose.model<AnnouncementDocument>('Announcement', AnnouncementSchema);
