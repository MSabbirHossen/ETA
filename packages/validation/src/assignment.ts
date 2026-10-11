import { z } from 'zod';
import {
  AssignmentStatus,
  SubmissionType,
  SubmissionStatus,
  AssignmentVisibility,
} from '@eta/types';

export const assignmentBaseSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  slug: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  instructions: z.string().trim().min(5, 'Instructions must be at least 5 characters').max(50000),
  courseId: z.string().min(1, 'Course ID is required'),
  batchId: z.string().min(1, 'Batch ID is required'),
  subjectId: z.string().optional().nullable(),
  moduleId: z.string().optional().nullable(),
  lessonId: z.string().optional().nullable(),
  teacherId: z.string().optional(),
  attachments: z.array(z.string().url('Attachment must be a valid URL')).optional(),
  totalMarks: z.number().int().min(1, 'Total marks must be at least 1').default(100),
  passMarks: z.number().int().min(0).optional().nullable(),
  publishDate: z.string().datetime({ message: 'Valid publish date ISO string required' }).optional(),
  dueDate: z.string().datetime({ message: 'Valid due date ISO string required' }),
  closesAt: z.string().datetime({ message: 'Valid close date ISO string required' }).optional().nullable(),
  allowLateSubmission: z.boolean().default(true),
  latePenalty: z.number().min(0).max(100).default(0),
  submissionType: z.nativeEnum(SubmissionType).default(SubmissionType.MIXED),
  maxAttempts: z.number().int().min(1).max(20).default(1),
  resubmissionAllowed: z.boolean().default(false),
  status: z.nativeEnum(AssignmentStatus).default(AssignmentStatus.DRAFT),
  visibility: z.nativeEnum(AssignmentVisibility).default(AssignmentVisibility.ENROLLMENT_ONLY),
});

export const createAssignmentSchema = assignmentBaseSchema.refine(
  (data) => {
    if (data.publishDate && data.dueDate) {
      if (new Date(data.dueDate).getTime() < new Date(data.publishDate).getTime()) {
        return false;
      }
    }
    if (data.closesAt && data.dueDate) {
      if (new Date(data.closesAt).getTime() < new Date(data.dueDate).getTime()) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Due date must be after publish date, and close date must be after or equal to due date',
    path: ['dueDate'],
  },
);

export const updateAssignmentSchema = assignmentBaseSchema.partial().refine(
  (data) => {
    if (data.publishDate && data.dueDate) {
      if (new Date(data.dueDate).getTime() < new Date(data.publishDate).getTime()) {
        return false;
      }
    }
    if (data.closesAt && data.dueDate) {
      if (new Date(data.closesAt).getTime() < new Date(data.dueDate).getTime()) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Due date must be after publish date, and close date must be after or equal to due date',
    path: ['dueDate'],
  },
);

export const submitAssignmentSchema = z.object({
  submissionType: z.nativeEnum(SubmissionType).optional(),
  textContent: z.string().max(50000).optional().nullable(),
  attachments: z.array(z.string().url('Attachment must be a valid URL')).optional(),
  url: z.string().url('Invalid submission URL').optional().nullable(),
}).refine(
  (data) => {
    const hasText = !!data.textContent && data.textContent.trim().length > 0;
    const hasAttachments = !!data.attachments && data.attachments.length > 0;
    const hasUrl = !!data.url && data.url.trim().length > 0;
    return hasText || hasAttachments || hasUrl;
  },
  {
    message: 'Submission must contain text content, a valid attachment, or a submission URL.',
    path: ['textContent'],
  },
);

export const reviewSubmissionSchema = z.object({
  status: z.nativeEnum(SubmissionStatus),
  score: z.number().min(0).max(1000).optional().nullable(),
  feedback: z.string().max(5000).optional().nullable(),
  privateNotes: z.string().max(5000).optional().nullable(),
  feedbackAttachments: z.array(z.string().url('Attachment must be a valid URL')).optional(),
});
