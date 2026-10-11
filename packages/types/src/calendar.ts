import { AnnouncementPriority } from './communication';

export enum CalendarSourceType {
  CLASS_SESSION = 'class_session',
  ASSIGNMENT = 'assignment',
  ASSESSMENT = 'assessment',
  ANNOUNCEMENT = 'announcement',
  BATCH = 'batch',
  MANUAL_EVENT = 'manual_event',
}

export enum CalendarEventType {
  CLASS = 'class',
  ASSIGNMENT_DUE = 'assignment_due',
  QUIZ = 'quiz',
  EXAM = 'exam',
  ANNOUNCEMENT = 'announcement',
  ACADEMIC_DEADLINE = 'academic_deadline',
  HOLIDAY = 'holiday',
  EVENT = 'event',
}

export enum CalendarEventStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}

export enum CalendarView {
  MONTH = 'month',
  WEEK = 'week',
  DAY = 'day',
  AGENDA = 'agenda',
}

export interface ICalendarEvent {
  id: string;
  sourceType: CalendarSourceType;
  sourceId: string;
  title: string;
  description?: string | null;
  startAt: string; // ISO string in UTC
  endAt?: string | null; // ISO string in UTC
  allDay: boolean;
  eventType: CalendarEventType;
  status: CalendarEventStatus;
  priority?: AnnouncementPriority | 'normal' | 'important' | 'urgent';
  courseId?: string | null;
  courseTitle?: string | null;
  batchId?: string | null;
  batchCode?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CalendarRangeQuery {
  from: string; // ISO 8601 string
  to: string; // ISO 8601 string
  timezone?: string;
  eventType?: CalendarEventType;
  sourceType?: CalendarSourceType;
  courseId?: string;
  batchId?: string;
  studentId?: string; // For guardian/admin queries
}

export interface CalendarRangeResponse {
  events: ICalendarEvent[];
  range: {
    from: string;
    to: string;
    timezone: string;
  };
  total: number;
}

export interface CreateManualCalendarEventDto {
  title: string;
  description?: string;
  startAt: string | Date;
  endAt?: string | Date;
  allDay?: boolean;
  eventType?: CalendarEventType.EVENT | CalendarEventType.HOLIDAY | CalendarEventType.ACADEMIC_DEADLINE;
  courseId?: string;
  batchId?: string;
  isPublic?: boolean;
  targetRoles?: string[];
  actionUrl?: string;
}

export interface UpdateManualCalendarEventDto {
  title?: string;
  description?: string;
  startAt?: string | Date;
  endAt?: string | Date;
  allDay?: boolean;
  eventType?: CalendarEventType.EVENT | CalendarEventType.HOLIDAY | CalendarEventType.ACADEMIC_DEADLINE;
  courseId?: string;
  batchId?: string;
  isPublic?: boolean;
  targetRoles?: string[];
  actionUrl?: string;
}
