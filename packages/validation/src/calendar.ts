import { z } from 'zod';
import { CalendarEventType, CalendarSourceType } from '@eta/types';

export const calendarRangeQuerySchema = z.object({
  from: z.string().datetime({ message: 'from must be a valid ISO 8601 date-time string' }),
  to: z.string().datetime({ message: 'to must be a valid ISO 8601 date-time string' }),
  timezone: z.string().optional(),
  eventType: z.nativeEnum(CalendarEventType).optional(),
  sourceType: z.nativeEnum(CalendarSourceType).optional(),
  courseId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid course ID format').optional(),
  batchId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid batch ID format').optional(),
  studentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid student ID format').optional(),
}).refine(
  (data) => new Date(data.from).getTime() <= new Date(data.to).getTime(),
  {
    message: '"from" date must be earlier than or equal to "to" date',
    path: ['to'],
  }
).refine(
  (data) => {
    // Maximum range check: 366 days
    const diffDays = (new Date(data.to).getTime() - new Date(data.from).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 366;
  },
  {
    message: 'Requested calendar range cannot exceed 366 days',
    path: ['to'],
  }
);

export const createManualCalendarEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters').trim(),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
  startAt: z.string().datetime({ message: 'startAt must be a valid ISO 8601 date-time string' }),
  endAt: z.string().datetime({ message: 'endAt must be a valid ISO 8601 date-time string' }).optional(),
  allDay: z.boolean().optional().default(false),
  eventType: z.enum([CalendarEventType.EVENT, CalendarEventType.HOLIDAY, CalendarEventType.ACADEMIC_DEADLINE]).optional().default(CalendarEventType.EVENT),
  courseId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid course ID format').optional(),
  batchId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid batch ID format').optional(),
  isPublic: z.boolean().optional().default(false),
  targetRoles: z.array(z.string()).optional(),
  actionUrl: z.string().regex(/^\/[a-zA-Z0-9_\-\/]*$/, 'actionUrl must be a safe internal relative path').optional(),
}).refine(
  (data) => {
    if (!data.endAt) return true;
    return new Date(data.startAt).getTime() <= new Date(data.endAt).getTime();
  },
  {
    message: '"endAt" must be greater than or equal to "startAt"',
    path: ['endAt'],
  }
);

export const updateManualCalendarEventSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  allDay: z.boolean().optional(),
  eventType: z.enum([CalendarEventType.EVENT, CalendarEventType.HOLIDAY, CalendarEventType.ACADEMIC_DEADLINE]).optional(),
  courseId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  batchId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  isPublic: z.boolean().optional(),
  targetRoles: z.array(z.string()).optional(),
  actionUrl: z.string().regex(/^\/[a-zA-Z0-9_\-\/]*$/).optional(),
});
