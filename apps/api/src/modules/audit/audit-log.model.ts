import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  AuditAction,
  AuditCategory,
  AuditResult,
  AuditSeverity,
  AuditActorType,
  type IAuditActor,
  type IAuditChange,
  type IAuditLog,
} from '@eta/types';

export interface AuditLogDocument extends Document {
  actor: IAuditActor;
  action: AuditAction;
  category: AuditCategory;
  resourceType: string;
  resourceId?: string;
  scope?: {
    courseId?: mongoose.Types.ObjectId;
    batchId?: mongoose.Types.ObjectId;
    studentId?: mongoose.Types.ObjectId;
  };
  result: AuditResult;
  severity: AuditSeverity;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  changes?: IAuditChange[];
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    actor: {
      id: { type: String, default: undefined },
      name: { type: String, default: undefined },
      email: { type: String, default: undefined },
      role: { type: String, default: undefined },
      type: {
        type: String,
        enum: Object.values(AuditActorType),
        default: AuditActorType.USER,
        required: true,
      },
    },
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: true,
    },
    category: {
      type: String,
      enum: Object.values(AuditCategory),
      required: true,
    },
    resourceType: {
      type: String,
      required: true,
      trim: true,
    },
    resourceId: {
      type: String,
      default: undefined,
      trim: true,
    },
    scope: {
      courseId: { type: Schema.Types.ObjectId, ref: 'Course', default: undefined },
      batchId: { type: Schema.Types.ObjectId, ref: 'Batch', default: undefined },
      studentId: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
    },
    result: {
      type: String,
      enum: Object.values(AuditResult),
      default: AuditResult.SUCCESS,
      required: true,
    },
    severity: {
      type: String,
      enum: Object.values(AuditSeverity),
      default: AuditSeverity.INFO,
      required: true,
    },
    previousValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    changes: [
      {
        field: { type: String, required: true },
        before: { type: Schema.Types.Mixed, default: null },
        after: { type: Schema.Types.Mixed, default: null },
      },
    ],
    reason: {
      type: String,
      maxlength: 2000,
      default: undefined,
    },
    ipAddress: {
      type: String,
      maxlength: 45,
      default: undefined,
    },
    userAgent: {
      type: String,
      maxlength: 300,
      default: undefined,
    },
    requestId: {
      type: String,
      maxlength: 100,
      default: undefined,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    occurredAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Write-once append-only
    bufferCommands: false,
  }
);

// ---------------------------------------------------------------------------
// Indexes for High-Performance Audit Investigation — PRD §56
// ---------------------------------------------------------------------------
auditLogSchema.index({ occurredAt: -1 });
auditLogSchema.index({ 'actor.id': 1, occurredAt: -1 });
auditLogSchema.index({ action: 1, occurredAt: -1 });
auditLogSchema.index({ category: 1, occurredAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, occurredAt: -1 });
auditLogSchema.index({ result: 1, occurredAt: -1 });
auditLogSchema.index({ severity: 1, occurredAt: -1 });

// ---------------------------------------------------------------------------
// Append-Only Immutability Protection Hooks — PRD §56
// ---------------------------------------------------------------------------
auditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Audit logs are append-only and cannot be modified.'));
  }
  next();
});

auditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function (next) {
  next(new Error('Audit logs are immutable. Update operations are prohibited.'));
});

auditLogSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete'], function (next) {
  next(new Error('Audit logs cannot be deleted through standard application flow.'));
});

/**
 * Transforms document into safe client DTO
 */
export function toIAuditLog(doc: AuditLogDocument): IAuditLog {
  return {
    id: doc._id.toString(),
    actor: {
      id: doc.actor?.id,
      name: doc.actor?.name,
      email: doc.actor?.email,
      role: doc.actor?.role,
      type: doc.actor?.type || AuditActorType.USER,
    },
    action: doc.action,
    category: doc.category,
    resourceType: doc.resourceType,
    resourceId: doc.resourceId,
    scope: {
      courseId: doc.scope?.courseId?.toString(),
      batchId: doc.scope?.batchId?.toString(),
      studentId: doc.scope?.studentId?.toString(),
    },
    result: doc.result,
    severity: doc.severity,
    previousValue: doc.previousValue,
    newValue: doc.newValue,
    changes: doc.changes || [],
    reason: doc.reason,
    ipAddress: doc.ipAddress,
    userAgent: doc.userAgent,
    requestId: doc.requestId,
    metadata: doc.metadata,
    occurredAt: doc.occurredAt.toISOString(),
  };
}

export const AuditLogModel: Model<AuditLogDocument> = mongoose.model<AuditLogDocument>(
  'AuditLog',
  auditLogSchema
);
