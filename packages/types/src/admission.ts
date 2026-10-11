import type { PaymentStatus } from './academic';

/**
 * Admission application status lifecycle — PRD §42
 */
export enum AdmissionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  SHORTLISTED = 'SHORTLISTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WAITLISTED = 'WAITLISTED',
  ENROLLED = 'ENROLLED',
  WITHDRAWN = 'WITHDRAWN',
}

/**
 * Admission document types — PRD §42, §71, §72
 */
export enum AdmissionDocumentType {
  ID_PROOF = 'ID_PROOF',
  CERTIFICATE = 'CERTIFICATE',
  TRANSCRIPT = 'TRANSCRIPT',
  PHOTO = 'PHOTO',
  GUARDIAN_ID = 'GUARDIAN_ID',
  OTHER = 'OTHER',
}

/**
 * Guardian relationship types — PRD §43
 */
export enum GuardianRelationshipType {
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  SIBLING = 'SIBLING',
  LEGAL_GUARDIAN = 'LEGAL_GUARDIAN',
  PARENT = 'PARENT',
  OTHER = 'OTHER',
}

/**
 * Application address interface
 */
export interface IApplicationAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Applicant personal info
 */
export interface IApplicantPersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string | Date;
  gender?: string;
  nationalId?: string;
  address?: IApplicationAddress;
}

/**
 * Applicant prior education info
 */
export interface IApplicantEducation {
  highestLevel: string; // 'HIGH_SCHOOL', 'DIPLOMA', 'BACHELOR', 'MASTER', 'OTHER'
  institution: string;
  graduationYear?: number;
  gradeOrGpa?: string;
  major?: string;
}

/**
 * Applicant guardian info
 */
export interface IApplicantGuardianInfo {
  name?: string;
  relationship?: GuardianRelationshipType | string;
  email?: string;
  phone?: string;
  occupation?: string;
  address?: string;
}

/**
 * Application document metadata
 */
export interface IApplicationDocument {
  title: string;
  type: AdmissionDocumentType | string;
  url: string;
  storageKey?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt?: string | Date;
}

/**
 * Application review history item
 */
export interface IApplicationReviewHistory {
  reviewerId: string;
  status: AdmissionStatus;
  notes?: string; // internal staff note
  decisionReason?: string;
  reviewedAt: string | Date;
}

/**
 * Complete admission application entity
 */
export interface IAdmissionApplication {
  _id?: string;
  applicantId: string;
  programId: string;
  courseId: string;
  batchId: string;
  personalInfo: IApplicantPersonalInfo;
  education: IApplicantEducation;
  guardianInfo?: IApplicantGuardianInfo;
  documents: IApplicationDocument[];
  status: AdmissionStatus;
  submittedAt?: string | Date;
  reviews?: IApplicationReviewHistory[];
  reviewerNotes?: string;
  decisionReason?: string;
  decisionDate?: string | Date;
  decidedBy?: string;
  enrolledAt?: string | Date;
  studentId?: string;
  enrollmentId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Sanitized view for applicants (protects internal review notes)
 */
export interface ISafeAdmissionApplication extends Omit<IAdmissionApplication, 'reviewerNotes' | 'reviews'> {
  reviews?: Omit<IApplicationReviewHistory, 'notes'>[];
}

/**
 * DTOs for Admissions
 */
export interface CreateApplicationDraftDto {
  programId: string;
  courseId: string;
  batchId: string;
  personalInfo?: Partial<IApplicantPersonalInfo>;
  education?: Partial<IApplicantEducation>;
  guardianInfo?: Partial<IApplicantGuardianInfo>;
  documents?: IApplicationDocument[];
}

export interface UpdateApplicationDraftDto {
  programId?: string;
  courseId?: string;
  batchId?: string;
  personalInfo?: Partial<IApplicantPersonalInfo>;
  education?: Partial<IApplicantEducation>;
  guardianInfo?: Partial<IApplicantGuardianInfo>;
  documents?: IApplicationDocument[];
}

export interface ReviewApplicationDto {
  status: AdmissionStatus.UNDER_REVIEW | AdmissionStatus.SHORTLISTED;
  reviewerNotes?: string;
}

export interface DecisionApplicationDto {
  decision: 'APPROVED' | 'REJECTED' | 'WAITLISTED';
  decisionReason: string;
  reviewerNotes?: string;
}

export interface ConvertToStudentDto {
  paymentStatus?: PaymentStatus;
}

/**
 * DTOs for Guardian Management — PRD §43
 */
export interface CreateGuardianLinkDto {
  guardianId?: string;
  guardianEmail?: string;
  studentId: string;
  relationship: string;
  isPrimary?: boolean;
  emergencyContact?: boolean;
  permissions?: string[];
}

export interface UpdateGuardianLinkDto {
  relationship?: string;
  status?: 'ACTIVE' | 'REVOKED' | 'PENDING';
  isPrimary?: boolean;
  emergencyContact?: boolean;
  permissions?: string[];
}

export interface VerifyGuardianLinkDto {
  verified: boolean;
}
