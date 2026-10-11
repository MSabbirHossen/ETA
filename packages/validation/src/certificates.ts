import { z } from 'zod';
import { CertificateType, CertificateStatus } from '@eta/types';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const issueCertificateSchema = z.object({
  studentId: z.string().regex(objectIdRegex, 'Invalid student ID format'),
  courseId: z.string().regex(objectIdRegex, 'Invalid course ID format'),
  batchId: z.string().regex(objectIdRegex, 'Invalid batch ID format').optional(),
  certificateType: z.nativeEnum(CertificateType).default(CertificateType.COURSE_COMPLETION),
  title: z.string().trim().min(3).max(150).optional(),
  allowOverride: z.boolean().optional().default(false),
  overrideReason: z.string().trim().min(5).max(500).optional(),
});

export const bulkIssueCertificatesSchema = z.object({
  courseId: z.string().regex(objectIdRegex, 'Invalid course ID format'),
  batchId: z.string().regex(objectIdRegex, 'Invalid batch ID format').optional(),
  studentIds: z.array(z.string().regex(objectIdRegex, 'Invalid student ID format')).optional(),
  certificateType: z.nativeEnum(CertificateType).default(CertificateType.COURSE_COMPLETION),
  title: z.string().trim().min(3).max(150).optional(),
  skipIneligible: z.boolean().optional().default(true),
});

export const revokeCertificateSchema = z.object({
  reason: z.string().trim().min(5, 'Revocation reason must be at least 5 characters').max(500),
});

export const reissueCertificateSchema = z.object({
  reason: z.string().trim().min(5, 'Reissue reason must be at least 5 characters').max(500),
  certificateType: z.nativeEnum(CertificateType).optional(),
  title: z.string().trim().min(3).max(150).optional(),
});

export const certificateQuerySchema = z.object({
  studentId: z.string().optional(),
  courseId: z.string().optional(),
  batchId: z.string().optional(),
  status: z.nativeEnum(CertificateStatus).optional(),
  certificateType: z.nativeEnum(CertificateType).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const certificateEligibilityQuerySchema = z.object({
  courseId: z.string().regex(objectIdRegex, 'Invalid course ID format'),
  batchId: z.string().regex(objectIdRegex, 'Invalid batch ID format').optional(),
  studentId: z.string().regex(objectIdRegex, 'Invalid student ID format').optional(),
});

export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>;
export type BulkIssueCertificatesInput = z.infer<typeof bulkIssueCertificatesSchema>;
export type RevokeCertificateInput = z.infer<typeof revokeCertificateSchema>;
export type ReissueCertificateInput = z.infer<typeof reissueCertificateSchema>;
export type CertificateQueryInput = z.infer<typeof certificateQuerySchema>;
export type CertificateEligibilityQueryInput = z.infer<typeof certificateEligibilityQuerySchema>;
