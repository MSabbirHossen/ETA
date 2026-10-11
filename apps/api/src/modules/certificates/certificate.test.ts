import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import {
  UserRole,
  CertificateType,
  CertificateStatus,
  EnrollmentStatus,
  GradePublicationStatus,
  PaymentStatus,
  type IUser,
} from '@eta/types';
import { CertificateService } from './certificate.service.js';
import { CertificateEligibilityService } from './certificate-eligibility.service.js';
import { CertificateGeneratorService } from './certificate-generator.service.js';
import { CertificateModel } from './certificate.model.js';
import { User } from '../users/user.model.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { GradeResult } from '../gradebook/grade-result.model.js';
import { GuardianLink } from '../users/guardian-link.model.js';
import { AttendanceService } from '../attendance/attendance.service.js';
import { NotificationDispatcher } from '../communication/notification-dispatcher.js';
import { FinanceService } from '../finance/finance.service.js';

vi.mock('./certificate.model', () => {
  const mockCertDoc: any = function (data: any) {
    Object.assign(this, data);
    this._id = new mongoose.Types.ObjectId();
    this.save = vi.fn().mockResolvedValue(this);
  };
  mockCertDoc.find = vi.fn();
  mockCertDoc.findById = vi.fn();
  mockCertDoc.findOne = vi.fn();
  mockCertDoc.countDocuments = vi.fn();
  mockCertDoc.findByIdAndUpdate = vi.fn();
  return {
    CertificateModel: mockCertDoc,
    toCertificateDTO: vi.fn((doc) => ({
      id: doc._id?.toString() || doc.id || 'cert-1',
      certificateNumber: doc.certificateNumber || 'ETA-2026-CS-TEST1234',
      verificationCode: doc.verificationCode || 'v_test1234567890',
      studentId: doc.studentId?.toString() || 'student-1',
      courseId: doc.courseId?.toString() || 'course-1',
      certificateType: doc.certificateType || 'COURSE_COMPLETION',
      title: doc.title || 'Certificate of Completion',
      issuedAt: new Date().toISOString(),
      issuedBy: doc.issuedBy?.toString() || 'admin-1',
      status: doc.status || 'ISSUED',
      completionDate: new Date().toISOString(),
      grade: doc.grade || 'A',
      gpa: doc.gpa || 4.0,
      credentialSnapshot: doc.credentialSnapshot || {
        studentName: 'Alice Student',
        courseTitle: 'Introduction to Computer Science',
        finalPercentage: 95,
        letterGrade: 'A',
        gpa: 4.0,
        completionDate: new Date().toISOString(),
        issuerOrganization: 'Exploratory Training Academy',
      },
      pdfUrl: doc.pdfUrl,
      revokedAt: doc.revokedAt,
      revokedBy: doc.revokedBy?.toString(),
      revocationReason: doc.revocationReason,
      replacesCertificateId: doc.replacesCertificateId?.toString(),
      replacedByCertificateId: doc.replacedByCertificateId?.toString(),
      metadata: doc.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  };
});

vi.mock('../users/user.model', () => ({
  User: {
    findById: vi.fn(),
  },
}));

vi.mock('../academic/course.model', () => ({
  Course: {
    findById: vi.fn(),
  },
}));

vi.mock('../academic/batch.model', () => ({
  Batch: {
    findById: vi.fn(),
  },
}));

vi.mock('../academic/enrollment.model', () => {
  const mockEnrollment: any = {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
  };
  return { Enrollment: mockEnrollment };
});

vi.mock('../gradebook/grade-result.model', () => {
  const mockGradeResult: any = {
    findById: vi.fn(),
    findOne: vi.fn(),
  };
  return { GradeResult: mockGradeResult };
});

vi.mock('../users/guardian-link.model', () => ({
  GuardianLink: {
    findOne: vi.fn(),
  },
}));

vi.mock('../attendance/attendance.service', () => ({
  AttendanceService: {
    getStudentAttendance: vi.fn(),
  },
}));

vi.mock('../communication/notification-dispatcher', () => ({
  NotificationDispatcher: {
    dispatch: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock('../finance/finance.service', () => ({
  FinanceService: {
    checkStudentTuitionClearance: vi.fn().mockResolvedValue({
      cleared: true,
      totalOutstandingMinor: 0,
      currency: 'USD',
      unpaidInvoices: [],
      reasons: [],
    }),
  },
}));

describe('Phase 9 Certificates & Digital Credentials Engine', () => {
  const studentId = new mongoose.Types.ObjectId().toString();
  const courseId = new mongoose.Types.ObjectId().toString();
  const batchId = new mongoose.Types.ObjectId().toString();
  const adminId = new mongoose.Types.ObjectId().toString();
  const guardianId = new mongoose.Types.ObjectId().toString();

  const mockAdminUser: IUser = {
    _id: adminId,
    email: 'admin@eta.edu',
    name: 'Admin Director',
    roles: [UserRole.ADMIN],
    activeRole: UserRole.ADMIN,
    status: 'ACTIVE' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStudentUser: IUser = {
    _id: studentId,
    email: 'alice@student.eta.edu',
    name: 'Alice Student',
    roles: [UserRole.STUDENT],
    activeRole: UserRole.STUDENT,
    status: 'ACTIVE' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Certificate Eligibility Service', () => {
    it('evaluates student as eligible when enrollment is active, grades are published and passing, and attendance is met', async () => {
      (User.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: studentId, name: 'Alice Student' }),
      });
      (Course.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: courseId, title: 'Web Architecture', code: 'CS101' }),
      });
      (Batch.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: batchId, batchCode: 'B-2026-01' }),
      });
      (Enrollment.findOne as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: new mongoose.Types.ObjectId(),
            status: EnrollmentStatus.COMPLETED,
            paymentStatus: PaymentStatus.PAID,
            progress: { completionPercentage: 90 },
          }),
        }),
      });
      (GradeResult.findOne as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: new mongoose.Types.ObjectId(),
            publicationStatus: GradePublicationStatus.PUBLISHED,
            isPassed: true,
            letterGrade: 'A',
            gpa: 4.0,
            finalPercentage: 92,
          }),
        }),
      });
      (AttendanceService.getStudentAttendance as any).mockResolvedValue({
        summary: { totalClasses: 10, attendancePercentage: 85 },
      });
      (CertificateModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      const result = await CertificateEligibilityService.evaluateStudentEligibility(
        studentId,
        courseId,
        batchId
      );

      expect(result.eligible).toBe(true);
      expect(result.grade).toBe('A');
      expect(result.gpa).toBe(4.0);
      expect(result.reasons).toHaveLength(0);
    });

    it('rejects eligibility if grade result is in provisional DRAFT status (PRD §48)', async () => {
      (User.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: studentId, name: 'Alice Student' }),
      });
      (Course.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: courseId, title: 'Web Architecture', code: 'CS101' }),
      });
      (Enrollment.findOne as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            status: EnrollmentStatus.ACTIVE,
            paymentStatus: PaymentStatus.PAID,
            progress: { completionPercentage: 85 },
          }),
        }),
      });
      (GradeResult.findOne as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            publicationStatus: GradePublicationStatus.DRAFT, // Provisional!
            isPassed: true,
            letterGrade: 'A',
          }),
        }),
      });
      (CertificateModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      const result = await CertificateEligibilityService.evaluateStudentEligibility(
        studentId,
        courseId
      );

      expect(result.eligible).toBe(false);
      expect(result.reasons.some((r) => r.includes('DRAFT'))).toBe(true);
    });

    it('rejects eligibility if student failed the course (isPassed === false)', async () => {
      (User.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: studentId, name: 'Bob Student' }),
      });
      (Course.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: courseId, title: 'Algorithms', code: 'CS201' }),
      });
      (Enrollment.findOne as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            status: EnrollmentStatus.ACTIVE,
            paymentStatus: PaymentStatus.PAID,
            progress: { completionPercentage: 80 },
          }),
        }),
      });
      (GradeResult.findOne as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            publicationStatus: GradePublicationStatus.PUBLISHED,
            isPassed: false,
            letterGrade: 'F',
          }),
        }),
      });
      (CertificateModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      const result = await CertificateEligibilityService.evaluateStudentEligibility(
        studentId,
        courseId
      );

      expect(result.eligible).toBe(false);
      expect(result.reasons.some((r) => r.includes('did not pass'))).toBe(true);
    });

    it('rejects eligibility if an active certificate is already issued for that course', async () => {
      (User.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: studentId, name: 'Alice Student' }),
      });
      (Course.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: courseId, title: 'Web Architecture', code: 'CS101' }),
      });
      (Enrollment.findOne as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            status: EnrollmentStatus.COMPLETED,
            paymentStatus: PaymentStatus.PAID,
            progress: { completionPercentage: 100 },
          }),
        }),
      });
      (GradeResult.findOne as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            publicationStatus: GradePublicationStatus.PUBLISHED,
            isPassed: true,
            letterGrade: 'A',
          }),
        }),
      });
      // Active certificate exists
      (CertificateModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          certificateNumber: 'ETA-2026-CS-EXISTING',
          status: CertificateStatus.ISSUED,
          issuedAt: new Date(),
        }),
      });

      const result = await CertificateEligibilityService.evaluateStudentEligibility(
        studentId,
        courseId
      );

      expect(result.eligible).toBe(false);
      expect(result.reasons.some((r) => r.includes('already issued'))).toBe(true);
    });

    it('rejects eligibility if student has outstanding unpaid tuition in Finance module (PRD §50)', async () => {
      (User.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: studentId, name: 'Alice Student' }),
      });
      (Course.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: courseId, title: 'Web Architecture', code: 'CS101' }),
      });
      (Enrollment.findOne as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            status: EnrollmentStatus.COMPLETED,
            paymentStatus: PaymentStatus.PAID,
            progress: { completionPercentage: 100 },
          }),
        }),
      });
      (GradeResult.findOne as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            publicationStatus: GradePublicationStatus.PUBLISHED,
            isPassed: true,
            letterGrade: 'A',
          }),
        }),
      });
      (CertificateModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      // Finance indicates outstanding unpaid invoice
      vi.spyOn(FinanceService, 'checkStudentTuitionClearance').mockResolvedValueOnce({
        cleared: false,
        totalOutstandingMinor: 15000,
        currency: 'USD',
        unpaidInvoices: [{ invoiceNumber: 'INV-2026-001', balanceMinor: 15000, status: 'unpaid' as any }],
        reasons: ['Invoice INV-2026-001 has outstanding balance of USD 150.00 (unpaid).'],
      });

      const result = await CertificateEligibilityService.evaluateStudentEligibility(
        studentId,
        courseId
      );

      expect(result.eligible).toBe(false);
      expect(result.reasons.some((r) => r.includes('INV-2026-001'))).toBe(true);
    });
  });

  describe('Certificate Issuance & Snapshot Integrity', () => {
    it('issues certificate from verified records, creates immutable snapshot, and dispatches notification', async () => {
      // Mock eligibility
      vi.spyOn(CertificateEligibilityService, 'evaluateStudentEligibility').mockResolvedValue({
        eligible: true,
        studentId,
        courseId,
        factors: [],
        reasons: [],
        grade: 'A',
        gpa: 3.9,
      });

      (User.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: studentId, name: 'Alice Verified', email: 'alice@eta.edu' }),
      });
      (Course.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: courseId, title: 'Cloud Engineering', code: 'CLOUD' }),
      });
      (Batch.findById as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: batchId, batchCode: 'B-2026-01' }),
      });
      (CertificateModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      const cert = await CertificateService.issueCertificate(
        {
          studentId,
          courseId,
          batchId,
          certificateType: CertificateType.COURSE_COMPLETION,
        },
        mockAdminUser
      );

      expect(cert).toBeDefined();
      expect(cert.status).toBe(CertificateStatus.ISSUED);
      expect(NotificationDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CERTIFICATE_ISSUED',
          recipientUserIds: [studentId],
        })
      );
    });

    it('prevents unauthorized issuance when student is ineligible and override is false', async () => {
      vi.spyOn(CertificateEligibilityService, 'evaluateStudentEligibility').mockResolvedValue({
        eligible: false,
        studentId,
        courseId,
        factors: [],
        reasons: ['Final course examination not published.'],
      });

      await expect(
        CertificateService.issueCertificate(
          { studentId, courseId, allowOverride: false },
          mockAdminUser
        )
      ).rejects.toThrow('Student is not eligible for certificate issuance');
    });
  });

  describe('Public Verification Endpoint (PRD §49)', () => {
    it('verifies valid certificate and does not expose private sensitive identity data', async () => {
      const mockCert = {
        _id: new mongoose.Types.ObjectId(),
        certificateNumber: 'ETA-2026-CLOUD-99AA',
        verificationCode: 'v_secret1234567890',
        status: CertificateStatus.ISSUED,
        title: 'Cloud Engineering — Certificate of Completion',
        certificateType: CertificateType.COURSE_COMPLETION,
        issuedAt: new Date('2026-05-15'),
        completionDate: new Date('2026-05-10'),
        grade: 'A',
        gpa: 4.0,
        credentialSnapshot: {
          studentName: 'Alice Verified',
          studentEmail: 'private_alice@secret.com', // MUST NOT be exposed!
          courseTitle: 'Cloud Engineering',
          issuerOrganization: 'Exploratory Training Academy',
        },
      };

      (CertificateModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockCert),
      });

      const response = await CertificateService.verifyCertificate('v_secret1234567890');

      expect(response.valid).toBe(true);
      expect(response.studentName).toBe('Alice Verified');
      expect(response.courseTitle).toBe('Cloud Engineering');
      expect(response.issuerOrganization).toBe('Exploratory Training Academy');
      expect(response.status).toBe(CertificateStatus.ISSUED);
      // Ensure private email / student IDs are omitted from public payload
      expect((response as any).studentEmail).toBeUndefined();
      expect((response as any).studentId).toBeUndefined();
      expect((response as any)._id).toBeUndefined();
    });

    it('reports revoked status accurately for revoked certificate', async () => {
      const mockRevokedCert = {
        _id: new mongoose.Types.ObjectId(),
        certificateNumber: 'ETA-2026-REVOKED-11',
        verificationCode: 'v_revoked1234',
        status: CertificateStatus.REVOKED,
        title: 'Revoked Certificate',
        certificateType: CertificateType.COURSE_COMPLETION,
        issuedAt: new Date(),
        revokedAt: new Date(),
        revocationReason: 'Academic integrity breach',
        credentialSnapshot: {
          studentName: 'Dishonest Student',
          courseTitle: 'Ethics',
          issuerOrganization: 'Exploratory Training Academy',
        },
      };

      (CertificateModel.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockRevokedCert),
      });

      const response = await CertificateService.verifyCertificate('v_revoked1234');

      expect(response.valid).toBe(false);
      expect(response.isRevoked).toBe(true);
      expect(response.status).toBe(CertificateStatus.REVOKED);
      expect(response.revocationReason).toBe('Academic integrity breach');
    });
  });

  describe('Revocation & Reissue Lifecycle', () => {
    it('revokes certificate and records revocation audit fields', async () => {
      const certId = new mongoose.Types.ObjectId().toString();
      const mockDoc = {
        _id: new mongoose.Types.ObjectId(certId),
        certificateNumber: 'ETA-2026-CS-REVOKE',
        status: CertificateStatus.ISSUED,
        save: vi.fn().mockResolvedValue(true),
      };

      (CertificateModel.findById as any).mockResolvedValue(mockDoc);

      const revoked = await CertificateService.revokeCertificate(
        certId,
        { reason: 'Administrative error in student name' },
        mockAdminUser
      );

      expect(mockDoc.status).toBe(CertificateStatus.REVOKED);
      expect(mockDoc.revocationReason).toBe('Administrative error in student name');
      expect(mockDoc.save).toHaveBeenCalled();
    });

    it('reissues certificate by replacing previous credential and maintaining audit link', async () => {
      const certId = new mongoose.Types.ObjectId().toString();
      const oldDoc = {
        _id: new mongoose.Types.ObjectId(certId),
        certificateNumber: 'ETA-2026-CS-OLD',
        studentId: new mongoose.Types.ObjectId(studentId),
        courseId: new mongoose.Types.ObjectId(courseId),
        status: CertificateStatus.ISSUED,
        certificateType: CertificateType.COURSE_COMPLETION,
        title: 'Old Title',
        save: vi.fn().mockResolvedValue(true),
      };

      (CertificateModel.findById as any).mockResolvedValue(oldDoc);
      const newCertId = new mongoose.Types.ObjectId().toString();
      vi.spyOn(CertificateService, 'issueCertificate').mockResolvedValue({
        id: newCertId,
        certificateNumber: 'ETA-2026-CS-NEW',
        verificationCode: 'v_new99',
        studentId,
        courseId,
        certificateType: CertificateType.COURSE_COMPLETION,
        title: 'Old Title',
        issuedAt: new Date().toISOString(),
        issuedBy: adminId,
        status: CertificateStatus.ISSUED,
        completionDate: new Date().toISOString(),
        credentialSnapshot: {} as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const reissued = await CertificateService.reissueCertificate(
        certId,
        { reason: 'Corrected typo in honors designation' },
        mockAdminUser
      );

      expect(oldDoc.status).toBe(CertificateStatus.REPLACED);
      expect(oldDoc.save).toHaveBeenCalled();
      expect(CertificateModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('Guardian & Student Authorization', () => {
    it('allows verified active guardian to access child certificate', async () => {
      (GuardianLink.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          guardianId: new mongoose.Types.ObjectId(guardianId),
          studentId: new mongoose.Types.ObjectId(studentId),
          status: 'ACTIVE',
          verified: true,
        }),
      });
      (CertificateModel.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: new mongoose.Types.ObjectId(),
              certificateNumber: 'ETA-2026-CS-CHILD',
              status: CertificateStatus.ISSUED,
              studentId: new mongoose.Types.ObjectId(studentId),
              credentialSnapshot: { studentName: 'Alice Child' },
            },
          ]),
        }),
      });

      const certs = await CertificateService.getStudentCertificates(
        studentId,
        guardianId,
        UserRole.GUARDIAN
      );

      expect(certs).toHaveLength(1);
    });

    it('rejects student attempting to access another student certificates (IDOR)', async () => {
      const otherStudentId = new mongoose.Types.ObjectId().toString();

      await expect(
        CertificateService.getStudentCertificates(
          otherStudentId,
          studentId,
          UserRole.STUDENT
        )
      ).rejects.toThrow('Students may only access their own certificates');
    });
  });

  describe('Digital Artifact Rendering', () => {
    it('generates compliant SVG and PDF artifacts with official ETA brand tokens', () => {
      const sampleCert: any = {
        certificateNumber: 'ETA-2026-WEB-12345678',
        verificationCode: 'v_abc123',
        issuedAt: new Date(),
        credentialSnapshot: {
          studentName: 'Alice Explorer',
          courseTitle: 'Full-Stack Engineering',
          letterGrade: 'A+',
          gpa: 4.0,
          issuerOrganization: 'Exploratory Training Academy',
        },
      };

      const svg = CertificateGeneratorService.generateSVG(sampleCert);
      expect(svg).toContain('EXPLORATORY TRAINING ACADEMY');
      expect(svg).toContain('Alice Explorer');
      expect(svg).toContain('ETA-2026-WEB-12345678');
      expect(svg).toContain('#073C84'); // Brand Navy token
      expect(svg).toContain('#16C4FF'); // Brand Cyan token

      const pdf = CertificateGeneratorService.generatePDFBuffer(sampleCert);
      expect(Buffer.isBuffer(pdf)).toBe(true);
      expect(pdf.toString('utf-8', 0, 8)).toContain('%PDF-1.4');
    });
  });
});
