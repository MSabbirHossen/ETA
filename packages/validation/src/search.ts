import { z } from 'zod';
import { SearchResultType } from '@eta/types';

/**
 * Escapes special regex metacharacters to safely allow user queries
 * in MongoDB queries without ReDoS vulnerabilities or regex injection.
 */
export function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Normalizes query string safely:
 * - Trims leading and trailing whitespace
 * - Collapses consecutive whitespace characters into a single space
 * - Preserves Unicode letters (English, Bengali, Arabic, etc.)
 */
export function normalizeSearchQuery(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Zod schema for search query validation (PRD §53).
 */
export const searchQuerySchema = z.object({
  q: z
    .string()
    .min(2, 'Search query must be at least 2 characters')
    .max(100, 'Search query cannot exceed 100 characters')
    .transform(normalizeSearchQuery),
  type: z.nativeEnum(SearchResultType).optional(),
  types: z
    .union([
      z.nativeEnum(SearchResultType).array(),
      z.string().transform((val) =>
        val
          .split(',')
          .map((t) => t.trim().toUpperCase())
          .filter((t): t is SearchResultType => Object.values(SearchResultType).includes(t as SearchResultType))
      ),
    ])
    .optional(),
  courseId: z.string().trim().optional(),
  batchId: z.string().trim().optional(),
  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      const parsed = Number(val);
      return isNaN(parsed) || parsed < 1 ? 1 : Math.floor(parsed);
    }),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      const parsed = Number(val);
      if (isNaN(parsed) || parsed < 1) return 20;
      return Math.min(Math.floor(parsed), 50);
    }),
});

export type SearchQuerySchemaType = z.infer<typeof searchQuerySchema>;
