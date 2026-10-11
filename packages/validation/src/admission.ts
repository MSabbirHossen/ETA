import { z } from 'zod';
import {
  AdmissionStatus,
  AdmissionDocumentType,
  GuardianRelationshipType,
  PaymentStatus,
} from '@eta/types';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z
  .string()
  .regex(objectIdRegex, 'Invalid ID format (must be 24-character hex string)');

export const applicationAddressSchema = z.object({
  street: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(100).optional(),
});

export const applicantPersonalInfoSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(150),
  email: z.string().trim().email('Invalid email address'),
  phone: z.string().trim().min(5, 'Phone number must be at least 5 characters').max(30),
  dateOfBirth: z.union([z.string(), z.date()]).optional(),
  gender: z.string().trim().max(30).optional(),
  nationalId: z.string().trim().max(50).optional(),
  address: applicationAddressSchema.optional(),
});

export const applicantEducationSchema = z.object({
  highestLevel: z.string().trim().min(1, 'Highest education level is required').max(100),
  institution: z.string().trim().min(2, 'Institution name is required').max(200),
  graduationYear: z.number().int().min(1950).max(2100).optional(),
  gradeOrGpa: z.string().trim().max(50).optional(),
  major: z.string().trim().max(100).optional(),
});

export const applicantGuardianInfoSchema = z.object({
  name: z.string().trim().min(2, 'Guardian name must be at least 2 characters').max(150),
  relationship: z.string().trim().min(1, 'Relationship is required').max(50),
  email: z.string().trim().email('Invalid guardian email').optional().or(z.literal('')),
  phone: z.string().trim().min(5, 'Guardian phone must be at least 5 characters').max(30),
  occupation: z.string().trim().max(100).optional(),
  address: z.string().trim().max(300).optional(),
});

export const applicationDocumentSchema = z.object({
  title: z.string().trim().min(1, 'Document title is required').max(150),
  type: z.nativeEnum(AdmissionDocumentType).or(z.string().trim()),
  url: z.string().trim().min(1, 'Document URL is required'),
  storageKey: z.string().trim().optional(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().trim().optional(),
  uploadedAt: z.union([z.string(), z.date()]).optional(),
});

// Draft Creation Schema (fields are optional except target references)
export const createApplicationDraftSchema = z.object({
  programId: objectIdSchema,
  courseId: objectIdSchema,
  batchId: objectIdSchema,
  personalInfo: applicantPersonalInfoSchema.partial().optional(),
  education: applicantEducationSchema.partial().optional(),
  guardianInfo: applicantGuardianInfoSchema.partial().optional(),
  documents: z.array(applicationDocumentSchema).optional(),
});

export const updateApplicationDraftSchema = z.object({
  programId: objectIdSchema.optional(),
  courseId: objectIdSchema.optional(),
  batchId: objectIdSchema.optional(),
  personalInfo: applicantPersonalInfoSchema.partial().optional(),
  education: applicantEducationSchema.partial().optional(),
  guardianInfo: applicantGuardianInfoSchema.partial().optional(),
  documents: z.array(applicationDocumentSchema).optional(),
});

// Submit Application Schema — requires all mandatory PRD §42 fields
export const submitApplicationSchema = z.object({
  programId: objectIdSchema,
  courseId: objectIdSchema,
  batchId: objectIdSchema,
  personalInfo: applicantPersonalInfoSchema,
  education: applicantEducationSchema,
  guardianInfo: applicantGuardianInfoSchema.optional(),
  documents: z.array(applicationDocumentSchema).default([]),
});

// Administrative Review Schema
export const reviewApplicationSchema = z.object({
  status: z.enum([AdmissionStatus.UNDER_REVIEW, AdmissionStatus.SHORTLISTED]),
  reviewerNotes: z.string().trim().max(2000).optional(),
});

// Administrative Decision Schema
export const decisionApplicationSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'WAITLISTED']),
  decisionReason: z.string().trim().min(3, 'Decision reason is required').max(1000),
  reviewerNotes: z.string().trim().max(2000).optional(),
});

// Convert Approved Applicant to Student
export const convertToStudentSchema = z.object({
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
});

// Guardian Link Schemas — PRD §43
export const createGuardianLinkSchema = z
  .object({
    guardianId: objectIdSchema.optional(),
    guardianEmail: z.string().trim().email().optional(),
    studentId: objectIdSchema,
    relationship: z.string().trim().min(2, 'Relationship is required').max(50),
    isPrimary: z.boolean().default(false),
    emergencyContact: z.boolean().default(false),
    permissions: z.array(z.string().trim()).optional(),
  })
  .refine((data) => data.guardianId || data.guardianEmail, {
    message: 'Either guardianId or guardianEmail must be provided',
    path: ['guardianId'],
  });

export const updateGuardianLinkSchema = z.object({
  relationship: z.string().trim().min(2).max(50).optional(),
  status: z.enum(['ACTIVE', 'REVOKED', 'PENDING']).optional(),
  isPrimary: z.boolean().optional(),
  emergencyContact: z.boolean().optional(),
  permissions: z.array(z.string().trim()).optional(),
});

export const verifyGuardianLinkSchema = z.object({
  verified: z.boolean(),
});
