import { z } from 'zod';
import {
  LessonType,
  LessonStatus,
  LessonVisibility,
  MaterialType,
  MaterialVisibility,
  MaterialStatus,
  ClassPlatform,
  ClassStatus,
} from '@eta/types';

export const createLessonSchema = z.object({
  moduleId: z.string().min(1, 'Module ID is required'),
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  slug: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  sequenceOrder: z.number().int().min(1).default(1),
  lessonType: z.nativeEnum(LessonType).default(LessonType.TEXT),
  estimatedDurationMinutes: z.number().int().min(1).max(1440).optional().nullable(),
  bodyContent: z.string().max(100000).optional().nullable(),
  videoUrl: z.string().url('Invalid video URL').optional().nullable(),
  recordingUrl: z.string().url('Invalid recording URL').optional().nullable(),
  attachments: z.array(z.string().url()).optional(),
  learningObjectives: z.array(z.string().trim().min(1)).optional(),
  publishedAt: z.string().datetime().optional().nullable(),
  completionRule: z.string().max(200).optional().nullable(),
  status: z.nativeEnum(LessonStatus).default(LessonStatus.DRAFT),
  visibility: z.nativeEnum(LessonVisibility).default(LessonVisibility.ENROLLMENT_ONLY),
});

export const updateLessonSchema = createLessonSchema.partial();

export const createMaterialSchema = z.object({
  lessonId: z.string().optional().nullable(),
  courseId: z.string().optional().nullable(),
  moduleId: z.string().optional().nullable(),
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  type: z.nativeEnum(MaterialType).default(MaterialType.PDF),
  url: z.string().url('Invalid material URL'),
  fileSize: z.number().int().nonnegative().optional().nullable(),
  mimeType: z.string().max(100).optional().nullable(),
  downloadable: z.boolean().default(true),
  visibility: z.nativeEnum(MaterialVisibility).default(MaterialVisibility.ENROLLMENT_ONLY),
  status: z.nativeEnum(MaterialStatus).default(MaterialStatus.PUBLISHED),
});

export const updateMaterialSchema = createMaterialSchema.partial();

export const classSessionBaseSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  batchId: z.string().min(1, 'Batch ID is required'),
  courseId: z.string().min(1, 'Course ID is required'),
  subjectId: z.string().optional().nullable(),
  moduleId: z.string().optional().nullable(),
  lessonId: z.string().optional().nullable(),
  teacherId: z.string().optional(),
  scheduledStart: z.string().datetime({ message: 'Valid scheduled start ISO date-time is required' }),
  scheduledEnd: z.string().datetime({ message: 'Valid scheduled end ISO date-time is required' }),
  timezone: z.string().min(1).default('Asia/Riyadh'),
  platform: z.nativeEnum(ClassPlatform).default(ClassPlatform.GOOGLE_MEET),
  meetingUrl: z.string().url('Invalid meeting URL').optional().nullable(),
  meetingId: z.string().max(100).optional().nullable(),
  meetingPassword: z.string().max(100).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  attachments: z.array(z.string().url()).optional(),
  attendanceRequirement: z.boolean().default(true),
  recordingUrl: z.string().url('Invalid recording URL').optional().nullable(),
  status: z.nativeEnum(ClassStatus).default(ClassStatus.SCHEDULED),
});

export const createClassSessionSchema = classSessionBaseSchema.refine(
  (data) => new Date(data.scheduledEnd).getTime() > new Date(data.scheduledStart).getTime(),
  {
    message: 'Scheduled end time must be after scheduled start time',
    path: ['scheduledEnd'],
  },
);

export const updateClassSessionSchema = classSessionBaseSchema.partial().refine(
  (data) => {
    if (data.scheduledStart && data.scheduledEnd) {
      return new Date(data.scheduledEnd).getTime() > new Date(data.scheduledStart).getTime();
    }
    return true;
  },
  {
    message: 'Scheduled end time must be after scheduled start time',
    path: ['scheduledEnd'],
  },
);

