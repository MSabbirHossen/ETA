import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  ContentPublicationStatus,
  ResourceType,
  ResourceAccessType,
  type IResource,
  type IResourceSummary,
} from '@eta/types';

// ============================================================================
// 1. Resource Document & Schema
// ============================================================================
export interface ResourceDocument
  extends Document,
    Omit<
      IResource,
      '_id' | 'id' | 'authorId' | 'createdBy' | 'updatedBy' | 'publishedBy' | 'publishedAt'
    > {
  _id: mongoose.Types.ObjectId;
  authorId?: mongoose.Types.ObjectId | null;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId | null;
  publishedBy?: mongoose.Types.ObjectId | null;
  publishedAt?: Date | null;
}

const ResourceSchema = new Schema<ResourceDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    resourceType: {
      type: String,
      enum: Object.values(ResourceType),
      required: true,
      index: true,
    },
    fileUrl: {
      type: String,
      default: null,
    },
    externalUrl: {
      type: String,
      default: null,
    },
    thumbnail: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    accessType: {
      type: String,
      enum: Object.values(ResourceAccessType),
      default: ResourceAccessType.PUBLIC,
      index: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: null,
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(ContentPublicationStatus),
      default: ContentPublicationStatus.DRAFT,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    authorName: {
      type: String,
      default: null,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'resources',
  }
);

// Indexes
ResourceSchema.index({ status: 1, publishedAt: -1 });
ResourceSchema.index({ resourceType: 1, status: 1 });
ResourceSchema.index({ category: 1, status: 1 });
ResourceSchema.index({ featured: 1, status: 1 });
ResourceSchema.index(
  { title: 'text', description: 'text' },
  { weights: { title: 10, description: 5 }, name: 'ResourceTextIndex' }
);

export const ResourceModel: Model<ResourceDocument> =
  mongoose.models.Resource || mongoose.model<ResourceDocument>('Resource', ResourceSchema);

// ============================================================================
// 2. DTO Mapper Functions
// ============================================================================
export function toResourceDTO(doc: any): IResource {
  const d = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...d,
    id: d?._id?.toString() || d?.id,
    authorId: d?.authorId ? d.authorId.toString() : undefined,
    createdBy: d?.createdBy?.toString() || d?.createdBy,
    updatedBy: d?.updatedBy ? d.updatedBy.toString() : undefined,
    publishedBy: d?.publishedBy ? d.publishedBy.toString() : undefined,
    publishedAt: d?.publishedAt ? new Date(d.publishedAt).toISOString() : undefined,
    createdAt: d?.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: d?.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export function toResourceSummaryDTO(doc: any): IResourceSummary {
  const d = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: d?._id?.toString() || d?.id,
    title: d?.title,
    slug: d?.slug,
    description: d?.description,
    resourceType: d?.resourceType,
    fileUrl: d?.fileUrl || undefined,
    externalUrl: d?.externalUrl || undefined,
    thumbnail: d?.thumbnail || undefined,
    category: d?.category || undefined,
    tags: Array.isArray(d?.tags) ? d.tags : [],
    accessType: d?.accessType,
    fileSize: d?.fileSize || undefined,
    mimeType: d?.mimeType || undefined,
    publishedAt: d?.publishedAt ? new Date(d.publishedAt).toISOString() : undefined,
    featured: Boolean(d?.featured),
    authorName: d?.authorName || undefined,
  };
}
