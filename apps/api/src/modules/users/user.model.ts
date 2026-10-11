import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { UserRole, UserStatus, type IUser } from '@eta/types';

export interface UserDocument extends Omit<IUser, '_id' | 'createdAt' | 'updatedAt'>, Document {
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    firebaseUid: {
      type: String,
      required: [true, 'Firebase UID is required'],
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: null,
      trim: true,
    },
    roles: {
      type: [String],
      enum: Object.values(UserRole),
      default: [UserRole.STUDENT],
      validate: {
        validator: (roles: UserRole[]) => Array.isArray(roles) && roles.length > 0,
        message: 'A user must possess at least one role',
      },
    },
    activeRole: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.STUDENT,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
      index: true,
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'bn', 'ar'],
      default: 'en',
    },
    timezone: {
      type: String,
      default: 'Asia/Riyadh',
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for status and role filtering
userSchema.index({ status: 1, activeRole: 1 });

export const User: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>('User', userSchema);

/**
 * Maps a Mongoose UserDocument to the standard IUser shape — PRD §9.4
 */
export function toIUser(doc: UserDocument): IUser {
  return {
    _id: doc._id.toString(),
    firebaseUid: doc.firebaseUid,
    name: doc.name,
    email: doc.email,
    phone: doc.phone ?? null,
    avatarUrl: doc.avatarUrl ?? null,
    roles: [...doc.roles],
    activeRole: doc.activeRole,
    status: doc.status,
    preferredLanguage: doc.preferredLanguage,
    timezone: doc.timezone,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}
