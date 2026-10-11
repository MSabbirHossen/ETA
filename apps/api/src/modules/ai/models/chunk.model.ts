import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { IAIKnowledgeChunk } from '@eta/types';

export interface AIKnowledgeChunkDocument extends Document {
  sourceType: 'LESSON' | 'MATERIAL' | 'COURSE' | 'RESOURCE';
  sourceId: string;
  courseId: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  moduleId?: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  title: string;
  content: string;
  chunkIndex: number;
  visibility: string;
  status: string;
  embedding?: number[];
  embeddingProvider?: string;
  embeddingModel?: string;
  embeddingDimension?: number;
  embeddingVersion?: string;
  contentHash: string;
  sourceUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const aiKnowledgeChunkSchema = new Schema<AIKnowledgeChunkDocument>(
  {
    sourceType: {
      type: String,
      enum: ['LESSON', 'MATERIAL', 'COURSE', 'RESOURCE'],
      required: true,
      index: true,
    },
    sourceId: {
      type: String,
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
    },
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      default: null,
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
      default: 0,
    },
    visibility: {
      type: String,
      enum: ['PUBLIC', 'ENROLLED', 'PRIVATE'],
      default: 'ENROLLED',
      index: true,
    },
    status: {
      type: String,
      enum: ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
      default: 'PUBLISHED',
      index: true,
    },
    embedding: {
      type: [Number],
      default: undefined,
    },
    embeddingProvider: {
      type: String,
      default: 'mock',
      index: true,
    },
    embeddingModel: {
      type: String,
      default: 'mock-l2-hash',
    },
    embeddingDimension: {
      type: Number,
      default: 64,
      index: true,
    },
    embeddingVersion: {
      type: String,
      default: 'v1',
      index: true,
    },
    contentHash: {
      type: String,
      required: true,
      index: true,
    },
    sourceUpdatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for authorization-aware vector/lexical retrieval
aiKnowledgeChunkSchema.index({ courseId: 1, status: 1, visibility: 1 });
aiKnowledgeChunkSchema.index({ sourceId: 1, sourceType: 1 });
aiKnowledgeChunkSchema.index({ embeddingDimension: 1, embeddingVersion: 1 });

export const AIKnowledgeChunkModel: Model<AIKnowledgeChunkDocument> =
  mongoose.models.AIKnowledgeChunk ||
  mongoose.model<AIKnowledgeChunkDocument>('AIKnowledgeChunk', aiKnowledgeChunkSchema);
