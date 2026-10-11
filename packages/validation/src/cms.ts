import { z } from 'zod';
import { CMSContentStatus } from '@eta/types';

/**
 * Reusable safe URL validator (allows relative paths or http/https URLs only)
 */
export const safeUrlSchema = z.string().trim().refine(
  (val) => {
    if (!val) return true;
    if (val.startsWith('/') || val.startsWith('#')) return true;
    return /^https?:\/\/[^\s]+$/i.test(val);
  },
  { message: 'URL must be a relative internal path or valid http(s) URL' }
);


export const socialLinksSchema = z.object({
  facebook: safeUrlSchema.optional(),
  twitter: safeUrlSchema.optional(),
  linkedin: safeUrlSchema.optional(),
  youtube: safeUrlSchema.optional(),
  github: safeUrlSchema.optional(),
  instagram: safeUrlSchema.optional(),
});

export const footerQuickLinkSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100),
  url: safeUrlSchema,
  isExternal: z.boolean().optional(),
});

export const updateSiteSettingsSchema = z.object({
  academyName: z.string().min(1).max(200).optional(),
  tagline: z.string().max(300).optional(),
  aboutText: z.string().max(2000).optional(),
  missionText: z.string().max(1000).optional(),
  visionText: z.string().max(1000).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
  address: z.string().max(300).optional(),
  workingHours: z.string().max(100).optional(),
  socialLinks: socialLinksSchema.optional(),
  primaryCtaText: z.string().max(100).optional(),
  primaryCtaLink: safeUrlSchema.optional(),
  secondaryCtaText: z.string().max(100).optional(),
  secondaryCtaLink: safeUrlSchema.optional(),
  copyrightText: z.string().max(200).optional(),
  footerQuickLinks: z.array(footerQuickLinkSchema).optional(),
  metaTitle: z.string().max(150).optional(),
  metaDescription: z.string().max(300).optional(),
  keywords: z.array(z.string().max(50)).optional(),
  ogImageUrl: safeUrlSchema.optional(),
  status: z.nativeEnum(CMSContentStatus).optional(),
});

export const updateHeroSectionSchema = z.object({
  eyebrow: z.string().max(100).optional(),
  title: z.string().min(1).max(200).optional(),
  highlightedTitle: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  primaryCtaText: z.string().max(50).optional(),
  primaryCtaLink: safeUrlSchema.optional(),
  secondaryCtaText: z.string().max(50).optional(),
  secondaryCtaLink: safeUrlSchema.optional(),
  badgeText: z.string().max(100).optional(),
  imageUrl: safeUrlSchema.optional(),
  enabled: z.boolean().optional(),
  status: z.nativeEnum(CMSContentStatus).optional(),
});

export const createStatisticSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100),
  value: z.string().min(1, 'Value is required').max(50),
  isDynamic: z.boolean().default(false),
  dynamicSource: z.enum(['students', 'courses', 'certificates', 'attendance', 'none']).default('none'),
  sortOrder: z.number().int().min(0).default(0),
  status: z.nativeEnum(CMSContentStatus).default(CMSContentStatus.PUBLISHED),
});

export const updateStatisticSchema = createStatisticSchema.partial();

export const createLeadershipSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  designation: z.string().min(1, 'Designation is required').max(150),
  biography: z.string().min(1, 'Biography is required').max(2000),
  photoUrl: safeUrlSchema.optional(),
  sortOrder: z.number().int().min(0).default(0),
  socialLinks: z
    .object({
      linkedin: safeUrlSchema.optional(),
      twitter: safeUrlSchema.optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  status: z.nativeEnum(CMSContentStatus).default(CMSContentStatus.PUBLISHED),
});

export const updateLeadershipSchema = createLeadershipSchema.partial();

export const createTestimonialSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  role: z.string().min(1, 'Role is required').max(150),
  quote: z.string().min(1, 'Quote is required').max(1500),
  rating: z.number().int().min(1).max(5).default(5),
  photoUrl: safeUrlSchema.optional(),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  status: z.nativeEnum(CMSContentStatus).default(CMSContentStatus.PUBLISHED),
});

export const updateTestimonialSchema = createTestimonialSchema.partial();

export const createFAQSchema = z.object({
  question: z.string().min(1, 'Question is required').max(300),
  answer: z.string().min(1, 'Answer is required').max(2000),
  category: z.string().min(1, 'Category is required').max(100),
  sortOrder: z.number().int().min(0).default(0),
  status: z.nativeEnum(CMSContentStatus).default(CMSContentStatus.PUBLISHED),
});

export const updateFAQSchema = createFAQSchema.partial();
