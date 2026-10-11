import { z } from 'zod';

/**
 * Reusable pagination query schema — PRD §67
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
});

/**
 * MongoDB ObjectId string validation
 */
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

/**
 * Email validation
 */
export const emailSchema = z.string().email().toLowerCase().trim();
