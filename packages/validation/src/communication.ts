import { z } from 'zod';
import {
  AnnouncementAudience,
  AnnouncementPriority,
  AnnouncementStatus,
  NotificationCategory,
  NotificationPriority,
} from '@eta/types';

export const announcementAttachmentSchema = z.object({
  title: z.string().trim().min(1, 'Attachment title is required').max(200),
  url: z.string().url('Attachment URL must be a valid URL'),
  fileType: z.string().optional(),
  fileSize: z.number().nonnegative().optional(),
});

export const createAnnouncementSchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(300),
    body: z.string().trim().min(5, 'Announcement body must be at least 5 characters'),
    summary: z.string().trim().max(500).optional(),
    priority: z.nativeEnum(AnnouncementPriority).default(AnnouncementPriority.NORMAL),
    audienceType: z.nativeEnum(AnnouncementAudience),
    targetCourseId: z.string().optional(),
    targetBatchId: z.string().optional(),
    targetUserIds: z.array(z.string()).optional(),
    attachments: z.array(announcementAttachmentSchema).optional(),
    publishAt: z.union([z.string().datetime(), z.string(), z.date()]).optional(),
    expiresAt: z.union([z.string().datetime(), z.string(), z.date(), z.null()]).optional(),
    status: z.nativeEnum(AnnouncementStatus).optional(),
    sendNotification: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.audienceType === AnnouncementAudience.COURSE && !data.targetCourseId) {
        return false;
      }
      return true;
    },
    { message: 'Target course ID is required when audience is course', path: ['targetCourseId'] },
  )
  .refine(
    (data) => {
      if (data.audienceType === AnnouncementAudience.BATCH && (!data.targetBatchId || !data.targetCourseId)) {
        return false;
      }
      return true;
    },
    { message: 'Target batch ID and course ID are required when audience is batch', path: ['targetBatchId'] },
  )
  .refine(
    (data) => {
      if (data.audienceType === AnnouncementAudience.SELECTED_USERS && (!data.targetUserIds || data.targetUserIds.length === 0)) {
        return false;
      }
      return true;
    },
    { message: 'At least one target user ID is required when audience is selected_users', path: ['targetUserIds'] },
  );

export const updateAnnouncementSchema = z
  .object({
    title: z.string().trim().min(3).max(300).optional(),
    body: z.string().trim().min(5).optional(),
    summary: z.string().trim().max(500).optional(),
    priority: z.nativeEnum(AnnouncementPriority).optional(),
    audienceType: z.nativeEnum(AnnouncementAudience).optional(),
    targetCourseId: z.string().optional(),
    targetBatchId: z.string().optional(),
    targetUserIds: z.array(z.string()).optional(),
    attachments: z.array(announcementAttachmentSchema).optional(),
    publishAt: z.union([z.string().datetime(), z.string(), z.date()]).optional(),
    expiresAt: z.union([z.string().datetime(), z.string(), z.date(), z.null()]).optional(),
    status: z.nativeEnum(AnnouncementStatus).optional(),
    sendNotification: z.boolean().optional(),
  });

export const announcementFilterSchema = z.object({
  audienceType: z.nativeEnum(AnnouncementAudience).optional(),
  priority: z.nativeEnum(AnnouncementPriority).optional(),
  status: z.nativeEnum(AnnouncementStatus).optional(),
  search: z.string().trim().optional(),
  courseId: z.string().optional(),
  batchId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const notificationFilterSchema = z.object({
  category: z.nativeEnum(NotificationCategory).optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  unreadOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const markReadSchema = z.object({
  read: z.boolean().default(true),
});
