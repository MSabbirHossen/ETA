import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  CertificateStatus,
  CertificateType,
  UserRole,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  type ICertificate,
  type CertificateVerificationResponse,
  type IssueCertificateDto,
  type BulkIssueCertificatesDto,
  type RevokeCertificateDto,
  type ReissueCertificateDto,
  type CertificateQuery,
  type CertificateListResponse,
  type IUser,
} from '@eta/types';
import {
  CertificateModel,
  toCertificateDTO,
  type CertificateDocument,
} from './certificate.model.js';
import { CertificateEligibilityService } from './certificate-eligibility.service.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { User } from '../users/user.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { GradeResult } from '../gradebook/grade-result.model.js';
import { GuardianLink } from '../users/guardian-link.model.js';
import { NotificationDispatcher } from '../communication/notification-dispatcher.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../common/errors.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction, AuditCategory, AuditSeverity, AuditResult, AuditActorType } from '@eta/types';
import { toValidObjectId } from '@eta/utils';

export class CertificateService {
  /**
   * Generates a unique collision-safe certificate identifier:
   * e.g., ETA-2026-CS-A8F29C1E
   */
  private static async generateUniqueCertificateNumber(courseCodeOrPrefix: string): Promise<string> {
    const year = new Date().getFullYear();
    const cleanPrefix = (courseCodeOrPrefix || 'CRS')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase();

    let attempts = 0;
    while (attempts < 10) {
      const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
      const candidate = `ETA-${year}-${cleanPrefix}-${randomPart}`;
      const existing = await CertificateModel.findOne({ certificateNumber: candidate }).lean();
      if (!existing) {
        return candidate;
      }
      attempts++;
    }
    return `ETA-${year}-${cleanPrefix}-${Date.now().toString(36).toUpperCase()}`;
  }

  /**
   * Generates a secure, unpredictable verification token
   */
  private static async generateUniqueVerificationCode(): Promise<string> {
    let attempts = 0;
    while (attempts < 10) {
      const token = `v_${crypto.randomBytes(10).toString('hex')}`;
      const existing = await CertificateModel.findOne({ verificationCode: token }).lean();
      if (!existing) {
        return token;
      }
      attempts++;
    }
    return `v_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Issue a single certificate
   */
  static async issueCertificate(
    dto: IssueCertificateDto,
    actor: IUser
  ): Promise<ICertificate> {
    const actorIdStr = (actor as any).userId || (actor as any)._id?.toString();

    // 1. Evaluate eligibility
    const eligibility = await CertificateEligibilityService.evaluateStudentEligibility(
      dto.studentId,
      dto.courseId,
      dto.batchId,
      {
        certificateType: dto.certificateType,
        allowOverride: dto.allowOverride,
        overrideReason: dto.overrideReason,
        overriddenBy: actorIdStr,
      }
    );

    if (!eligibility.eligible) {
      throw new BadRequestError(
        `Student is not eligible for certificate issuance: ${eligibility.reasons.join(' ')}`
      );
    }

    // 2. Fetch authoritative records for immutable credential snapshot
    const student = await User.findById(dto.studentId).lean();
    if (!student) throw new NotFoundError('Student');

    const course = await Course.findById(dto.courseId).lean();
    if (!course) throw new NotFoundError('Course');

    let batch = null;
    if (dto.batchId || eligibility.batchId) {
      batch = await Batch.findById(dto.batchId || eligibility.batchId).lean();
    }

    let enrollment = null;
    if (eligibility.enrollmentId) {
      enrollment = await Enrollment.findById(eligibility.enrollmentId).lean();
    }

    let gradeResult = null;
    if (eligibility.gradeResultId) {
      gradeResult = await GradeResult.findById(eligibility.gradeResultId).lean();
    }

    // 3. Generate unique identifiers
    const certNumber = await this.generateUniqueCertificateNumber(course.code || 'CRS');
    const verificationCode = await this.generateUniqueVerificationCode();

    const certType = dto.certificateType || CertificateType.COURSE_COMPLETION;
    const completionDate =
      gradeResult?.publishedAt ||
      enrollment?.updatedAt ||
      new Date();

    // 4. Build Immutable Credential Snapshot
    const credentialSnapshot = {
      studentName: student.name || 'Student',
      studentEmail: student.email,
      courseTitle: course.title,
      courseCode: course.code,
      programTitle: undefined,
      batchCode: batch?.batchCode,
      finalPercentage: gradeResult?.finalPercentage ?? 100,
      letterGrade: gradeResult?.letterGrade || 'Pass',
      gpa: gradeResult?.gpa ?? 4.0,
      completionDate: completionDate instanceof Date ? completionDate.toISOString() : new Date().toISOString(),
      issuerOrganization: 'Exploratory Training Academy',
      instructorNames: course.teacherIds?.length ? [course.teacherIds.map((t: any) => t.toString()).join(', ')] : [],
      issuedByRole: (actor as any).activeRole || 'ADMIN',
      authorizedSignatures: [
        { name: 'Dr. Katherine Vance', title: 'Director of Academic Affairs' },
        { name: 'Prof. Marcus Chen', title: 'Chair of Certification Board' },
      ],
    };

    // 5. Persist Certificate Document
    const certDoc = new CertificateModel({
      certificateNumber: certNumber,
      verificationCode,
      studentId: new mongoose.Types.ObjectId(dto.studentId),
      enrollmentId: enrollment?._id ? new mongoose.Types.ObjectId(enrollment._id) : undefined,
      courseId: new mongoose.Types.ObjectId(dto.courseId),
      batchId: batch?._id ? new mongoose.Types.ObjectId(batch._id) : undefined,
      certificateType: certType,
      title: dto.title?.trim() || `${course.title} — Certificate of Completion`,
      description: `Official digital credential awarded to ${student.name} for completing ${course.title}.`,
      issuedAt: new Date(),
      issuedBy: new mongoose.Types.ObjectId(actorIdStr),
      status: CertificateStatus.ISSUED,
      completionDate,
      grade: gradeResult?.letterGrade || 'Pass',
      gpa: gradeResult?.gpa,
      credentialSnapshot,
      pdfUrl: `/api/v1/certificates/artifact/${verificationCode}.pdf`,
      metadata: {
        isOverridden: eligibility.isOverridden,
        overrideReason: eligibility.overrideReason,
        overriddenBy: eligibility.overriddenBy,
      },
    });

    await certDoc.save();

    // 6. Asynchronous Notification Side Effect
    try {
      await NotificationDispatcher.dispatch({
        type: NotificationType.CERTIFICATE_ISSUED,
        category: NotificationCategory.CERTIFICATE,
        priority: NotificationPriority.IMPORTANT,
        recipientUserIds: [dto.studentId],
        title: `Certificate Issued: ${certDoc.title}`,
        body: `Congratulations! Your official certificate for "${course.title}" has been issued.`,
        actionUrl: '/student/certificates',
        metadata: {
          certificateId: certDoc._id.toString(),
          certificateNumber: certDoc.certificateNumber,
          verificationCode: certDoc.verificationCode,
        },
      });
    } catch (err) {
      console.error('Failed to dispatch certificate notification:', err);
    }

    await AuditService.record({
      actor: {
        id: actorIdStr,
        name: (actor as any).name,
        email: (actor as any).email,
        role: (actor as any).activeRole || (actor as any).roles?.[0],
        type: AuditActorType.USER,
      },
      action: AuditAction.CERTIFICATE_ISSUED,
      category: AuditCategory.CERTIFICATE,
      resourceType: 'Certificate',
      resourceId: certDoc._id.toString(),
      scope: {
        studentId: dto.studentId,
        courseId: dto.courseId,
        batchId: dto.batchId,
      },
      newValue: {
        certificateNumber: certDoc.certificateNumber,
        title: certDoc.title,
        certificateType: certDoc.certificateType,
        status: certDoc.status,
      },
      severity: AuditSeverity.HIGH,
      result: AuditResult.SUCCESS,
    });

    return toCertificateDTO(certDoc);
  }

  /**
   * Bulk issue certificates for a course or batch
   */
  static async bulkIssueCertificates(
    dto: BulkIssueCertificatesDto,
    actor: IUser
  ): Promise<{
    issuedCount: number;
    failedCount: number;
    issued: ICertificate[];
    skipped: Array<{ studentId: string; reason: string }>;
  }> {
    // 1. Fetch eligible candidate students
    let targetStudentIds = dto.studentIds;
    if (!targetStudentIds || targetStudentIds.length === 0) {
      const enrollmentsQuery: Record<string, any> = {
        courseId: new mongoose.Types.ObjectId(dto.courseId),
      };
      if (dto.batchId) {
        enrollmentsQuery.batchId = new mongoose.Types.ObjectId(dto.batchId);
      }
      const enrollments = await Enrollment.find(enrollmentsQuery).lean();
      targetStudentIds = enrollments.map((e) => e.studentId.toString());
    }

    const issued: ICertificate[] = [];
    const skipped: Array<{ studentId: string; reason: string }> = [];

    for (const sId of targetStudentIds) {
      try {
        const cert = await this.issueCertificate(
          {
            studentId: sId,
            courseId: dto.courseId,
            batchId: dto.batchId,
            certificateType: dto.certificateType,
            title: dto.title,
            allowOverride: false,
          },
          actor
        );
        issued.push(cert);
      } catch (err: any) {
        if (dto.skipIneligible) {
          skipped.push({ studentId: sId, reason: err.message || 'Ineligible' });
        } else {
          throw err;
        }
      }
    }

    return {
      issuedCount: issued.length,
      failedCount: skipped.length,
      issued,
      skipped,
    };
  }

  /**
   * Public credential verification
   * Exposes only safe fields without private personal data.
   */
  static async verifyCertificate(identifier: string): Promise<CertificateVerificationResponse> {
    const cleanId = identifier.trim();

    // Support verification by verificationCode, certificateNumber, or MongoDB ObjectId
    const query: Record<string, any> = {
      $or: [
        { verificationCode: cleanId },
        { certificateNumber: cleanId.toUpperCase() },
      ],
    };

    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      query.$or.push({ _id: new mongoose.Types.ObjectId(cleanId) });
    }

    const cert = await CertificateModel.findOne(query).lean();
    if (!cert) {
      throw new NotFoundError('Certificate not found or verification code is invalid');
    }

    const isRevoked = cert.status === CertificateStatus.REVOKED;
    const isReplaced = cert.status === CertificateStatus.REPLACED;
    const isValid = cert.status === CertificateStatus.ISSUED;

    let replacementNumber = null;
    if (cert.replacedByCertificateId) {
      const replacement = await CertificateModel.findById(cert.replacedByCertificateId).lean();
      if (replacement) replacementNumber = replacement.certificateNumber;
    }

    return {
      valid: isValid,
      status: cert.status,
      certificateNumber: cert.certificateNumber,
      verificationCode: cert.verificationCode,
      studentName: cert.credentialSnapshot.studentName,
      courseTitle: cert.credentialSnapshot.courseTitle,
      programTitle: cert.credentialSnapshot.programTitle,
      certificateType: cert.certificateType,
      title: cert.title,
      issuedAt: cert.issuedAt.toISOString(),
      completionDate: cert.completionDate ? cert.completionDate.toISOString() : cert.issuedAt.toISOString(),
      issuerOrganization: cert.credentialSnapshot.issuerOrganization || 'Exploratory Training Academy',
      letterGrade: cert.grade,
      gpa: cert.gpa,
      isRevoked,
      revokedAt: cert.revokedAt ? cert.revokedAt.toISOString() : null,
      revocationReason: isRevoked ? cert.revocationReason : null,
      isReplaced,
      replacementCertificateNumber: replacementNumber,
      verificationUrl: `/certificate/verify/${cert.verificationCode}`,
    };
  }

  /**
   * Revoke a certificate
   */
  static async revokeCertificate(
    certificateId: string,
    dto: RevokeCertificateDto,
    actor: IUser
  ): Promise<ICertificate> {
    const actorIdStr = (actor as any).userId || (actor as any)._id?.toString();

    const cert = await CertificateModel.findById(certificateId);
    if (!cert) throw new NotFoundError('Certificate');

    if (cert.status === CertificateStatus.REVOKED) {
      throw new BadRequestError('Certificate is already revoked');
    }

    cert.status = CertificateStatus.REVOKED;
    cert.revokedAt = new Date();
    cert.revokedBy = new mongoose.Types.ObjectId(actorIdStr);
    cert.revocationReason = dto.reason.trim();
    await cert.save();

    await AuditService.record({
      actor: {
        id: actorIdStr,
        name: (actor as any).name,
        email: (actor as any).email,
        role: (actor as any).activeRole || (actor as any).roles?.[0],
        type: AuditActorType.USER,
      },
      action: AuditAction.CERTIFICATE_REVOKED,
      category: AuditCategory.CERTIFICATE,
      resourceType: 'Certificate',
      resourceId: cert._id.toString(),
      scope: {
        studentId: cert.studentId?.toString(),
        courseId: cert.courseId?.toString(),
        batchId: cert.batchId?.toString(),
      },
      previousValue: {
        status: CertificateStatus.ISSUED,
      },
      newValue: {
        status: CertificateStatus.REVOKED,
        certificateNumber: cert.certificateNumber,
      },
      reason: dto.reason.trim(),
      severity: AuditSeverity.CRITICAL,
      result: AuditResult.SUCCESS,
    });

    return toCertificateDTO(cert);
  }

  /**
   * Reissue / replace an existing certificate
   */
  static async reissueCertificate(
    certificateId: string,
    dto: ReissueCertificateDto,
    actor: IUser
  ): Promise<ICertificate> {
    const actorIdStr = (actor as any).userId || (actor as any)._id?.toString();

    const oldCert = await CertificateModel.findById(certificateId);
    if (!oldCert) throw new NotFoundError('Certificate');

    // Issue new replacement certificate
    const newCertDto: IssueCertificateDto = {
      studentId: oldCert.studentId.toString(),
      courseId: oldCert.courseId.toString(),
      batchId: oldCert.batchId?.toString(),
      certificateType: dto.certificateType || oldCert.certificateType,
      title: dto.title || oldCert.title,
      allowOverride: true,
      overrideReason: `Reissuance replacement for ${oldCert.certificateNumber}: ${dto.reason.trim()}`,
    };

    const newCert = await this.issueCertificate(newCertDto, actor);

    // Link old certificate to new certificate
    oldCert.status = CertificateStatus.REPLACED;
    if (mongoose.Types.ObjectId.isValid(newCert.id)) {
      oldCert.replacedByCertificateId = new mongoose.Types.ObjectId(newCert.id);
    }
    oldCert.revokedAt = new Date();
    if (mongoose.Types.ObjectId.isValid(actorIdStr)) {
      oldCert.revokedBy = new mongoose.Types.ObjectId(actorIdStr);
    }
    oldCert.revocationReason = `Replaced by ${newCert.certificateNumber}: ${dto.reason.trim()}`;
    await oldCert.save();

    // Link new certificate back to old certificate
    if (mongoose.Types.ObjectId.isValid(newCert.id)) {
      await CertificateModel.findByIdAndUpdate(newCert.id, {
        replacesCertificateId: oldCert._id,
      });
    }

    await AuditService.record({
      actor: {
        id: actorIdStr,
        name: (actor as any).name,
        email: (actor as any).email,
        role: (actor as any).activeRole || (actor as any).roles?.[0],
        type: AuditActorType.USER,
      },
      action: AuditAction.CERTIFICATE_REISSUED,
      category: AuditCategory.CERTIFICATE,
      resourceType: 'Certificate',
      resourceId: oldCert._id.toString(),
      scope: {
        studentId: oldCert.studentId?.toString(),
        courseId: oldCert.courseId?.toString(),
        batchId: oldCert.batchId?.toString(),
      },
      previousValue: {
        certificateNumber: oldCert.certificateNumber,
        status: CertificateStatus.ISSUED,
      },
      newValue: {
        replacedByCertificateId: newCert.id,
        status: CertificateStatus.REPLACED,
      },
      reason: dto.reason.trim(),
      severity: AuditSeverity.HIGH,
      result: AuditResult.SUCCESS,
    });

    const updatedNewCert = mongoose.Types.ObjectId.isValid(newCert.id)
      ? await CertificateModel.findById(newCert.id)
      : null;
    return updatedNewCert ? toCertificateDTO(updatedNewCert) : newCert;
  }

  /**
   * Student certificate retrieval
   */
  static async getStudentCertificates(
    targetStudentId: string,
    actorId: string,
    actorRole: UserRole
  ): Promise<ICertificate[]> {
    if (mongoose.connection.readyState !== 1) {
      if (process.env.NODE_ENV === 'development') {
        return [];
      }
    }

    const validStudentId = toValidObjectId(targetStudentId);
    const validActorId = toValidObjectId(actorId);

    // Check authorization: Student self or verified active Guardian
    if (actorRole === UserRole.STUDENT) {
      if (validStudentId !== validActorId) {
        throw new ForbiddenError('Students may only access their own certificates');
      }
    } else if (actorRole === UserRole.GUARDIAN) {
      const link = await GuardianLink.findOne({
        guardianId: new mongoose.Types.ObjectId(validActorId),
        studentId: new mongoose.Types.ObjectId(validStudentId),
        status: 'ACTIVE',
        verified: true,
      }).lean();
      if (!link) {
        throw new ForbiddenError('Guardian is not authorized to view this student credentials');
      }
    } else if (![UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER].includes(actorRole)) {
      throw new ForbiddenError('Unauthorized to access certificates');
    }

    const certs = await CertificateModel.find({
      studentId: new mongoose.Types.ObjectId(validStudentId),
    })
      .sort({ issuedAt: -1 })
      .lean();

    return certs.map(toCertificateDTO);
  }

  /**
   * Retrieve certificate by ID with strict actor access verification
   */
  static async getCertificateById(
    certificateId: string,
    actorId: string,
    actorRole: UserRole
  ): Promise<ICertificate> {
    const cert = await CertificateModel.findById(certificateId).lean();
    if (!cert) throw new NotFoundError('Certificate');

    const sId = cert.studentId.toString();

    // Verify actor access
    if (actorRole === UserRole.STUDENT) {
      if (sId !== actorId) {
        throw new ForbiddenError('Access denied: You do not own this certificate');
      }
    } else if (actorRole === UserRole.GUARDIAN) {
      const link = await GuardianLink.findOne({
        guardianId: new mongoose.Types.ObjectId(actorId),
        studentId: new mongoose.Types.ObjectId(sId),
        status: 'ACTIVE',
        verified: true,
      }).lean();
      if (!link) {
        throw new ForbiddenError('Access denied: Guardian link not verified for this student');
      }
    } else if (actorRole === UserRole.TEACHER) {
      // Check if teacher instructed this course or batch
      const course = await Course.findById(cert.courseId).lean();
      const batch = cert.batchId ? await Batch.findById(cert.batchId).lean() : null;
      const isInstructing =
        (course?.teacherIds && course.teacherIds.some((id: any) => id.toString() === actorId)) ||
        (batch && batch.teacherIds?.some((id: any) => id.toString() === actorId));

      if (!isInstructing) {
        throw new ForbiddenError('Access denied: You are not an instructor for this course');
      }
    }

    return toCertificateDTO(cert);
  }

  /**
   * Admin certificate query with filtering and pagination
   */
  static async listCertificates(
    query: CertificateQuery
  ): Promise<CertificateListResponse> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, query.limit || 20);

    if (mongoose.connection.readyState !== 1) {
      if (process.env.NODE_ENV === 'development') {
        return {
          certificates: [],
          total: 0,
          page,
          limit,
          pages: 0,
        };
      }
    }

    const filter: Record<string, any> = {};

    if (query.studentId) {
      filter.studentId = new mongoose.Types.ObjectId(query.studentId);
    }
    if (query.courseId) {
      filter.courseId = new mongoose.Types.ObjectId(query.courseId);
    }
    if (query.batchId) {
      filter.batchId = new mongoose.Types.ObjectId(query.batchId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.certificateType) {
      filter.certificateType = query.certificateType;
    }
    if (query.search) {
      filter.$or = [
        { certificateNumber: { $regex: query.search.trim(), $options: 'i' } },
        { title: { $regex: query.search.trim(), $options: 'i' } },
        { 'credentialSnapshot.studentName': { $regex: query.search.trim(), $options: 'i' } },
        { 'credentialSnapshot.courseTitle': { $regex: query.search.trim(), $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [certs, total] = await Promise.all([
      CertificateModel.find(filter)
        .sort({ issuedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CertificateModel.countDocuments(filter),
    ]);

    return {
      certificates: certs.map(toCertificateDTO),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}
