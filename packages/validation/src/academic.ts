import { z } from 'zod';
import {
  ProgramStatus,
  CourseLevel,
  CourseVisibility,
  CourseStatus,
  BatchStatus,
  ModuleStatus,
  EnrollmentStatus,
  EnrollmentSource,
  PaymentStatus,
} from '@eta/types';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z
  .string()
  .regex(objectIdRegex, 'Invalid ID format (must be 24-character hex string)');

// ----------------------------------------------------
// Program Schemas — PRD §13
// ----------------------------------------------------

export const createProgramSchema = z.object({
  name: z.string().trim().min(2, 'Program name must be at least 2 characters').max(150),
  shortDescription: z
    .string()
    .trim()
    .min(5, 'Short description must be at least 5 characters')
    .max(500),
  longDescription: z.string().trim().max(10000).nullable().optional(),
  coverImage: z.string().url('Invalid cover image URL').nullable().optional(),
  category: z.string().trim().max(100).nullable().optional(),
  status: z.nativeEnum(ProgramStatus).default(ProgramStatus.DRAFT),
  eligibility: z.string().trim().max(1000).nullable().optional(),
  duration: z.string().trim().max(100).nullable().optional(),
  language: z.enum(['en', 'bn', 'ar'] as const).default('en'),
  learningOutcomes: z.array(z.string().trim().min(1)).optional(),
  curriculumSummary: z.string().trim().max(5000).nullable().optional(),
  certificateAvailability: z.boolean().default(true),
  enrollmentStatus: z.enum(['open', 'closed', 'upcoming'] as const).default('open'),
  seoMetadata: z
    .object({
      metaTitle: z.string().trim().max(150).optional(),
      metaDescription: z.string().trim().max(300).optional(),
      keywords: z.array(z.string().trim()).optional(),
    })
    .optional(),
});

export const updateProgramSchema = createProgramSchema.partial();

// ----------------------------------------------------
// Course Schemas — PRD §14
// ----------------------------------------------------

export const createCourseSchema = z.object({
  programId: objectIdSchema.nullable().optional(),
  title: z.string().trim().min(2, 'Course title must be at least 2 characters').max(200),
  code: z
    .string()
    .trim()
    .min(2, 'Course code must be at least 2 characters')
    .max(50)
    .toUpperCase(),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(10000),
  thumbnail: z.string().url('Invalid thumbnail URL').nullable().optional(),
  level: z.nativeEnum(CourseLevel).default(CourseLevel.BEGINNER),
  language: z.enum(['en', 'bn', 'ar'] as const).default('en'),
  duration: z.string().trim().max(100).nullable().optional(),
  estimatedStudyHours: z.number().int().positive().nullable().optional(),
  learningOutcomes: z.array(z.string().trim().min(1)).optional(),
  prerequisites: z.array(z.string().trim()).optional(),
  teacherIds: z.array(objectIdSchema).optional(),
  certificateRules: z
    .object({
      minGradePercentage: z.number().min(0).max(100).optional(),
      minAttendancePercentage: z.number().min(0).max(100).optional(),
    })
    .optional(),
  visibility: z.nativeEnum(CourseVisibility).default(CourseVisibility.PUBLIC),
  status: z.nativeEnum(CourseStatus).default(CourseStatus.DRAFT),
});

export const updateCourseSchema = createCourseSchema.partial();

// ----------------------------------------------------
// Batch Schemas — PRD §15
// ----------------------------------------------------

export const createBatchSchema = z.object({
  courseId: objectIdSchema,
  batchName: z.string().trim().min(2, 'Batch name must be at least 2 characters').max(150),
  batchCode: z
    .string()
    .trim()
    .min(2, 'Batch code must be at least 2 characters')
    .max(50)
    .toUpperCase(),
  startDate: z.string().datetime({ message: 'Invalid start date format' }),
  endDate: z.string().datetime({ message: 'Invalid end date format' }),
  enrollmentStart: z.string().datetime({ message: 'Invalid enrollment start date' }),
  enrollmentEnd: z.string().datetime({ message: 'Invalid enrollment end date' }),
  studentLimit: z.number().int().positive('Student limit must be at least 1').default(50),
  teacherIds: z.array(objectIdSchema).optional(),
  meetingSchedule: z.string().trim().max(500).nullable().optional(),
  status: z.nativeEnum(BatchStatus).default(BatchStatus.UPCOMING),
});

export const updateBatchSchema = createBatchSchema.partial();

// ----------------------------------------------------
// Subject Schemas — PRD §16
// ----------------------------------------------------

export const createSubjectSchema = z.object({
  title: z.string().trim().min(2, 'Subject title must be at least 2 characters').max(150),
  code: z
    .string()
    .trim()
    .min(2, 'Subject code must be at least 2 characters')
    .max(50)
    .toUpperCase(),
  description: z.string().trim().max(5000).nullable().optional(),
  courseId: objectIdSchema,
  teacherIds: z.array(objectIdSchema).optional(),
  sequence: z.number().int().min(0).default(0),
  totalMarks: z.number().int().positive().nullable().optional(),
  passingRules: z
    .object({
      minMarks: z.number().min(0).optional(),
      minPercentage: z.number().min(0).max(100).optional(),
    })
    .optional(),
});

export const updateSubjectSchema = createSubjectSchema.partial();

// ----------------------------------------------------
// Module Schemas — PRD §17
// ----------------------------------------------------

export const createModuleSchema = z.object({
  subjectId: objectIdSchema,
  title: z.string().trim().min(2, 'Module title must be at least 2 characters').max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  sequence: z.number().int().min(0).default(0),
  unlockRules: z
    .object({
      prerequisiteModuleId: objectIdSchema.nullable().optional(),
      minScore: z.number().min(0).max(100).nullable().optional(),
    })
    .optional(),
  status: z.nativeEnum(ModuleStatus).default(ModuleStatus.DRAFT),
});

export const updateModuleSchema = createModuleSchema.partial();

// ----------------------------------------------------
// Enrollment Schemas — PRD §41
// ----------------------------------------------------

export const createEnrollmentSchema = z.object({
  studentId: objectIdSchema,
  courseId: objectIdSchema,
  batchId: objectIdSchema,
  status: z.nativeEnum(EnrollmentStatus).default(EnrollmentStatus.ACTIVE),
  source: z.nativeEnum(EnrollmentSource).default(EnrollmentSource.ADMIN),
  paymentStatus: z.nativeEnum(PaymentStatus).default(PaymentStatus.WAIVED),
});

export const updateEnrollmentStatusSchema = z.object({
  status: z.nativeEnum(EnrollmentStatus, {
    errorMap: () => ({ message: 'Invalid enrollment status' }),
  }),
});

// ----------------------------------------------------
// Teacher Assignment Schema
// ----------------------------------------------------

export const assignTeachersSchema = z.object({
  teacherIds: z
    .array(objectIdSchema)
    .refine((items) => new Set(items).size === items.length, {
      message: 'Duplicate teacher IDs are not allowed',
    }),
});
