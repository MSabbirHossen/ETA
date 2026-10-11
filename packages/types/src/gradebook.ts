/**
 * Gradebook & Result Engine types — strictly matching PRD §37 & §38.
 */

export enum GradeSourceType {
  ASSIGNMENT = 'ASSIGNMENT',
  QUIZ = 'QUIZ',
  EXAM = 'EXAM',
  ATTENDANCE = 'ATTENDANCE',
  MANUAL = 'MANUAL',
}

export enum GradePublicationStatus {
  DRAFT = 'DRAFT',
  TEACHER_REVIEWED = 'TEACHER_REVIEWED',
  ADMIN_APPROVED = 'ADMIN_APPROVED',
  PUBLISHED = 'PUBLISHED',
  CORRECTED = 'CORRECTED',
  ARCHIVED = 'ARCHIVED',
}

export enum AttemptSelectionPolicy {
  HIGHEST = 'HIGHEST',
  LATEST = 'LATEST',
  FIRST = 'FIRST',
}

export enum MissingWorkPolicy {
  ZERO = 'ZERO',
  EXCLUDE = 'EXCLUDE',
}

export interface IGradeScaleItem {
  letter: string;
  minPercentage: number;
  gpa: number;
  description?: string;
}

export interface IGradeCategoryConfig {
  id: string; // unique category key, e.g. "cat_assignments"
  name: string; // "Assignments", "Quizzes", "Final Exam", "Attendance", "Projects"
  sourceType: GradeSourceType;
  weight: number; // percentage weight, e.g. 20 (representing 20%)
  dropLowestCount?: number; // optionally drop N lowest scores
  missingWorkPolicy?: MissingWorkPolicy; // ZERO or EXCLUDE
  attemptPolicy?: AttemptSelectionPolicy; // HIGHEST, LATEST, FIRST
  customSourceIds?: string[]; // optionally restrict to specific assignment/assessment IDs
}

export interface IGradebookConfig {
  _id?: string;
  courseId: string;
  batchId: string;
  categories: IGradeCategoryConfig[];
  passingPercentage: number; // default 60%
  gradeScale: IGradeScaleItem[];
  attendanceFullScorePercentage?: number; // default 100% (or min attendance for 100% credit)
  isConfigured: boolean;
  configuredBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IGradeItemScore {
  sourceType: GradeSourceType;
  sourceId: string;
  sourceTitle: string;
  maxMarks: number;
  obtainedMarks: number;
  normalizedPercentage: number; // (obtained / max) * 100
  isLate?: boolean;
  latePenaltyDeduction?: number;
  isDropped?: boolean; // dropped under dropLowest rule
  isExcused?: boolean;
  isMissing?: boolean;
  rawStatus?: string; // e.g. GRADED, SUBMITTED, ABSENT
}

export interface ICategoryGradeContribution {
  categoryId: string;
  categoryName: string;
  sourceType: GradeSourceType;
  weight: number; // e.g. 25
  rawScoreTotal: number;
  rawMaxTotal: number;
  categoryPercentage: number; // (rawScoreTotal / rawMaxTotal) * 100
  weightedContribution: number; // (categoryPercentage * weight) / 100
  itemScores: IGradeItemScore[];
}

export interface IGradeOverride {
  isOverridden: boolean;
  originalContribution?: number;
  overrideContribution?: number;
  originalLetterGrade?: string;
  overrideLetterGrade?: string;
  originalGpa?: number;
  overrideGpa?: number;
  reason: string;
  overriddenBy: string;
  overriddenAt: string | Date;
}

export interface IGradeCorrectionAudit {
  previousPercentage: number;
  newPercentage: number;
  previousLetterGrade: string;
  newLetterGrade: string;
  previousGpa: number;
  newGpa: number;
  reason: string;
  correctedBy: string;
  correctedAt: string | Date;
}

export interface IStudentGradeResult {
  _id?: string;
  courseId: string;
  batchId: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  categoryContributions: ICategoryGradeContribution[];
  calculatedPercentage: number; // sum of weighted contributions
  finalPercentage: number; // after override if present
  letterGrade: string;
  gpa: number;
  isPassed: boolean;
  publicationStatus: GradePublicationStatus;
  override?: IGradeOverride;
  correctionHistory?: IGradeCorrectionAudit[];
  teacherFeedback?: string;
  reviewedBy?: string;
  reviewedAt?: string | Date;
  approvedBy?: string;
  approvedAt?: string | Date;
  publishedBy?: string;
  publishedAt?: string | Date;
  calculatedAt: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IGradebookOverviewResponse {
  config: IGradebookConfig;
  course: {
    _id: string;
    title: string;
    code: string;
  };
  batch: {
    _id: string;
    batchName: string;
    batchCode: string;
  };
  results: IStudentGradeResult[];
  statusCounts: Record<GradePublicationStatus, number>;
  totalStudents: number;
  passingCount: number;
  failingCount: number;
  averagePercentage: number;
}

export interface IGuardianLink {
  _id?: string;
  guardianId: string;
  studentId: string;
  relationship: string; // 'PARENT', 'GUARDIAN', 'FATHER', 'MOTHER', 'SIBLING', etc.
  status: 'ACTIVE' | 'REVOKED' | 'PENDING';
  verified?: boolean;
  verifiedBy?: string;
  verifiedAt?: string | Date;
  linkedBy?: string;
  permissions?: string[];
  isPrimary?: boolean;
  emergencyContact?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// DTOs
export interface SaveGradebookConfigDto {
  categories: IGradeCategoryConfig[];
  passingPercentage?: number;
  gradeScale?: IGradeScaleItem[];
  attendanceFullScorePercentage?: number;
}

export interface SubmitForReviewDto {
  comments?: string;
}

export interface ApproveResultsDto {
  comments?: string;
}

export interface PublishResultsDto {
  comments?: string;
}

export interface OverrideGradeDto {
  overrideContribution: number;
  overrideLetterGrade?: string;
  overrideGpa?: number;
  reason: string;
}

export interface CorrectGradeDto {
  newContribution: number;
  newLetterGrade?: string;
  newGpa?: number;
  reason: string;
}

export interface UpdateFeedbackDto {
  teacherFeedback: string;
}
