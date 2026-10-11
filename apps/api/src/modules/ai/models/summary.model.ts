import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { IAISummary, IKeyConcept } from '@eta/types';

export interface AISummaryDocument extends Document {
  lessonId: mongoose.Types.ObjectId;
  contentHash: string;
  summary: string;
  keyConcepts: IKeyConcept[];
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

const keyConceptSchema = new Schema<IKeyConcept>(
  {
    concept: { type: String, required: true },
    definition: { type: String, required: true },
    importance: { type: String, required: true },
  },
  { _id: false },
);

const aiSummarySchema = new Schema<AISummaryDocument>(
  {
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
      index: true,
    },
    contentHash: {
      type: String,
      required: true,
      index: true,
    },
    summary: {
      type: String,
      required: true,
    },
    keyConcepts: {
      type: [keyConceptSchema],
      default: [],
    },
    language: {
      type: String,
      required: true,
      default: 'en',
    },
  },
  {
    timestamps: true,
  },
);

aiSummarySchema.index({ lessonId: 1, contentHash: 1, language: 1 }, { unique: true });

export const AISummaryModel: Model<AISummaryDocument> =
  mongoose.models.AISummary ||
  mongoose.model<AISummaryDocument>('AISummary', aiSummarySchema);
