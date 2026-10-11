import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { AdmissionService } from './admission.service.js';
import { AdmissionApplication, sanitizeForApplicant } from './admission-application.model.js';
import { Program } from '../academic/program.model.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { User } from '../users/user.model.js';
import { GuardianLink } from '../users/guardian-link.model.js';
import {
  AdmissionStatus,
  EnrollmentStatus,
  EnrollmentSource,
  UserRole,
} from '@eta/types';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} from '../../common/errors.js';

vi.mock('./admission-application.model.js', async () => {
  const actual = await vi.importActual<any>('./admission-application.model.js');
  const MockApplication: any = vi.fn();
  MockApplication.findOne = vi.fn();
  MockApplication.findById = vi.fn();
  MockApplication.find = vi.fn();
  MockApplication.create = vi.fn();
  MockApplication.countDocuments = vi.fn();
  return {
    ...actual,
    AdmissionApplication: MockApplication,
  };
});

vi.mock('../academic/program.model.js', () => {
  const MockProgram: any = { findById: vi.fn() };
  return { Program: MockProgram };
});

vi.mock('../academic/course.model.js', () => {
  const MockCourse: any = { findById: vi.fn() };
  return { Course: MockCourse };
});

vi.mock('../academic/batch.model.js', () => {
  const MockBatch: any = { findById: vi.fn() };
  return { Batch: MockBatch };
});

vi.mock('../academic/enrollment.model.js', () => {
  const MockEnrollment: any = { findOne: vi.fn(), create: vi.fn() };
  return { Enrollment: MockEnrollment };
});

vi.mock('../users/user.model.js', () => {
  const MockUser: any = { findById: vi.fn(), findOne: vi.fn() };
  return { User: MockUser };
});

vi.mock('../users/guardian-link.model.js', () => {
  const MockGuardianLink: any = { findOne: vi.fn(), create: vi.fn() };
  return { GuardianLink: MockGuardianLink };
});

describe('AdmissionService', () => {
  const applicantId = new Types.ObjectId().toString();
  const programId = new Types.ObjectId().toString();
  const courseId = new Types.ObjectId().toString();
  const batchId = new Types.ObjectId().toString();
  const applicationId = new Types.ObjectId().toString();
  const reviewerId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();

    (Program.findById as any).mockResolvedValue({
      _id: programId,
      name: 'Computer Science',
    });
    (Course.findById as any).mockResolvedValue({
      _id: courseId,
      programId: { toString: () => programId },
      title: 'Fullstack Web Development',
    });
    (Batch.findById as any).mockResolvedValue({
      _id: batchId,
      courseId: { toString: () => courseId },
      name: 'Fall 2026 Cohort',
    });
  });

  describe('createDraft', () => {
    it('creates a new draft application if none exists', async () => {
      (AdmissionApplication.findOne as any).mockResolvedValue(null);
      (User.findById as any).mockResolvedValue({
        _id: applicantId,
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '1234567890',
      });

      const mockSaved = {
        _id: applicationId,
        applicantId,
        programId,
        courseId,
        batchId,
        status: AdmissionStatus.DRAFT,
        personalInfo: { fullName: 'Jane Doe', email: 'jane@example.com', phone: '1234567890' },
        education: { highestLevel: 'Bachelor', institution: 'State University' },
        documents: [],
        toObject: () => ({ ...mockSaved }),
      };
      (AdmissionApplication.create as any).mockResolvedValue(mockSaved);

      const result = await AdmissionService.createDraft(applicantId, {
        programId,
        courseId,
        batchId,
        personalInfo: { fullName: 'Jane Doe' },
      });

      expect(AdmissionApplication.create).toHaveBeenCalled();
      expect(result.status).toBe(AdmissionStatus.DRAFT);
    });

    it('rejects if course does not belong to program', async () => {
      (Course.findById as any).mockResolvedValue({
        _id: courseId,
        programId: { toString: () => 'different-program-id' },
      });

      await expect(
        AdmissionService.createDraft(applicantId, { programId, courseId, batchId })
      ).rejects.toThrow(BadRequestError);
    });

    it('throws ConflictError if application already submitted for same target', async () => {
      (AdmissionApplication.findOne as any).mockResolvedValue({
        status: AdmissionStatus.SUBMITTED,
      });

      await expect(
        AdmissionService.createDraft(applicantId, { programId, courseId, batchId })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('updateDraft', () => {
    it('allows owner to update draft', async () => {
      const mockDoc = {
        _id: applicationId,
        applicantId: { toString: () => applicantId },
        programId: { toString: () => programId },
        courseId: { toString: () => courseId },
        batchId: { toString: () => batchId },
        status: AdmissionStatus.DRAFT,
        personalInfo: {},
        education: {},
        save: vi.fn(),
        toObject: () => ({ _id: applicationId, status: AdmissionStatus.DRAFT }),
      };
      (AdmissionApplication.findById as any).mockResolvedValue(mockDoc);

      const res = await AdmissionService.updateDraft(applicantId, applicationId, {
        personalInfo: { fullName: 'Updated Name' },
      });

      expect(mockDoc.save).toHaveBeenCalled();
      expect(res.status).toBe(AdmissionStatus.DRAFT);
    });

    it('prevents non-owner from updating draft (IDOR Protection)', async () => {
      const otherUser = new Types.ObjectId().toString();
      const mockDoc = {
        _id: applicationId,
        applicantId: { toString: () => applicantId },
        status: AdmissionStatus.DRAFT,
      };
      (AdmissionApplication.findById as any).mockResolvedValue(mockDoc);

      await expect(
        AdmissionService.updateDraft(otherUser, applicationId, { personalInfo: {} })
      ).rejects.toThrow(ForbiddenError);
    });

    it('prevents updating non-DRAFT application', async () => {
      const mockDoc = {
        _id: applicationId,
        applicantId: { toString: () => applicantId },
        status: AdmissionStatus.SUBMITTED,
      };
      (AdmissionApplication.findById as any).mockResolvedValue(mockDoc);

      await expect(
        AdmissionService.updateDraft(applicantId, applicationId, { personalInfo: {} })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('submitApplication', () => {
    it('validates mandatory fields and transitions to SUBMITTED', async () => {
      const mockDoc = {
        _id: applicationId,
        applicantId: { toString: () => applicantId },
        programId: { toString: () => programId },
        courseId: { toString: () => courseId },
        batchId: { toString: () => batchId },
        status: AdmissionStatus.DRAFT,
        personalInfo: { fullName: 'John Smith', email: 'john@example.com', phone: '1234567890' },
        education: { highestLevel: 'High School', institution: 'ETA Academy' },
        save: vi.fn(),
        toObject: () => ({ ...mockDoc, status: AdmissionStatus.SUBMITTED }),
      };
      (AdmissionApplication.findById as any).mockResolvedValue(mockDoc);

      const res = await AdmissionService.submitApplication(applicantId, applicationId);

      expect(mockDoc.status).toBe(AdmissionStatus.SUBMITTED);
      expect(mockDoc.submittedAt).toBeInstanceOf(Date);
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it('rejects submission if required education is missing', async () => {
      const mockDoc = {
        _id: applicationId,
        applicantId: { toString: () => applicantId },
        status: AdmissionStatus.DRAFT,
        personalInfo: { fullName: 'John Smith', email: 'john@example.com', phone: '1234567890' },
        education: { highestLevel: '', institution: '' },
      };
      (AdmissionApplication.findById as any).mockResolvedValue(mockDoc);

      await expect(
        AdmissionService.submitApplication(applicantId, applicationId)
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('reviewApplication', () => {
    it('allows admissions reviewer to set status to UNDER_REVIEW or SHORTLISTED', async () => {
      const mockDoc = {
        _id: applicationId,
        status: AdmissionStatus.SUBMITTED,
        reviews: [],
        save: vi.fn(),
        toObject: () => ({ ...mockDoc, status: AdmissionStatus.UNDER_REVIEW }),
      };
      (AdmissionApplication.findById as any).mockResolvedValue(mockDoc);

      const res = await AdmissionService.reviewApplication(applicationId, reviewerId, {
        status: AdmissionStatus.UNDER_REVIEW,
        reviewerNotes: 'Strong applicant profile',
      });

      expect(mockDoc.status).toBe(AdmissionStatus.UNDER_REVIEW);
      expect(mockDoc.reviewerNotes).toBe('Strong applicant profile');
      expect(mockDoc.reviews).toHaveLength(1);
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it('rejects review on terminal APPROVED state', async () => {
      const mockDoc = {
        _id: applicationId,
        status: AdmissionStatus.APPROVED,
      };
      (AdmissionApplication.findById as any).mockResolvedValue(mockDoc);

      await expect(
        AdmissionService.reviewApplication(applicationId, reviewerId, {
          status: AdmissionStatus.SHORTLISTED,
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('decideApplication', () => {
    it('sets decision reason and updates status to APPROVED', async () => {
      const mockDoc = {
        _id: applicationId,
        status: AdmissionStatus.SHORTLISTED,
        reviews: [],
        save: vi.fn(),
        toObject: () => ({ ...mockDoc, status: AdmissionStatus.APPROVED }),
      };
      (AdmissionApplication.findById as any).mockResolvedValue(mockDoc);

      const res = await AdmissionService.decideApplication(applicationId, reviewerId, {
        decision: 'APPROVED',
        decisionReason: 'Passed interview with distinction',
      });

      expect(mockDoc.status).toBe(AdmissionStatus.APPROVED);
      expect(mockDoc.decisionReason).toBe('Passed interview with distinction');
      expect(mockDoc.decidedBy).toBe(reviewerId);
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });

  describe('convertToStudent', () => {
    it('idempotently converts approved applicant to student and creates Enrollment', async () => {
      const enrollmentId = new Types.ObjectId().toString();
      const mockUser = {
        _id: applicantId,
        roles: [UserRole.VISITOR],
        activeRole: UserRole.VISITOR,
        save: vi.fn(),
      };
      (User.findById as any).mockResolvedValue(mockUser);

      const mockDoc = {
        _id: applicationId,
        applicantId: { toString: () => applicantId },
        courseId: { toString: () => courseId },
        batchId: { toString: () => batchId },
        status: AdmissionStatus.APPROVED,
        guardianInfo: { email: 'parent@example.com', relationship: 'MOTHER' },
        save: vi.fn(),
        toObject: () => ({ ...mockDoc, status: AdmissionStatus.ENROLLED }),
      };
      (AdmissionApplication.findById as any).mockResolvedValue(mockDoc);

      (Enrollment.findOne as any).mockResolvedValue(null);
      (Enrollment.create as any).mockResolvedValue({
        _id: enrollmentId,
        studentId: applicantId,
        courseId,
        batchId,
        status: EnrollmentStatus.ACTIVE,
        source: EnrollmentSource.ADMISSION,
      });

      const mockGuardian = {
        _id: new Types.ObjectId().toString(),
        roles: [UserRole.VISITOR],
        save: vi.fn(),
      };
      (User.findOne as any).mockResolvedValue(mockGuardian);
      (GuardianLink.findOne as any).mockResolvedValue(null);
      (GuardianLink.create as any).mockResolvedValue({ _id: 'glink-id' });

      const res = await AdmissionService.convertToStudent(applicationId, reviewerId);

      expect(mockUser.roles).toContain(UserRole.STUDENT);
      expect(mockUser.save).toHaveBeenCalled();
      expect(Enrollment.create).toHaveBeenCalled();
      expect(GuardianLink.create).toHaveBeenCalled();
      expect(mockDoc.status).toBe(AdmissionStatus.ENROLLED);
      expect(res.alreadyEnrolled).toBe(false);
    });

    it('is idempotent on already ENROLLED application', async () => {
      const mockDoc = {
        _id: applicationId,
        status: AdmissionStatus.ENROLLED,
        applicantId: { toString: () => applicantId },
        studentId: { toString: () => applicantId },
        enrollmentId: { toString: () => 'existing-enrollment' },
        toObject: () => ({ ...mockDoc }),
      };
      (AdmissionApplication.findById as any).mockResolvedValue(mockDoc);

      const res = await AdmissionService.convertToStudent(applicationId, reviewerId);
      expect(res.alreadyEnrolled).toBe(true);
      expect(res.enrollmentId).toBe('existing-enrollment');
    });
  });

  describe('Privacy & Data Sanitization', () => {
    it('strips internal reviewer notes when applicant retrieves application', async () => {
      const mockDoc = {
        _id: applicationId,
        applicantId: { toString: () => applicantId },
        reviewerNotes: 'CONFIDENTIAL INTERNAL NOTES',
        reviews: [
          {
            reviewerId,
            status: AdmissionStatus.SHORTLISTED,
            notes: 'Private reviewer comments',
            decisionReason: 'Good standing',
            reviewedAt: new Date(),
          },
        ],
        populate: vi.fn().mockReturnThis(),
      };
      (AdmissionApplication.findById as any).mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve(mockDoc),
      });

      const res: any = await AdmissionService.getApplicationById(applicationId, {
        userId: applicantId,
        roles: [UserRole.STUDENT],
      });

      expect(res.reviewerNotes).toBeUndefined();
      if (res.reviews && res.reviews.length > 0) {
        expect(res.reviews[0].notes).toBeUndefined();
        expect(res.reviews[0].decisionReason).toBe('Good standing');
      }
    });

    it('denies applicant from retrieving another applicant application', async () => {
      const otherApplicant = new Types.ObjectId().toString();
      const mockDoc = {
        _id: applicationId,
        applicantId: { toString: () => applicantId },
        populate: vi.fn().mockReturnThis(),
      };
      (AdmissionApplication.findById as any).mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve(mockDoc),
      });

      await expect(
        AdmissionService.getApplicationById(applicationId, {
          userId: otherApplicant,
          roles: [UserRole.STUDENT],
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
