import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  EmailDeliveryStatus,
  type INotification,
} from '@eta/types';

export interface NotificationDocument extends Document, Omit<INotification, '_id' | 'userId'> {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
}

const NotificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    category: {
      type: String,
      enum: Object.values(NotificationCategory),
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.NORMAL,
      required: true,
    },
    sourceType: { type: String },
    sourceId: { type: String },
    actionUrl: { type: String },
    metadata: { type: Schema.Types.Mixed },
    readAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: Date.now },
    emailStatus: {
      type: String,
      enum: Object.values(EmailDeliveryStatus),
      default: EmailDeliveryStatus.PENDING,
    },
    emailError: { type: String, default: null },
    idempotencyKey: { type: String },
  },
  {
    timestamps: true,
  },
);

// Indexes
NotificationSchema.index({ userId: 1, readAt: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export function toINotification(doc: NotificationDocument): INotification {
  return {
    _id: doc._id.toString(),
    userId: doc.userId.toString(),
    type: doc.type,
    category: doc.category,
    title: doc.title,
    body: doc.body,
    priority: doc.priority,
    sourceType: doc.sourceType,
    sourceId: doc.sourceId,
    actionUrl: doc.actionUrl,
    metadata: doc.metadata as Record<string, unknown> | undefined,
    readAt: doc.readAt ?? null,
    deliveredAt: doc.deliveredAt,
    emailStatus: doc.emailStatus,
    emailError: doc.emailError ?? null,
    idempotencyKey: doc.idempotencyKey,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const Notification: Model<NotificationDocument> =
  mongoose.models.Notification || mongoose.model<NotificationDocument>('Notification', NotificationSchema);
