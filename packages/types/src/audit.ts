/**
 * Audit Logging Domain Types — PRD §56
 *
 * Implements strict append-only audit event structures, action taxonomies,
 * categories, actor models, and safe field-level change tracking.
 */

export enum AuditCategory {
  AUTH = 'AUTH',
  USER = 'USER',
  ACADEMIC = 'ACADEMIC',
  ASSESSMENT = 'ASSESSMENT',
  ATTENDANCE = 'ATTENDANCE',
  GRADEBOOK = 'GRADEBOOK',
  CERTIFICATE = 'CERTIFICATE',
  FINANCE = 'FINANCE',
  ADMISSION = 'ADMISSIONS',
  GUARDIAN = 'GUARDIAN',
  CONTENT = 'CONTENT',
  SETTINGS = 'SETTINGS',
  SYSTEM = 'SYSTEM',
  AI = 'AI',
}

export enum AuditAction {
  // User & RBAC — PRD §56
  USER_CREATED = 'USER_CREATED',
  USER_DELETED = 'USER_DELETED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_STATUS_CHANGED = 'USER_STATUS_CHANGED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_REACTIVATED = 'USER_REACTIVATED',
  PERMISSIONS_CHANGED = 'PERMISSIONS_CHANGED',

  // Academic & Curriculum
  COURSE_CREATED = 'COURSE_CREATED',
  COURSE_UPDATED = 'COURSE_UPDATED',
  BATCH_CREATED = 'BATCH_CREATED',
  BATCH_UPDATED = 'BATCH_UPDATED',
  ENROLLMENT_CREATED = 'ENROLLMENT_CREATED',
  ENROLLMENT_STATUS_CHANGED = 'ENROLLMENT_STATUS_CHANGED',
  ENROLLMENT_CANCELLED = 'ENROLLMENT_CANCELLED',

  // Examination & Assessment — PRD §56
  EXAM_CHANGED = 'EXAM_CHANGED',
  ASSESSMENT_CREATED = 'ASSESSMENT_CREATED',
  ASSESSMENT_PUBLISHED = 'ASSESSMENT_PUBLISHED',
  ASSESSMENT_UPDATED = 'ASSESSMENT_UPDATED',
  ASSESSMENT_DELETED = 'ASSESSMENT_DELETED',

  // Grade & Gradebook — PRD §56
  GRADE_MODIFIED = 'GRADE_MODIFIED',
  GRADE_OVERRIDDEN = 'GRADE_OVERRIDDEN',
  GRADE_CORRECTED = 'GRADE_CORRECTED',
  GRADEBOOK_FINALIZED = 'GRADEBOOK_FINALIZED',
  RESULT_PUBLISHED = 'RESULT_PUBLISHED',

  // Attendance
  ATTENDANCE_FINALIZED = 'ATTENDANCE_FINALIZED',
  ATTENDANCE_CORRECTED = 'ATTENDANCE_CORRECTED',

  // Certificates — PRD §56
  CERTIFICATE_ISSUED = 'CERTIFICATE_ISSUED',
  CERTIFICATE_REVOKED = 'CERTIFICATE_REVOKED',
  CERTIFICATE_REISSUED = 'CERTIFICATE_REISSUED',

  // Finance & Payments — PRD §56
  PAYMENT_RECORDED = 'PAYMENT_RECORDED',
  PAYMENT_CHANGED = 'PAYMENT_CHANGED',
  INVOICE_CREATED = 'INVOICE_CREATED',
  REFUND_REQUESTED = 'REFUND_REQUESTED',
  REFUND_APPROVED = 'REFUND_APPROVED',
  REFUND_REJECTED = 'REFUND_REJECTED',
  FEE_STRUCTURE_CHANGED = 'FEE_STRUCTURE_CHANGED',
  FEE_STRUCTURE_CREATED = 'FEE_STRUCTURE_CREATED',
  FEE_STRUCTURE_UPDATED = 'FEE_STRUCTURE_UPDATED',

  // Admissions & Guardians
  ADMISSION_APPLICATION_REVIEWED = 'ADMISSION_APPLICATION_REVIEWED',
  ADMISSION_APPLICATION_APPROVED = 'ADMISSION_APPLICATION_APPROVED',
  ADMISSION_APPLICATION_REJECTED = 'ADMISSION_APPLICATION_REJECTED',
  ADMISSION_APPLICATION_DECIDED = 'ADMISSION_APPLICATION_DECIDED',
  ADMISSION_STUDENT_CONVERTED = 'ADMISSION_STUDENT_CONVERTED',
  GUARDIAN_LINK_CREATED = 'GUARDIAN_LINK_CREATED',
  GUARDIAN_LINK_VERIFIED = 'GUARDIAN_LINK_VERIFIED',
  GUARDIAN_LINK_REVOKED = 'GUARDIAN_LINK_REVOKED',

  // Content & Settings — PRD §56
  CMS_CONTENT_PUBLISHED = 'CMS_CONTENT_PUBLISHED',
  BLOG_POST_PUBLISHED = 'BLOG_POST_PUBLISHED',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',

  // Reports
  REPORT_EXPORTED = 'REPORT_EXPORTED',

  // Security & Failure Audits
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',

  // Educational AI Engine (PRD §93, §94)
  AI_QUESTION_GENERATED = 'AI_QUESTION_GENERATED',
  AI_RUBRIC_FEEDBACK_GENERATED = 'AI_RUBRIC_FEEDBACK_GENERATED',
  AI_REINDEX_EXECUTED = 'AI_REINDEX_EXECUTED',
}

export enum AuditResult {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

export enum AuditSeverity {
  LOW = 'LOW',
  INFO = 'INFO',
  MEDIUM = 'MEDIUM',
  WARNING = 'WARNING',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AuditActorType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
}

export interface IAuditActor {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  type: AuditActorType;
}

export interface IAuditChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface IAuditLog {
  id: string;
  actor: IAuditActor;
  action: AuditAction;
  category: AuditCategory;
  resourceType: string;
  resourceId?: string;
  scope?: {
    courseId?: string;
    batchId?: string;
    studentId?: string;
  };
  result: AuditResult;
  severity: AuditSeverity;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  changes?: IAuditChange[];
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

export interface AuditQueryDto {
  actorId?: string;
  action?: AuditAction;
  category?: AuditCategory;
  resourceType?: string;
  resourceId?: string;
  result?: AuditResult;
  severity?: AuditSeverity;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface IAuditLogListResponse {
  items: IAuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
