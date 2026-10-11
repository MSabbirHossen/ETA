import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  ContentPublicationStatus,
  type IBlogPost,
  type IBlogPostSummary,
  type IBlogCategory,
} from '@eta/types';

// ============================================================================
// 1. Blog Post Document & Schema
// ============================================================================
export interface BlogPostDocument
  extends Document,
    Omit<
      IBlogPost,
      '_id' | 'id' | 'authorId' | 'createdBy' | 'updatedBy' | 'publishedBy' | 'publishedAt' | 'scheduledAt'
    > {
  _id: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId | null;
  publishedBy?: mongoose.Types.ObjectId | null;
  publishedAt?: Date | null;
  scheduledAt?: Date | null;
}

const BlogPostSchema = new Schema<BlogPostDocument>(
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
    excerpt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    content: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
      default: null,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
    },
    authorAvatar: {
      type: String,
      default: null,
    },
    authorRole: {
      type: String,
      default: 'Author',
      trim: true,
    },
    categories: {
      type: [String],
      default: [],
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
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
    scheduledAt: {
      type: Date,
      default: null,
    },
    readingTime: {
      type: Number,
      default: 1,
      min: 1,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    seoTitle: {
      type: String,
      default: null,
      trim: true,
      maxlength: 150,
    },
    seoDescription: {
      type: String,
      default: null,
      trim: true,
      maxlength: 300,
    },
    seoKeywords: {
      type: [String],
      default: [],
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
    collection: 'blog_posts',
  }
);

// Compound and text indexes
BlogPostSchema.index({ status: 1, publishedAt: -1 });
BlogPostSchema.index({ categories: 1, status: 1 });
BlogPostSchema.index({ tags: 1, status: 1 });
BlogPostSchema.index({ featured: 1, status: 1 });
BlogPostSchema.index(
  { title: 'text', excerpt: 'text', content: 'text' },
  { weights: { title: 10, excerpt: 5, content: 1 }, name: 'BlogPostTextIndex' }
);

export const BlogPostModel: Model<BlogPostDocument> =
  mongoose.models.BlogPost || mongoose.model<BlogPostDocument>('BlogPost', BlogPostSchema);

// ============================================================================
// 2. Blog Category Document & Schema
// ============================================================================
export interface BlogCategoryDocument extends Document, Omit<IBlogCategory, '_id' | 'id'> {
  _id: mongoose.Types.ObjectId;
}

const BlogCategorySchema = new Schema<BlogCategoryDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
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
      default: null,
      maxlength: 500,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'blog_categories',
  }
);

export const BlogCategoryModel: Model<BlogCategoryDocument> =
  mongoose.models.BlogCategory || mongoose.model<BlogCategoryDocument>('BlogCategory', BlogCategorySchema);

// ============================================================================
// 3. DTO Mapper Functions
// ============================================================================
export function toBlogPostDTO(doc: any): IBlogPost {
  const d = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...d,
    id: d?._id?.toString() || d?.id,
    authorId: d?.authorId?.toString() || d?.authorId,
    createdBy: d?.createdBy?.toString() || d?.createdBy,
    updatedBy: d?.updatedBy ? d.updatedBy.toString() : undefined,
    publishedBy: d?.publishedBy ? d.publishedBy.toString() : undefined,
    publishedAt: d?.publishedAt ? new Date(d.publishedAt).toISOString() : undefined,
    scheduledAt: d?.scheduledAt ? new Date(d.scheduledAt).toISOString() : undefined,
    createdAt: d?.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: d?.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export function toBlogPostSummaryDTO(doc: any): IBlogPostSummary {
  const d = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: d?._id?.toString() || d?.id,
    title: d?.title,
    slug: d?.slug,
    excerpt: d?.excerpt,
    coverImage: d?.coverImage || undefined,
    authorName: d?.authorName,
    authorAvatar: d?.authorAvatar || undefined,
    authorRole: d?.authorRole || undefined,
    categories: Array.isArray(d?.categories) ? d.categories : [],
    tags: Array.isArray(d?.tags) ? d.tags : [],
    publishedAt: d?.publishedAt ? new Date(d.publishedAt).toISOString() : undefined,
    readingTime: d?.readingTime || 1,
    featured: Boolean(d?.featured),
  };
}

export function toBlogCategoryDTO(doc: any, postCount?: number): IBlogCategory {
  const d = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: d?._id?.toString() || d?.id,
    name: d?.name,
    slug: d?.slug,
    description: d?.description || undefined,
    sortOrder: d?.sortOrder ?? 0,
    isActive: Boolean(d?.isActive),
    postCount,
  };
}
