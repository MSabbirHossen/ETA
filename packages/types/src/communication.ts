export enum AnnouncementAudience {
  PUBLIC = 'public',
  ALL = 'all',
  STUDENTS = 'students',
  TEACHERS = 'teachers',
  GUARDIANS = 'guardians',
  ADMINS = 'admins',
  COURSE = 'course',
  BATCH = 'batch',
  SELECTED_USERS = 'selected_users',
}

export enum AnnouncementPriority {
  NORMAL = 'normal',
  IMPORTANT = 'important',
  URGENT = 'urgent',
}

export enum AnnouncementStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED',
}

export interface IAnnouncementAttachment {
  title: string;
  url: string;
  fileType?: string;
  fileSize?: number;
}

export interface IAnnouncementAudienceConfig {
  audienceType: AnnouncementAudience;
  targetCourseId?: string;
  targetBatchId?: string;
  targetUserIds?: string[];
}

export interface IAnnouncement {
  _id: string;
  title: string;
  body: string;
  summary?: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  audience: IAnnouncementAudienceConfig;
  attachments?: IAnnouncementAttachment[];
  isPublic: boolean;
  publishAt: Date;
  expiresAt?: Date | null;
  publishedAt?: Date | null;
  createdBy: string | { _id: string; name: string; email: string };
  updatedBy?: string;
  sendNotification?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAnnouncementDto {
  title: string;
  body: string;
  summary?: string;
  priority?: AnnouncementPriority;
  audienceType: AnnouncementAudience;
  targetCourseId?: string;
  targetBatchId?: string;
  targetUserIds?: string[];
  attachments?: IAnnouncementAttachment[];
  publishAt?: string | Date;
  expiresAt?: string | Date | null;
  status?: AnnouncementStatus;
  sendNotification?: boolean;
}

export interface UpdateAnnouncementDto {
  title?: string;
  body?: string;
  summary?: string;
  priority?: AnnouncementPriority;
  audienceType?: AnnouncementAudience;
  targetCourseId?: string;
  targetBatchId?: string;
  targetUserIds?: string[];
  attachments?: IAnnouncementAttachment[];
  publishAt?: string | Date;
  expiresAt?: string | Date | null;
  status?: AnnouncementStatus;
  sendNotification?: boolean;
}

export interface AnnouncementFilterQuery {
  audienceType?: AnnouncementAudience;
  priority?: AnnouncementPriority;
  status?: AnnouncementStatus;
  search?: string;
  courseId?: string;
  batchId?: string;
  page?: number;
  limit?: number;
}

export enum NotificationType {
  ASSIGNMENT_PUBLISHED = 'ASSIGNMENT_PUBLISHED',
  ASSESSMENT_PUBLISHED = 'ASSESSMENT_PUBLISHED',
  CLASS_SCHEDULED = 'CLASS_SCHEDULED',
  CLASS_CANCELLED = 'CLASS_CANCELLED',
  ATTENDANCE_MARKED = 'ATTENDANCE_MARKED',
  GRADE_PUBLISHED = 'GRADE_PUBLISHED',
  ADMISSION_STATUS_UPDATED = 'ADMISSION_STATUS_UPDATED',
  GUARDIAN_LINK_VERIFIED = 'GUARDIAN_LINK_VERIFIED',
  ANNOUNCEMENT_PUBLISHED = 'ANNOUNCEMENT_PUBLISHED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  CERTIFICATE_ISSUED = 'CERTIFICATE_ISSUED',
  INVOICE_ISSUED = 'INVOICE_ISSUED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  SYSTEM_NOTICE = 'SYSTEM_NOTICE',
}

export enum NotificationCategory {
  ACADEMIC = 'academic',
  ASSIGNMENT = 'assignment',
  ASSESSMENT = 'assessment',
  ATTENDANCE = 'attendance',
  GRADE = 'grade',
  ADMISSION = 'admission',
  GUARDIAN = 'guardian',
  ANNOUNCEMENT = 'announcement',
  MESSAGING = 'messaging',
  CERTIFICATE = 'certificate',
  FINANCE = 'finance',
  SYSTEM = 'system',
}

export enum NotificationPriority {
  NORMAL = 'normal',
  IMPORTANT = 'important',
  URGENT = 'urgent',
}

export enum EmailDeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export interface INotification {
  _id: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  priority: NotificationPriority;
  sourceType?: string;
  sourceId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  readAt?: Date | null;
  deliveredAt: Date;
  emailStatus: EmailDeliveryStatus;
  emailError?: string | null;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationFilterQuery {
  category?: NotificationCategory;
  priority?: NotificationPriority;
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface IDomainEvent<T = unknown> {
  eventName: string;
  sourceId: string;
  timestamp: Date;
  payload: T;
}
