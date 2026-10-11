export enum AssignmentStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

export enum SubmissionType {
  TEXT = 'text',
  FILE = 'file',
  URL = 'url',
  MIXED = 'mixed',
}

export enum SubmissionStatus {
  SUBMITTED = 'submitted',
  LATE = 'late',
  UNDER_REVIEW = 'under_review',
  GRADED = 'graded',
  RESUBMISSION_REQUESTED = 'resubmission_requested',
  COMPLETED = 'completed',
}

export enum AssignmentVisibility {
  ENROLLMENT_ONLY = 'enrollment_only',
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export interface IAssignment {
  _id: string;
  title: string;
  slug: string;
  description?: string | null;
  instructions: string;
  courseId: string;
  batchId: string;
  subjectId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  teacherId: string;
  attachments: string[];
  totalMarks: number;
  passMarks?: number | null;
  publishDate: string;
  dueDate: string;
  closesAt?: string | null;
  allowLateSubmission: boolean;
  latePenalty: number;
  submissionType: SubmissionType;
  maxAttempts: number;
  resubmissionAllowed: boolean;
  status: AssignmentStatus;
  visibility: AssignmentVisibility;
  submissionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IAssignmentSubmission {
  _id: string;
  assignmentId: string;
  studentId: string;
  attemptNumber: number;
  submissionType: SubmissionType;
  textContent?: string | null;
  attachments: string[];
  url?: string | null;
  submittedAt: string;
  isLate: boolean;
  status: SubmissionStatus;
  score?: number | null;
  feedback?: string | null;
  privateNotes?: string | null;
  feedbackAttachments: string[];
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssignmentDto {
  title: string;
  slug?: string;
  description?: string | null;
  instructions: string;
  courseId: string;
  batchId: string;
  subjectId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  teacherId?: string;
  attachments?: string[];
  totalMarks?: number;
  passMarks?: number | null;
  publishDate?: string;
  dueDate: string;
  closesAt?: string | null;
  allowLateSubmission?: boolean;
  latePenalty?: number;
  submissionType?: SubmissionType;
  maxAttempts?: number;
  resubmissionAllowed?: boolean;
  status?: AssignmentStatus;
  visibility?: AssignmentVisibility;
}

export interface UpdateAssignmentDto {
  title?: string;
  slug?: string;
  description?: string | null;
  instructions?: string;
  subjectId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  attachments?: string[];
  totalMarks?: number;
  passMarks?: number | null;
  publishDate?: string;
  dueDate?: string;
  closesAt?: string | null;
  allowLateSubmission?: boolean;
  latePenalty?: number;
  submissionType?: SubmissionType;
  maxAttempts?: number;
  resubmissionAllowed?: boolean;
  status?: AssignmentStatus;
  visibility?: AssignmentVisibility;
}

export interface SubmitAssignmentDto {
  submissionType?: SubmissionType;
  textContent?: string | null;
  attachments?: string[];
  url?: string | null;
}

export interface ReviewSubmissionDto {
  status: SubmissionStatus;
  score?: number | null;
  feedback?: string | null;
  privateNotes?: string | null;
  feedbackAttachments?: string[];
}
