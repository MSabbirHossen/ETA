import type { SupportedLanguage } from './common';
import type { UserRole } from './roles';

export enum ProgramStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum CourseVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  ENROLLMENT_ONLY = 'enrollment-only',
}

export enum CourseStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum BatchStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum ModuleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum EnrollmentStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export enum EnrollmentSource {
  SELF = 'self',
  ADMIN = 'admin',
  SCHOLARSHIP = 'scholarship',
  INVITATION = 'invitation',
  ADMISSION = 'admission',
}

export enum PaymentStatus {
  PAID = 'paid',
  UNPAID = 'unpaid',
  WAIVED = 'waived',
  PENDING = 'pending',
}

// ----------------------------------------------------
// Entity Interfaces — PRD §13 - §17, §41
// ----------------------------------------------------

export interface IProgram {
  _id: string;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription?: string | null;
  coverImage?: string | null;
  category?: string | null;
  status: ProgramStatus;
  eligibility?: string | null;
  duration?: string | null;
  language?: SupportedLanguage;
  learningOutcomes?: string[];
  curriculumSummary?: string | null;
  certificateAvailability: boolean;
  enrollmentStatus?: 'open' | 'closed' | 'upcoming';
  seoMetadata?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface ICourse {
  _id: string;
  programId?: string | null;
  title: string;
  slug: string;
  code: string;
  description: string;
  thumbnail?: string | null;
  level?: CourseLevel;
  language?: SupportedLanguage;
  duration?: string | null;
  estimatedStudyHours?: number | null;
  learningOutcomes?: string[];
  prerequisites?: string[];
  teacherIds: string[];
  certificateRules?: {
    minGradePercentage?: number;
    minAttendancePercentage?: number;
  };
  visibility: CourseVisibility;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IBatch {
  _id: string;
  courseId: string;
  batchName: string;
  batchCode: string;
  startDate: string;
  endDate: string;
  enrollmentStart: string;
  enrollmentEnd: string;
  studentLimit: number;
  teacherIds: string[];
  meetingSchedule?: string | null;
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ISubject {
  _id: string;
  title: string;
  code: string;
  description?: string | null;
  courseId: string;
  teacherIds: string[];
  sequence: number;
  totalMarks?: number | null;
  passingRules?: {
    minMarks?: number;
    minPercentage?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface IModule {
  _id: string;
  subjectId: string;
  title: string;
  description?: string | null;
  sequence: number;
  unlockRules?: {
    prerequisiteModuleId?: string | null;
    minScore?: number | null;
  };
  status: ModuleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IEnrollment {
  _id: string;
  studentId: string;
  courseId: string;
  batchId: string;
  enrollmentDate: string;
  status: EnrollmentStatus;
  source: EnrollmentSource;
  paymentStatus: PaymentStatus;
  progress: {
    completionPercentage: number;
    lastAccessedAt?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------
// DTOs for Creation & Updates
// ----------------------------------------------------

export interface CreateProgramDto {
  name: string;
  shortDescription: string;
  longDescription?: string | null;
  coverImage?: string | null;
  category?: string | null;
  status?: ProgramStatus;
  eligibility?: string | null;
  duration?: string | null;
  language?: SupportedLanguage;
  learningOutcomes?: string[];
  curriculumSummary?: string | null;
  certificateAvailability?: boolean;
  enrollmentStatus?: 'open' | 'closed' | 'upcoming';
  seoMetadata?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
}

export interface UpdateProgramDto extends Partial<CreateProgramDto> {}

export interface CreateCourseDto {
  programId?: string | null;
  title: string;
  code: string;
  description: string;
  thumbnail?: string | null;
  level?: CourseLevel;
  language?: SupportedLanguage;
  duration?: string | null;
  estimatedStudyHours?: number | null;
  learningOutcomes?: string[];
  prerequisites?: string[];
  teacherIds?: string[];
  certificateRules?: {
    minGradePercentage?: number;
    minAttendancePercentage?: number;
  };
  visibility?: CourseVisibility;
  status?: CourseStatus;
}

export interface UpdateCourseDto extends Partial<CreateCourseDto> {}

export interface CreateBatchDto {
  courseId: string;
  batchName: string;
  batchCode: string;
  startDate: string;
  endDate: string;
  enrollmentStart: string;
  enrollmentEnd: string;
  studentLimit: number;
  teacherIds?: string[];
  meetingSchedule?: string | null;
  status?: BatchStatus;
}

export interface UpdateBatchDto extends Partial<CreateBatchDto> {}

export interface CreateSubjectDto {
  title: string;
  code: string;
  description?: string | null;
  courseId: string;
  teacherIds?: string[];
  sequence?: number;
  totalMarks?: number | null;
  passingRules?: {
    minMarks?: number;
    minPercentage?: number;
  };
}

export interface UpdateSubjectDto extends Partial<CreateSubjectDto> {}

export interface CreateModuleDto {
  subjectId: string;
  title: string;
  description?: string | null;
  sequence?: number;
  unlockRules?: {
    prerequisiteModuleId?: string | null;
    minScore?: number | null;
  };
  status?: ModuleStatus;
}

export interface UpdateModuleDto extends Partial<CreateModuleDto> {}

export interface CreateEnrollmentDto {
  studentId: string;
  courseId: string;
  batchId: string;
  status?: EnrollmentStatus;
  source?: EnrollmentSource;
  paymentStatus?: PaymentStatus;
}

export interface UpdateEnrollmentStatusDto {
  status: EnrollmentStatus;
}

export interface AssignTeachersDto {
  teacherIds: string[];
}
