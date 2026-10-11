import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  CMSContentStatus,
  type ISiteSettings,
  type IHeroSection,
  type IStatisticItem,
  type ILeadershipProfile,
  type ITestimonial,
  type IFAQItem,
} from '@eta/types';

// ============================================================================
// 1. Site Settings Document & Schema (Singleton Document)
// ============================================================================
export interface SiteSettingsDocument extends Document, Omit<ISiteSettings, '_id' | 'id'> {
  _id: mongoose.Types.ObjectId;
}

const SiteSettingsSchema = new Schema<SiteSettingsDocument>(
  {
    academyName: {
      type: String,
      required: true,
      default: 'Exploratory Training Academy',
      trim: true,
      maxlength: 200,
    },
    tagline: {
      type: String,
      default: 'Empowering future leaders through world-class technical education',
      trim: true,
      maxlength: 300,
    },
    aboutText: {
      type: String,
      default:
        'Exploratory Training Academy (ETA) is a premier academic institution dedicated to cultivating engineering excellence, cutting-edge research, and leadership in emerging technologies.',
      trim: true,
      maxlength: 2000,
    },
    missionText: {
      type: String,
      default:
        'To empower learners worldwide with rigorous technical knowledge, applied problem-solving skills, and ethical leadership.',
      trim: true,
      maxlength: 1000,
    },
    visionText: {
      type: String,
      default:
        'To be globally recognized as the benchmark institution for modern technical, computational, and exploratory education.',
      trim: true,
      maxlength: 1000,
    },
    contactEmail: {
      type: String,
      default: 'admissions@eta.edu',
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      default: '+1 (555) 382-2026',
      trim: true,
    },
    address: {
      type: String,
      default: '100 Innovation Boulevard, Tech Campus, Academic City',
      trim: true,
    },
    workingHours: {
      type: String,
      default: 'Monday – Friday: 8:00 AM – 6:00 PM UTC',
      trim: true,
    },
    socialLinks: {
      facebook: { type: String, trim: true },
      twitter: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      youtube: { type: String, trim: true },
      github: { type: String, trim: true },
      instagram: { type: String, trim: true },
    },
    primaryCtaText: {
      type: String,
      default: 'Apply for Admission',
      trim: true,
    },
    primaryCtaLink: {
      type: String,
      default: '/admissions/apply',
      trim: true,
    },
    secondaryCtaText: {
      type: String,
      default: 'Verify Credential',
      trim: true,
    },
    secondaryCtaLink: {
      type: String,
      default: '/certificate/verify',
      trim: true,
    },
    copyrightText: {
      type: String,
      default: '© 2026 Exploratory Training Academy (ETA). All rights reserved.',
      trim: true,
    },
    footerQuickLinks: [
      {
        label: { type: String, required: true, trim: true },
        url: { type: String, required: true, trim: true },
        isExternal: { type: Boolean, default: false },
      },
    ],
    metaTitle: {
      type: String,
      default: 'Exploratory Training Academy (ETA) | World-Class Technical Academy',
      trim: true,
    },
    metaDescription: {
      type: String,
      default:
        'Exploratory Training Academy is a premier academic institution providing world-class education in engineering, applied computing, and leadership.',
      trim: true,
    },
    keywords: [{ type: String, trim: true }],
    ogImageUrl: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(CMSContentStatus),
      default: CMSContentStatus.PUBLISHED,
      index: true,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const SiteSettingsModel: Model<SiteSettingsDocument> =
  mongoose.models.SiteSettings || mongoose.model<SiteSettingsDocument>('SiteSettings', SiteSettingsSchema);

// ============================================================================
// 2. Hero Section Document & Schema (Singleton Document)
// ============================================================================
export interface HeroSectionDocument extends Document, Omit<IHeroSection, '_id' | 'id'> {
  _id: mongoose.Types.ObjectId;
}

const HeroSectionSchema = new Schema<HeroSectionDocument>(
  {
    eyebrow: {
      type: String,
      default: 'ADMISSIONS OPEN FOR ACADEMIC YEAR 2026',
      trim: true,
    },
    title: {
      type: String,
      default: 'Pioneering Excellence in',
      trim: true,
    },
    highlightedTitle: {
      type: String,
      default: 'Applied Engineering & Computing',
      trim: true,
    },
    description: {
      type: String,
      default:
        'Join an elite community of scholars and practitioners. Experience immersive curriculum, world-class faculty mentorship, and verifiable digital credentials.',
      trim: true,
    },
    primaryCtaText: {
      type: String,
      default: 'Apply Now',
      trim: true,
    },
    primaryCtaLink: {
      type: String,
      default: '/admissions/apply',
      trim: true,
    },
    secondaryCtaText: {
      type: String,
      default: 'Explore Programs',
      trim: true,
    },
    secondaryCtaLink: {
      type: String,
      default: '/courses',
      trim: true,
    },
    badgeText: {
      type: String,
      default: 'Top-Ranked Technical Academy 2026',
      trim: true,
    },
    imageUrl: { type: String, trim: true },
    enabled: { type: Boolean, default: true },
    status: {
      type: String,
      enum: Object.values(CMSContentStatus),
      default: CMSContentStatus.PUBLISHED,
      index: true,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const HeroSectionModel: Model<HeroSectionDocument> =
  mongoose.models.HeroSection || mongoose.model<HeroSectionDocument>('HeroSection', HeroSectionSchema);

// ============================================================================
// 3. Statistic Item Document & Schema
// ============================================================================
export interface StatisticItemDocument extends Document, Omit<IStatisticItem, '_id' | 'id'> {
  _id: mongoose.Types.ObjectId;
}

const StatisticItemSchema = new Schema<StatisticItemDocument>(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    isDynamic: { type: Boolean, default: false },
    dynamicSource: {
      type: String,
      enum: ['students', 'courses', 'certificates', 'attendance', 'none'],
      default: 'none',
    },
    sortOrder: { type: Number, default: 0, index: true },
    status: {
      type: String,
      enum: Object.values(CMSContentStatus),
      default: CMSContentStatus.PUBLISHED,
      index: true,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

StatisticItemSchema.index({ status: 1, sortOrder: 1 });

export const StatisticItemModel: Model<StatisticItemDocument> =
  mongoose.models.StatisticItem || mongoose.model<StatisticItemDocument>('StatisticItem', StatisticItemSchema);

// ============================================================================
// 4. Leadership Profile Document & Schema
// ============================================================================
export interface LeadershipProfileDocument extends Document, Omit<ILeadershipProfile, '_id' | 'id'> {
  _id: mongoose.Types.ObjectId;
}

const LeadershipProfileSchema = new Schema<LeadershipProfileDocument>(
  {
    name: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    biography: { type: String, required: true, trim: true },
    photoUrl: { type: String, trim: true },
    sortOrder: { type: Number, default: 0, index: true },
    socialLinks: {
      linkedin: { type: String, trim: true },
      twitter: { type: String, trim: true },
      email: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: Object.values(CMSContentStatus),
      default: CMSContentStatus.PUBLISHED,
      index: true,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

LeadershipProfileSchema.index({ status: 1, sortOrder: 1 });

export const LeadershipProfileModel: Model<LeadershipProfileDocument> =
  mongoose.models.LeadershipProfile ||
  mongoose.model<LeadershipProfileDocument>('LeadershipProfile', LeadershipProfileSchema);

// ============================================================================
// 5. Testimonial Document & Schema
// ============================================================================
export interface TestimonialDocument extends Document, Omit<ITestimonial, '_id' | 'id'> {
  _id: mongoose.Types.ObjectId;
}

const TestimonialSchema = new Schema<TestimonialDocument>(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    quote: { type: String, required: true, trim: true },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    photoUrl: { type: String, trim: true },
    featured: { type: Boolean, default: false, index: true },
    sortOrder: { type: Number, default: 0, index: true },
    status: {
      type: String,
      enum: Object.values(CMSContentStatus),
      default: CMSContentStatus.PUBLISHED,
      index: true,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

TestimonialSchema.index({ status: 1, featured: -1, sortOrder: 1 });

export const TestimonialModel: Model<TestimonialDocument> =
  mongoose.models.Testimonial || mongoose.model<TestimonialDocument>('Testimonial', TestimonialSchema);

// ============================================================================
// 6. FAQ Item Document & Schema
// ============================================================================
export interface FAQItemDocument extends Document, Omit<IFAQItem, '_id' | 'id'> {
  _id: mongoose.Types.ObjectId;
}

const FAQItemSchema = new Schema<FAQItemDocument>(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    sortOrder: { type: Number, default: 0, index: true },
    status: {
      type: String,
      enum: Object.values(CMSContentStatus),
      default: CMSContentStatus.PUBLISHED,
      index: true,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

FAQItemSchema.index({ status: 1, category: 1, sortOrder: 1 });

export const FAQItemModel: Model<FAQItemDocument> =
  mongoose.models.FAQItem || mongoose.model<FAQItemDocument>('FAQItem', FAQItemSchema);

// ============================================================================
// Helper DTO Mappers
// ============================================================================
export function toSiteSettingsDTO(doc: any): ISiteSettings {
  const d = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...d,
    id: d?._id?.toString() || d?.id,
    _id: d?._id?.toString() || d?._id,
  };
}

export function toHeroSectionDTO(doc: any): IHeroSection {
  const d = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...d,
    id: d?._id?.toString() || d?.id,
    _id: d?._id?.toString() || d?._id,
  };
}

export function toStatisticItemDTO(doc: any): IStatisticItem {
  const d = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...d,
    id: d?._id?.toString() || d?.id,
    _id: d?._id?.toString() || d?._id,
  };
}

export function toLeadershipProfileDTO(doc: any): ILeadershipProfile {
  const d = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...d,
    id: d?._id?.toString() || d?.id,
    _id: d?._id?.toString() || d?._id,
  };
}

export function toTestimonialDTO(doc: any): ITestimonial {
  const d = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...d,
    id: d?._id?.toString() || d?.id,
    _id: d?._id?.toString() || d?._id,
  };
}

export function toFAQItemDTO(doc: any): IFAQItem {
  const d = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...d,
    id: d?._id?.toString() || d?.id,
    _id: d?._id?.toString() || d?._id,
  };
}
