import { z } from 'zod';
import { ContentPublicationStatus } from '@eta/types';

/**
 * Reusable safe URL validator (allows relative internal paths or http/https URLs only)
 */
export const safeUrlSchema = z.string().trim().refine(
  (val) => {
    if (!val) return true;
    if (val.startsWith('/') || val.startsWith('#')) return true;
    return /^https?:\/\/[^\s]+$/i.test(val);
  },
  { message: 'URL must be a relative internal path or valid http(s) URL' }
);

export const slugSchema = z
  .string()
  .trim()
  .min(2, 'Slug must be at least 2 characters')
  .max(150, 'Slug must not exceed 150 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens');

export const createBlogPostSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200, 'Title must not exceed 200 characters'),
  slug: slugSchema.optional(),
  excerpt: z.string().trim().min(5, 'Excerpt must be at least 5 characters').max(500, 'Excerpt must not exceed 500 characters'),
  content: z.string().min(5, 'Content must be at least 5 characters').max(100000, 'Content must not exceed 100,000 characters'),
  coverImage: safeUrlSchema.optional(),
  categories: z.array(z.string().trim().max(50)).default([]),
  tags: z.array(z.string().trim().toLowerCase().max(30)).default([]),
  status: z.nativeEnum(ContentPublicationStatus).optional().default(ContentPublicationStatus.DRAFT),
  scheduledAt: z.string().datetime().optional(),
  featured: z.boolean().optional().default(false),
  seoTitle: z.string().trim().max(150).optional(),
  seoDescription: z.string().trim().max(300).optional(),
  seoKeywords: z.array(z.string().trim().max(50)).optional(),
});

export const updateBlogPostSchema = createBlogPostSchema.partial();

export const createBlogCategorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters'),
  slug: slugSchema.optional(),
  description: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateBlogCategorySchema = createBlogCategorySchema.partial();

export const blogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  category: z.string().trim().optional(),
  tag: z.string().trim().optional(),
  search: z.string().trim().max(100).optional(),
  featured: z.preprocess((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean().optional()),
  status: z.nativeEnum(ContentPublicationStatus).optional(),
});
