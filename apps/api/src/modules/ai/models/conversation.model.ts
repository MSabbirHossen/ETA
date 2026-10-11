import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { IAIConversation, IAIMessage, ICitation, AIResponseMode } from '@eta/types';

export interface AIConversationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  courseId?: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const aiConversationSchema = new Schema<AIConversationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      default: 'New Chat',
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

aiConversationSchema.index({ userId: 1, updatedAt: -1 });

export const AIConversationModel: Model<AIConversationDocument> =
  mongoose.models.AIConversation ||
  mongoose.model<AIConversationDocument>('AIConversation', aiConversationSchema);

export interface AIMessageDocument extends Document {
  conversationId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: ICitation[];
  mode?: AIResponseMode;
  createdAt: Date;
  updatedAt: Date;
}

const citationSchema = new Schema<ICitation>(
  {
    sourceType: {
      type: String,
      enum: ['LESSON', 'MATERIAL', 'COURSE', 'RESOURCE'],
      required: true,
    },
    sourceId: { type: String, required: true },
    title: { type: String, required: true },
    courseTitle: { type: String },
    lessonTitle: { type: String },
    url: { type: String },
    snippet: { type: String },
  },
  { _id: false },
);

const aiMessageSchema = new Schema<AIMessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'AIConversation',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 20000,
    },
    citations: {
      type: [citationSchema],
      default: [],
    },
    mode: {
      type: String,
      enum: ['GROUNDED', 'PARTIAL', 'INSUFFICIENT_CONTEXT'],
      default: 'GROUNDED',
    },
  },
  {
    timestamps: true,
  },
);

aiMessageSchema.index({ conversationId: 1, createdAt: 1 });

export const AIMessageModel: Model<AIMessageDocument> =
  mongoose.models.AIMessage ||
  mongoose.model<AIMessageDocument>('AIMessage', aiMessageSchema);
