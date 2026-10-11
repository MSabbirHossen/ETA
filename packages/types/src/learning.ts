export enum LessonType {
  TEXT = 'text',
  VIDEO = 'video',
  AUDIO = 'audio',
  LIVE_CLASS = 'live_class',
  MIXED = 'mixed',
}

export enum LessonStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum LessonVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  ENROLLMENT_ONLY = 'enrollment-only',
}

export interface ILesson {
  _id: string;
  moduleId: string;
  subjectId?: string | null;
  courseId?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  sequenceOrder: number;
  lessonType: LessonType;
  estimatedDurationMinutes?: number | null;
  bodyContent?: string | null;
  videoUrl?: string | null;
  recordingUrl?: string | null;
  attachments?: string[];
  learningObjectives?: string[];
  publishedAt?: string | null;
  completionRule?: string | null;
  status: LessonStatus;
  visibility: LessonVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonDto {
  moduleId: string;
  title: string;
  slug?: string;
  description?: string | null;
  sequenceOrder?: number;
  lessonType?: LessonType;
  estimatedDurationMinutes?: number | null;
  bodyContent?: string | null;
  videoUrl?: string | null;
  recordingUrl?: string | null;
  attachments?: string[];
  learningObjectives?: string[];
  publishedAt?: string | null;
  completionRule?: string | null;
  status?: LessonStatus;
  visibility?: LessonVisibility;
}

export interface UpdateLessonDto extends Partial<CreateLessonDto> {}

// ----------------------------------------------------
// Learning Materials — PRD §19
// ----------------------------------------------------

export enum MaterialType {
  PDF = 'pdf',
  DOCX = 'docx',
  PPTX = 'pptx',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  YOUTUBE = 'youtube',
  EXTERNAL_LINK = 'external_link',
  GOOGLE_DRIVE = 'google_drive',
  GITHUB = 'github',
  ZIP = 'zip',
  SOURCE_CODE = 'source_code',
  TEXT = 'text',
  EMBED = 'embed',
}

export enum MaterialVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  ENROLLMENT_ONLY = 'enrollment-only',
}

export enum MaterialStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export interface ILearningMaterial {
  _id: string;
  lessonId?: string | null;
  courseId?: string | null;
  moduleId?: string | null;
  title: string;
  description?: string | null;
  type: MaterialType;
  url: string;
  fileSize?: number | null;
  mimeType?: string | null;
  uploadedBy: string;
  downloadable: boolean;
  visibility: MaterialVisibility;
  status: MaterialStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterialDto {
  lessonId?: string | null;
  courseId?: string | null;
  moduleId?: string | null;
  title: string;
  description?: string | null;
  type: MaterialType;
  url: string;
  fileSize?: number | null;
  mimeType?: string | null;
  downloadable?: boolean;
  visibility?: MaterialVisibility;
  status?: MaterialStatus;
}

export interface UpdateMaterialDto extends Partial<CreateMaterialDto> {}

// ----------------------------------------------------
// Live / Scheduled Class Sessions — PRD §21
// ----------------------------------------------------

export enum ClassPlatform {
  ZOOM = 'zoom',
  GOOGLE_MEET = 'google_meet',
  MICROSOFT_TEAMS = 'microsoft_teams',
  EXTERNAL_URL = 'external_url',
  OTHER = 'other',
}

export enum ClassStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
}

export interface IClassSession {
  _id: string;
  title: string;
  batchId: string;
  courseId: string;
  subjectId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  teacherId: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  platform: ClassPlatform;
  meetingUrl?: string | null;
  meetingId?: string | null;
  meetingPassword?: string | null;
  description?: string | null;
  attachments?: string[];
  attendanceRequirement: boolean;
  recordingUrl?: string | null;
  status: ClassStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassSessionDto {
  title: string;
  batchId: string;
  courseId: string;
  subjectId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  teacherId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone?: string;
  platform: ClassPlatform;
  meetingUrl?: string | null;
  meetingId?: string | null;
  meetingPassword?: string | null;
  description?: string | null;
  attachments?: string[];
  attendanceRequirement?: boolean;
  recordingUrl?: string | null;
  status?: ClassStatus;
}

export interface UpdateClassSessionDto extends Partial<CreateClassSessionDto> {}
