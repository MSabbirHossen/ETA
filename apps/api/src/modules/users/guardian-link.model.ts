import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { IGuardianLink } from '@eta/types';

export interface GuardianLinkDocument extends Omit<IGuardianLink, '_id' | 'createdAt' | 'updatedAt'>, Document {
  createdAt: Date;
  updatedAt: Date;
}

const guardianLinkSchema = new Schema<GuardianLinkDocument>(
  {
    guardianId: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: 'User',
      required: [true, 'Guardian ID is required'],
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: 'User',
      required: [true, 'Student ID is required'],
      index: true,
    },
    relationship: {
      type: String,
      default: 'GUARDIAN',
      trim: true,
      maxlength: [50, 'Relationship cannot exceed 50 characters'],
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REVOKED', 'PENDING'],
      default: 'ACTIVE',
      index: true,
    },
    verified: {
      type: Boolean,
      default: true,
      index: true,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    linkedBy: {
      type: Schema.Types.ObjectId as unknown as typeof String,
      ref: 'User',
      default: null,
    },
    permissions: {
      type: [String],
      default: ['VIEW_ATTENDANCE', 'VIEW_GRADES', 'VIEW_SCHEDULE', 'VIEW_MATERIALS'],
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    emergencyContact: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'guardian_links',
  }
);

guardianLinkSchema.index({ guardianId: 1, studentId: 1 }, { unique: true });

export const GuardianLink: Model<GuardianLinkDocument> =
  mongoose.models.GuardianLink || mongoose.model<GuardianLinkDocument>('GuardianLink', guardianLinkSchema);
