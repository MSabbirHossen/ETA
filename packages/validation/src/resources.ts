import { z } from 'zod';
import { ContentPublicationStatus, ResourceType, ResourceAccessType } from '@eta/types';
import { safeUrlSchema, slugSchema } from './blog';

export const createResourceSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200, 'Title must not exceed 200 characters'),
  slug: slugSchema.optional(),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(2000, 'Description must not exceed 2000 characters'),
  resourceType: z.nativeEnum(ResourceType),
  fileUrl: safeUrlSchema.optional(),
  externalUrl: safeUrlSchema.optional(),
  thumbnail: safeUrlSchema.optional(),
  category: z.string().trim().max(50).optional(),
  tags: z.array(z.string().trim().toLowerCase().max(30)).default([]),
  accessType: z.nativeEnum(ResourceAccessType).optional().default(ResourceAccessType.PUBLIC),
  fileSize: z.number().int().min(0).optional(),
  mimeType: z.string().trim().max(100).optional(),
  status: z.nativeEnum(ContentPublicationStatus).optional().default(ContentPublicationStatus.DRAFT),
  featured: z.boolean().optional().default(false),
});

export const updateResourceSchema = createResourceSchema.partial();

export const resourceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  type: z.nativeEnum(ResourceType).optional(),
  category: z.string().trim().optional(),
  tag: z.string().trim().optional(),
  search: z.string().trim().max(100).optional(),
  featured: z.preprocess((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean().optional()),
  accessType: z.nativeEnum(ResourceAccessType).optional(),
  status: z.nativeEnum(ContentPublicationStatus).optional(),
});
