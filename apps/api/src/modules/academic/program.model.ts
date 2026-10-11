import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  ProgramStatus,
  type IProgram,
  type SupportedLanguage,
} from '@eta/types';

export interface ProgramDocument extends Document {
  name: string;
  slug: string;
  shortDescription: string;
  longDescription?: string | null;
  coverImage?: string | null;
  category?: string | null;
  status: ProgramStatus;
  eligibility?: string | null;
  duration?: string | null;
  language: SupportedLanguage;
  learningOutcomes: string[];
  curriculumSummary?: string | null;
  certificateAvailability: boolean;
  enrollmentStatus: 'open' | 'closed' | 'upcoming';
  seoMetadata?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const programSchema = new Schema<ProgramDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    longDescription: {
      type: String,
      default: null,
      maxlength: 10000,
    },
    coverImage: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ProgramStatus),
      default: ProgramStatus.DRAFT,
      index: true,
    },
    eligibility: {
      type: String,
      default: null,
    },
    duration: {
      type: String,
      default: null,
    },
    language: {
      type: String,
      enum: ['en', 'bn', 'ar'],
      default: 'en',
    },
    learningOutcomes: {
      type: [String],
      default: [],
    },
    curriculumSummary: {
      type: String,
      default: null,
    },
    certificateAvailability: {
      type: Boolean,
      default: true,
    },
    enrollmentStatus: {
      type: String,
      enum: ['open', 'closed', 'upcoming'],
      default: 'open',
      index: true,
    },
    seoMetadata: {
      metaTitle: { type: String, default: undefined },
      metaDescription: { type: String, default: undefined },
      keywords: { type: [String], default: undefined },
    },
  },
  {
    timestamps: true,
    collection: 'programs',
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret._id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  },
);

export function toIProgram(doc: ProgramDocument): IProgram {
  return {
    _id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    shortDescription: doc.shortDescription,
    longDescription: doc.longDescription ?? null,
    coverImage: doc.coverImage ?? null,
    category: doc.category ?? null,
    status: doc.status,
    eligibility: doc.eligibility ?? null,
    duration: doc.duration ?? null,
    language: doc.language,
    learningOutcomes: doc.learningOutcomes ?? [],
    curriculumSummary: doc.curriculumSummary ?? null,
    certificateAvailability: doc.certificateAvailability,
    enrollmentStatus: doc.enrollmentStatus,
    seoMetadata: doc.seoMetadata,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export const Program: Model<ProgramDocument> =
  mongoose.models.Program || mongoose.model<ProgramDocument>('Program', programSchema);
