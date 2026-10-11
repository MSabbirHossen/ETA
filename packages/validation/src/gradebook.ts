import { z } from 'zod';
import {
  GradeSourceType,
  GradePublicationStatus,
  AttemptSelectionPolicy,
  MissingWorkPolicy,
} from '@eta/types';
import { objectIdSchema } from './common.js';

export const gradeSourceTypeSchema = z.nativeEnum(GradeSourceType);
export const gradePublicationStatusSchema = z.nativeEnum(GradePublicationStatus);
export const attemptSelectionPolicySchema = z.nativeEnum(AttemptSelectionPolicy);
export const missingWorkPolicySchema = z.nativeEnum(MissingWorkPolicy);

export const gradeScaleItemSchema = z.object({
  letter: z.string().min(1).max(5),
  minPercentage: z.number().min(0).max(100),
  gpa: z.number().min(0).max(5),
  description: z.string().max(200).optional(),
});

export const gradeCategoryConfigSchema = z.object({
  id: z.string().min(1, 'Category ID is required'),
  name: z.string().min(1, 'Category name is required').max(100),
  sourceType: gradeSourceTypeSchema,
  weight: z.number().min(0).max(100),
  dropLowestCount: z.number().int().min(0).optional().default(0),
  missingWorkPolicy: missingWorkPolicySchema.optional().default(MissingWorkPolicy.ZERO),
  attemptPolicy: attemptSelectionPolicySchema.optional().default(AttemptSelectionPolicy.HIGHEST),
  customSourceIds: z.array(objectIdSchema).optional(),
});

export const saveGradebookConfigSchema = z.object({
  categories: z.array(gradeCategoryConfigSchema).min(1, 'At least one category is required'),
  passingPercentage: z.number().min(0).max(100).optional().default(60),
  gradeScale: z.array(gradeScaleItemSchema).min(1).optional(),
  attendanceFullScorePercentage: z.number().min(0).max(100).optional().default(100),
}).refine(
  (data) => {
    const totalWeight = data.categories.reduce((acc, cat) => acc + cat.weight, 0);
    // Allow slight floating point tolerance (0.01)
    return Math.abs(totalWeight - 100) < 0.01;
  },
  {
    message: 'Sum of category weights must equal exactly 100%',
    path: ['categories'],
  }
);

export const submitForReviewSchema = z.object({
  comments: z.string().max(1000).optional(),
});

export const approveResultsSchema = z.object({
  comments: z.string().max(1000).optional(),
});

export const publishResultsSchema = z.object({
  comments: z.string().max(1000).optional(),
});

export const overrideGradeSchema = z.object({
  overrideContribution: z.number().min(0, 'Contribution cannot be negative').max(100, 'Contribution cannot exceed 100'),
  overrideLetterGrade: z.string().min(1).max(5).optional(),
  overrideGpa: z.number().min(0).max(5).optional(),
  reason: z.string().min(5, 'A reason of at least 5 characters is required for grade override').max(500),
});

export const correctGradeSchema = z.object({
  newContribution: z.number().min(0, 'Contribution cannot be negative').max(100, 'Contribution cannot exceed 100'),
  newLetterGrade: z.string().min(1).max(5).optional(),
  newGpa: z.number().min(0).max(5).optional(),
  reason: z.string().min(5, 'A reason of at least 5 characters is required for grade correction').max(500),
});

export const updateFeedbackSchema = z.object({
  teacherFeedback: z.string().max(2000),
});
