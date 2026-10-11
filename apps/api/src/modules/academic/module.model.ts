import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { ModuleStatus, type IModule } from '@eta/types';

export interface ModuleDocument extends Document {
  subjectId: mongoose.Types.ObjectId;
  title: string;
  description?: string | null;
  sequence: number;
  unlockRules?: {
    prerequisiteModuleId?: mongoose.Types.ObjectId | null;
    minScore?: number | null;
  };
  status: ModuleStatus;
  createdAt: Date;
  updatedAt: Date;
}

const moduleSchema = new Schema<ModuleDocument>(
  {
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: null,
      maxlength: 5000,
    },
    sequence: {
      type: Number,
      default: 0,
      index: true,
    },
    unlockRules: {
      prerequisiteModuleId: {
        type: Schema.Types.ObjectId,
        ref: 'Module',
        default: null,
      },
      minScore: {
        type: Number,
        default: null,
      },
    },
    status: {
      type: String,
      enum: Object.values(ModuleStatus),
      default: ModuleStatus.DRAFT,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'modules',
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret._id = ret._id.toString();
        ret.subjectId = ret.subjectId.toString();
        if (ret.unlockRules?.prerequisiteModuleId) {
          ret.unlockRules.prerequisiteModuleId = ret.unlockRules.prerequisiteModuleId.toString();
        }
        delete ret.__v;
        return ret;
      },
    },
  },
);

moduleSchema.index({ subjectId: 1, sequence: 1 });

export function toIModule(doc: ModuleDocument): IModule {
  return {
    _id: doc._id.toString(),
    subjectId: doc.subjectId.toString(),
    title: doc.title,
    description: doc.description ?? null,
    sequence: doc.sequence,
    unlockRules: doc.unlockRules
      ? {
          prerequisiteModuleId: doc.unlockRules.prerequisiteModuleId
            ? doc.unlockRules.prerequisiteModuleId.toString()
            : null,
          minScore: doc.unlockRules.minScore ?? null,
        }
      : undefined,
    status: doc.status,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export const Module: Model<ModuleDocument> =
  mongoose.models.Module || mongoose.model<ModuleDocument>('Module', moduleSchema);
