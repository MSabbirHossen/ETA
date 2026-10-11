import { z } from 'zod';
import { objectIdSchema } from './common.js';
import { questionTypeSchema, questionDifficultySchema } from './assessment.js';

/**
 * Validation schemas for Educational AI Engine & Ask ETA — PRD §93, §94
 */

export const askEtaSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message cannot exceed 1000 characters')
    .trim(),
  conversationId: objectIdSchema.optional(),
  courseId: objectIdSchema.optional(),
  lessonId: objectIdSchema.optional(),
  language: z.enum(['en', 'bn', 'ar']).optional(),
});

export const generateQuestionsSchema = z.object({
  courseId: objectIdSchema,
  lessonId: objectIdSchema.optional(),
  moduleId: objectIdSchema.optional(),
  count: z.number().int().min(1).max(10).default(3),
  difficulty: questionDifficultySchema.default('MEDIUM'),
  types: z.array(questionTypeSchema).optional(),
  topic: z.string().max(200).optional(),
});

export const rubricFeedbackSchema = z.object({
  assignmentId: objectIdSchema,
  submissionId: objectIdSchema,
  studentContent: z.string().max(50000).optional(),
});

export const semanticSearchSchema = z.object({
  q: z.string().min(1, 'Search query cannot be empty').max(500).trim(),
  limit: z.number().int().min(1).max(20).default(5),
  courseId: objectIdSchema.optional(),
});
