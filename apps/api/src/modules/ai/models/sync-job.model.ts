import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type AIIndexSyncOperation = 'PURGE' | 'INGEST';
export type AIIndexSyncStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface AIIndexSyncJobDocument extends Document {
  sourceType: 'LESSON' | 'MATERIAL' | 'COURSE';
  sourceId: string;
  operation: AIIndexSyncOperation;
  status: AIIndexSyncStatus;
  attempts: number;
  priority: number; // 10 for PURGE, 1 for INGEST
  lastError?: string;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const aiIndexSyncJobSchema = new Schema<AIIndexSyncJobDocument>(
  {
    sourceType: {
      type: String,
      enum: ['LESSON', 'MATERIAL', 'COURSE'],
      required: true,
      index: true,
    },
    sourceId: {
      type: String,
      required: true,
      index: true,
    },
    operation: {
      type: String,
      enum: ['PURGE', 'INGEST'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    priority: {
      type: Number,
      default: 1,
      index: true,
    },
    lastError: {
      type: String,
      default: null,
    },
    nextRetryAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

aiIndexSyncJobSchema.index({ status: 1, priority: -1, nextRetryAt: 1 });
aiIndexSyncJobSchema.index({ sourceId: 1, sourceType: 1, operation: 1 });

export const AIIndexSyncJobModel: Model<AIIndexSyncJobDocument> =
  mongoose.models.AIIndexSyncJob ||
  mongoose.model<AIIndexSyncJobDocument>('AIIndexSyncJob', aiIndexSyncJobSchema);
