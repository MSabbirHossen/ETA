export enum CertificateType {
  COURSE_COMPLETION = 'COURSE_COMPLETION',
  PROGRAM_COMPLETION = 'PROGRAM_COMPLETION',
  PARTICIPATION = 'PARTICIPATION',
  ACHIEVEMENT = 'ACHIEVEMENT',
  HONORS = 'HONORS',
}

export enum CertificateStatus {
  ISSUED = 'ISSUED',
  REVOKED = 'REVOKED',
  REPLACED = 'REPLACED',
}

export interface ICredentialSnapshot {
  studentName: string;
  studentEmail?: string;
  courseTitle: string;
  courseCode?: string;
  programTitle?: string;
  batchCode?: string;
  finalPercentage: number;
  letterGrade: string;
  gpa: number;
  completionDate: string; // ISO 8601 string
  issuerOrganization: string; // 'Exploratory Training Academy'
  instructorNames?: string[];
  issuedByRole?: string;
  authorizedSignatures?: Array<{
    name: string;
    title: string;
  }>;
}

export interface ICertificate {
  id: string;
  certificateNumber: string; // e.g. "ETA-2026-CS-8F2B9D1A"
  verificationCode: string; // Secure random alphanumeric token
  studentId: string;
  enrollmentId?: string;
  courseId: string;
  batchId?: string;
  programId?: string;
  certificateType: CertificateType;
  title: string;
  description?: string;
  issuedAt: Date | string;
  issuedBy: string; // Staff/Admin User ID
  status: CertificateStatus;
  completionDate: Date | string;
  grade?: string;
  gpa?: number;
  credentialSnapshot: ICredentialSnapshot;
  pdfUrl?: string;
  storageRef?: string;
  revokedAt?: Date | string | null;
  revokedBy?: string | null;
  revocationReason?: string | null;
  replacesCertificateId?: string | null;
  replacedByCertificateId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CertificateEligibilityFactor {
  factor: 'ENROLLMENT' | 'GRADE_RESULT' | 'ATTENDANCE' | 'PAYMENT' | 'PROGRESS';
  satisfied: boolean;
  requiredValue?: string | number;
  actualValue?: string | number;
  details: string;
}

export interface CertificateEligibilityResult {
  eligible: boolean;
  studentId: string;
  studentName?: string;
  courseId: string;
  courseTitle?: string;
  batchId?: string;
  batchCode?: string;
  enrollmentId?: string;
  gradeResultId?: string;
  grade?: string;
  gpa?: number;
  percentage?: number;
  factors: CertificateEligibilityFactor[];
  reasons: string[];
  existingCertificate?: {
    id: string;
    certificateNumber: string;
    status: CertificateStatus;
    issuedAt: string;
  } | null;
  isOverridden?: boolean;
  overrideReason?: string;
  overriddenBy?: string;
}

export interface CertificateVerificationResponse {
  valid: boolean;
  status: CertificateStatus;
  certificateNumber: string;
  verificationCode: string;
  studentName: string;
  courseTitle: string;
  programTitle?: string;
  certificateType: CertificateType;
  title: string;
  issuedAt: string;
  completionDate: string;
  issuerOrganization: string;
  letterGrade?: string;
  gpa?: number;
  isRevoked: boolean;
  revokedAt?: string | null;
  revocationReason?: string | null;
  isReplaced: boolean;
  replacementCertificateNumber?: string | null;
  verificationUrl: string;
}

export interface IssueCertificateDto {
  studentId: string;
  courseId: string;
  batchId?: string;
  certificateType?: CertificateType;
  title?: string;
  allowOverride?: boolean;
  overrideReason?: string;
}

export interface BulkIssueCertificatesDto {
  courseId: string;
  batchId?: string;
  studentIds?: string[];
  certificateType?: CertificateType;
  title?: string;
  skipIneligible?: boolean;
}

export interface RevokeCertificateDto {
  reason: string;
}

export interface ReissueCertificateDto {
  reason: string;
  certificateType?: CertificateType;
  title?: string;
}

export interface CertificateQuery {
  studentId?: string;
  courseId?: string;
  batchId?: string;
  status?: CertificateStatus;
  certificateType?: CertificateType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CertificateListResponse {
  certificates: ICertificate[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
