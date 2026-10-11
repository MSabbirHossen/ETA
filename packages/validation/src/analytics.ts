import { z } from 'zod';
import { ReportType, ReportFormat, AnalyticsGranularity } from '@eta/types';

/**
 * Validates bounded date ranges for analytics and reporting (PRD §54, §55).
 * Maximum supported query window is 366 days to prevent pathological database scans.
 */
export const analyticsDateRangeSchema = z
  .object({
    from: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Invalid from date format (ISO-8601 expected)',
      }),
    to: z
      .string()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: 'Invalid to date format (ISO-8601 expected)',
      }),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from) <= new Date(data.to);
      }
      return true;
    },
    {
      message: 'from date must be less than or equal to to date',
      path: ['from'],
    }
  )
  .refine(
    (data) => {
      if (data.from && data.to) {
        const diffMs = new Date(data.to).getTime() - new Date(data.from).getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays <= 366;
      }
      return true;
    },
    {
      message: 'Analytics date range cannot exceed 366 days',
      path: ['to'],
    }
  );

export const studentAnalyticsQuerySchema = analyticsDateRangeSchema.and(
  z.object({
    courseId: z.string().trim().optional(),
  })
);

export const teacherAnalyticsQuerySchema = analyticsDateRangeSchema.and(
  z.object({
    courseId: z.string().trim().optional(),
    batchId: z.string().trim().optional(),
  })
);

export const adminAnalyticsQuerySchema = analyticsDateRangeSchema.and(
  z.object({
    courseId: z.string().trim().optional(),
    batchId: z.string().trim().optional(),
    granularity: z.nativeEnum(AnalyticsGranularity).default(AnalyticsGranularity.MONTH),
  })
);

export const reportFilterSchema = analyticsDateRangeSchema.and(
  z.object({
    reportType: z.nativeEnum(ReportType, {
      errorMap: () => ({ message: 'Invalid or unsupported report type' }),
    }),
    courseId: z.string().trim().optional(),
    batchId: z.string().trim().optional(),
    teacherId: z.string().trim().optional(),
    format: z.nativeEnum(ReportFormat).default(ReportFormat.CSV),
  })
);

export type AnalyticsDateRangeInput = z.infer<typeof analyticsDateRangeSchema>;
export type StudentAnalyticsQueryInput = z.infer<typeof studentAnalyticsQuerySchema>;
export type TeacherAnalyticsQueryInput = z.infer<typeof teacherAnalyticsQuerySchema>;
export type AdminAnalyticsQueryInput = z.infer<typeof adminAnalyticsQuerySchema>;
export type ReportFilterInput = z.infer<typeof reportFilterSchema>;

/**
 * Sanitizes a cell for safe CSV generation, neutralizing formula injection.
 * Any string beginning with '=', '+', '-', '@', '\t', or '\r' is prefixed with a single quote.
 * Compliant with RFC 4180 CSV escaping.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value);

  // CSV Formula Injection mitigation (PRD §55)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // If cell contains commas, double quotes, or newlines, quote and escape double quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}
