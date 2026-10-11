import {
  AdmissionStatus,
  EnrollmentStatus,
  EnrollmentSource,
  PaymentStatus,
  UserRole,
  type CreateApplicationDraftDto,
  type UpdateApplicationDraftDto,
  type ReviewApplicationDto,
  type DecisionApplicationDto,
  type ConvertToStudentDto,
  type IAdmissionApplication,
  type ISafeAdmissionApplication,
} from '@eta/types';
import {
  AdmissionApplication,
  type AdmissionApplicationDocument,
  sanitizeForApplicant,
} from './admission-application.model.js';
import { Program } from '../academic/program.model.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { User } from '../users/user.model.js';
import { GuardianLink } from '../users/guardian-link.model.js';
import { NotificationDispatcher } from '../communication/notification-dispatcher.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
  PrivateFileUploadsDisabledError,
} from '../../common/errors.js';
import { getEnv } from '../../config/env.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction, AuditCategory, AuditSeverity, AuditResult, AuditActorType } from '@eta/types';

export interface ApplicationListFilter {
  status?: AdmissionStatus;
  programId?: string;
  courseId?: string;
  batchId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class AdmissionService {
  /**
   * Validates academic hierarchy consistency (program -> course -> batch)
   */
  private static async validateAcademicHierarchy(
    programId: string,
    courseId: string,
    batchId: string
  ): Promise<void> {
    const [program, course, batch] = await Promise.all([
      Program.findById(programId),
      Course.findById(courseId),
      Batch.findById(batchId),
    ]);

    if (!program) {
      throw new NotFoundError('Target Academic Program');
    }
    if (!course) {
      throw new NotFoundError('Target Course');
    }
    if (!batch) {
      throw new NotFoundError('Target Batch / Cohort');
    }

    if (course.programId && course.programId.toString() !== program._id.toString()) {
      throw new BadRequestError('Selected course does not belong to the selected program');
    }
    if (batch.courseId.toString() !== course._id.toString()) {
      throw new BadRequestError('Selected batch does not belong to the selected course');
    }
  }

  /**
   * Starts a new application or retrieves an existing draft
   */
  public static async createDraft(
    applicantId: string,
    dto: CreateApplicationDraftDto
  ): Promise<ISafeAdmissionApplication> {
    await this.validateAcademicHierarchy(dto.programId, dto.courseId, dto.batchId);

    if (!getEnv().FEATURE_PRIVATE_FILE_UPLOADS && dto.documents && dto.documents.length > 0) {
      throw new PrivateFileUploadsDisabledError(
        'Admission document uploads are disabled during the controlled beta phase.'
      );
    }

    // Check for existing application for this course & batch
    const existing = await AdmissionApplication.findOne({
      applicantId,
      courseId: dto.courseId,
      batchId: dto.batchId,
    });

    if (existing) {
      if (existing.status === AdmissionStatus.DRAFT) {
        // Update draft with incoming fields if provided
        if (dto.personalInfo) existing.personalInfo = { ...existing.personalInfo, ...dto.personalInfo };
        if (dto.education) existing.education = { ...existing.education, ...dto.education };
        if (dto.guardianInfo) existing.guardianInfo = { ...existing.guardianInfo, ...dto.guardianInfo };
        if (dto.documents) existing.documents = dto.documents as any;
        await existing.save();
        return sanitizeForApplicant(existing);
      }
      throw new ConflictError('An active application already exists for this course and batch');
    }

    // Default personal info from User profile if missing
    const user = await User.findById(applicantId);
    const personalInfo = {
      fullName: dto.personalInfo?.fullName || user?.name || '',
      email: dto.personalInfo?.email || user?.email || '',
      phone: dto.personalInfo?.phone || user?.phone || '',
      dateOfBirth: dto.personalInfo?.dateOfBirth,
      gender: dto.personalInfo?.gender,
      nationalId: dto.personalInfo?.nationalId,
      address: dto.personalInfo?.address,
    };

    const created = await AdmissionApplication.create({
      applicantId,
      programId: dto.programId,
      courseId: dto.courseId,
      batchId: dto.batchId,
      personalInfo,
      education: dto.education || { highestLevel: '', institution: '' },
      guardianInfo: dto.guardianInfo,
      documents: dto.documents || [],
      status: AdmissionStatus.DRAFT,
    });

    return sanitizeForApplicant(created);
  }

  /**
   * Updates an in-progress draft application
   */
  public static async updateDraft(
    applicantId: string,
    applicationId: string,
    dto: UpdateApplicationDraftDto
  ): Promise<ISafeAdmissionApplication> {
    const application = await AdmissionApplication.findById(applicationId);
    if (!application) {
      throw new NotFoundError('Admission Application');
    }

    if (application.applicantId.toString() !== applicantId) {
      throw new ForbiddenError('You can only modify your own admission application');
    }

    if (application.status !== AdmissionStatus.DRAFT) {
      throw new BadRequestError('Submitted applications cannot be modified by applicant');
    }

    // If targets are updated, validate consistency
    const programId = dto.programId || application.programId.toString();
    const courseId = dto.courseId || application.courseId.toString();
    const batchId = dto.batchId || application.batchId.toString();
    if (dto.programId || dto.courseId || dto.batchId) {
      await this.validateAcademicHierarchy(programId, courseId, batchId);
      application.programId = programId;
      application.courseId = courseId;
      application.batchId = batchId;
    }

    if (dto.personalInfo) {
      application.personalInfo = {
        ...application.personalInfo,
        ...dto.personalInfo,
      };
    }

    if (dto.education) {
      application.education = {
        ...application.education,
        ...dto.education,
      };
    }

    if (dto.guardianInfo) {
      application.guardianInfo = {
        ...application.guardianInfo,
        ...dto.guardianInfo,
      };
    }

    if (dto.documents) {
      if (!getEnv().FEATURE_PRIVATE_FILE_UPLOADS && dto.documents.length > 0) {
        throw new PrivateFileUploadsDisabledError(
          'Admission document uploads are disabled during the controlled beta phase.'
        );
      }
      application.documents = dto.documents as any;
    }

    await application.save();
    return sanitizeForApplicant(application);
  }

  /**
   * Submits an application (validates all mandatory PRD §42 fields)
   */
  public static async submitApplication(
    applicantId: string,
    applicationId: string,
    dto?: any
  ): Promise<ISafeAdmissionApplication> {
    const application = await AdmissionApplication.findById(applicationId);
    if (!application) {
      throw new NotFoundError('Admission Application');
    }

    if (application.applicantId.toString() !== applicantId) {
      throw new ForbiddenError('You can only submit your own admission application');
    }

    if (application.status !== AdmissionStatus.DRAFT) {
      throw new BadRequestError('Application has already been submitted or finalized');
    }

    // If incoming payload has final updates, apply them first
    if (dto?.personalInfo) application.personalInfo = { ...application.personalInfo, ...dto.personalInfo };
    if (dto?.education) application.education = { ...application.education, ...dto.education };
    if (dto?.guardianInfo) application.guardianInfo = { ...application.guardianInfo, ...dto.guardianInfo };
    if (dto?.documents) {
      if (!getEnv().FEATURE_PRIVATE_FILE_UPLOADS && dto.documents.length > 0) {
        throw new PrivateFileUploadsDisabledError(
          'Admission document uploads are disabled during the controlled beta phase.'
        );
      }
      application.documents = dto.documents;
    }

    // Validate mandatory fields
    const p = application.personalInfo;
    if (!p?.fullName || p.fullName.trim().length < 2) {
      throw new BadRequestError('Full name is required before submission');
    }
    if (!p?.email || !p.email.includes('@')) {
      throw new BadRequestError('A valid email address is required before submission');
    }
    if (!p?.phone || p.phone.trim().length < 5) {
      throw new BadRequestError('A valid phone number is required before submission');
    }

    const ed = application.education;
    if (!ed?.highestLevel || ed.highestLevel.trim().length < 1) {
      throw new BadRequestError('Highest education level is required before submission');
    }
    if (!ed?.institution || ed.institution.trim().length < 2) {
      throw new BadRequestError('Educational institution name is required before submission');
    }

    // Enforce hierarchy check one final time
    await this.validateAcademicHierarchy(
      application.programId.toString(),
      application.courseId.toString(),
      application.batchId.toString()
    );

    application.status = AdmissionStatus.SUBMITTED;
    application.submittedAt = new Date();
    await application.save();

    return sanitizeForApplicant(application);
  }

  /**
   * Returns applications belonging to the authenticated applicant
   */
  public static async getMyApplications(
    applicantId: string
  ): Promise<ISafeAdmissionApplication[]> {
    const applications = await AdmissionApplication.find({ applicantId })
      .populate('programId', 'name category status')
      .populate('courseId', 'title code level')
      .populate('batchId', 'name code startDate endDate')
      .sort({ createdAt: -1 });

    return applications.map((app) => sanitizeForApplicant(app));
  }

  /**
   * Retrieves application details by ID with strict role-based data shaping
   */
  public static async getApplicationById(
    applicationId: string,
    requestingUser: { userId: string; roles: string[] }
  ): Promise<IAdmissionApplication | ISafeAdmissionApplication> {
    const application = await AdmissionApplication.findById(applicationId)
      .populate('programId', 'name category status')
      .populate('courseId', 'title code level')
      .populate('batchId', 'name code startDate endDate')
      .populate('applicantId', 'name email avatarUrl phone');

    if (!application) {
      throw new NotFoundError('Admission Application');
    }

    const isStaffOrAdmin = requestingUser.roles.some((r) =>
      [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF].includes(r as UserRole)
    );

    if (!isStaffOrAdmin) {
      const applicantId =
        typeof application.applicantId === 'object' && (application.applicantId as any)?._id
          ? (application.applicantId as any)._id.toString()
          : application.applicantId.toString();

      if (applicantId !== requestingUser.userId) {
        throw new ForbiddenError('You are not authorized to view this application');
      }
      return sanitizeForApplicant(application);
    }

    return application.toObject() as unknown as IAdmissionApplication;
  }

  /**
   * Lists applications for admissions staff and administrators (with filtering & pagination)
   */
  public static async listApplications(filter: ApplicationListFilter) {
    const query: Record<string, any> = {};

    if (filter.status) query.status = filter.status;
    if (filter.programId) query.programId = filter.programId;
    if (filter.courseId) query.courseId = filter.courseId;
    if (filter.batchId) query.batchId = filter.batchId;

    if (filter.search) {
      const s = filter.search.trim();
      query.$or = [
        { 'personalInfo.fullName': { $regex: s, $options: 'i' } },
        { 'personalInfo.email': { $regex: s, $options: 'i' } },
        { 'personalInfo.phone': { $regex: s, $options: 'i' } },
      ];
    }

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      AdmissionApplication.countDocuments(query),
      AdmissionApplication.find(query)
        .populate('programId', 'name category status')
        .populate('courseId', 'title code level')
        .populate('batchId', 'name code startDate endDate')
        .populate('applicantId', 'name email avatarUrl')
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Reviews an application (marks UNDER_REVIEW or SHORTLISTED)
   */
  public static async reviewApplication(
    applicationId: string,
    reviewerId: string,
    dto: ReviewApplicationDto
  ): Promise<IAdmissionApplication> {
    const application = await AdmissionApplication.findById(applicationId);
    if (!application) {
      throw new NotFoundError('Admission Application');
    }

    const terminalStatuses: AdmissionStatus[] = [
      AdmissionStatus.APPROVED,
      AdmissionStatus.REJECTED,
      AdmissionStatus.ENROLLED,
      AdmissionStatus.WITHDRAWN,
    ];
    if (terminalStatuses.includes(application.status)) {
      throw new BadRequestError(
        `Cannot review an application that is already in terminal state '${application.status}'`
      );
    }

    application.status = dto.status;
    if (dto.reviewerNotes) {
      application.reviewerNotes = dto.reviewerNotes;
    }

    application.reviews = application.reviews || [];
    application.reviews.push({
      reviewerId,
      status: dto.status,
      notes: dto.reviewerNotes || undefined,
      reviewedAt: new Date(),
    });

    await application.save();
    return application.toObject() as unknown as IAdmissionApplication;
  }

  /**
   * Institutional Decision (APPROVE / REJECT / WAITLIST) — Admin authority
   */
  public static async decideApplication(
    applicationId: string,
    reviewerId: string,
    dto: DecisionApplicationDto
  ): Promise<IAdmissionApplication> {
    const application = await AdmissionApplication.findById(applicationId);
    if (!application) {
      throw new NotFoundError('Admission Application');
    }

    if (application.status === AdmissionStatus.ENROLLED) {
      throw new BadRequestError('Cannot change decision on an already enrolled application');
    }

    const previousStatus = application.status;

    let targetStatus: AdmissionStatus;
    if (dto.decision === 'APPROVED') targetStatus = AdmissionStatus.APPROVED;
    else if (dto.decision === 'REJECTED') targetStatus = AdmissionStatus.REJECTED;
    else if (dto.decision === 'WAITLISTED') targetStatus = AdmissionStatus.WAITLISTED;
    else throw new BadRequestError('Invalid decision value');

    application.status = targetStatus;
    application.decisionReason = dto.decisionReason;
    if (dto.reviewerNotes) application.reviewerNotes = dto.reviewerNotes;
    application.decisionDate = new Date();
    application.decidedBy = reviewerId;

    application.reviews = application.reviews || [];
    application.reviews.push({
      reviewerId,
      status: targetStatus,
      notes: dto.reviewerNotes || undefined,
      decisionReason: dto.decisionReason,
      reviewedAt: new Date(),
    });

    await application.save();
    const result = application.toObject() as unknown as IAdmissionApplication;

    // Side-effect: dispatch admission decision notification to applicant
    NotificationDispatcher.dispatchAdmissionStatusUpdated(result).catch((err) => {
      console.error('[AdmissionService] Notification dispatch failed:', err?.message || err);
    });

    const action = targetStatus === AdmissionStatus.APPROVED
      ? AuditAction.ADMISSION_APPLICATION_APPROVED
      : targetStatus === AdmissionStatus.REJECTED
        ? AuditAction.ADMISSION_APPLICATION_REJECTED
        : AuditAction.ADMISSION_APPLICATION_DECIDED;

    await AuditService.record({
      actor: {
        id: reviewerId,
        type: AuditActorType.USER,
      },
      action,
      category: AuditCategory.ADMISSION,
      resourceType: 'AdmissionApplication',
      resourceId: application._id.toString(),
      scope: {
        courseId: application.courseId?.toString(),
        batchId: application.batchId?.toString(),
        studentId: application.applicantId?.toString(),
      },
      previousValue: { status: previousStatus },
      newValue: {
        status: targetStatus,
        decisionReason: dto.decisionReason,
      },
      reason: dto.decisionReason,
      severity: AuditSeverity.HIGH,
      result: AuditResult.SUCCESS,
    });

    return result;
  }

  /**
   * Idempotent Student Conversion & Enrollment Generation
   */
  public static async convertToStudent(
    applicationId: string,
    reviewerId: string,
    dto?: ConvertToStudentDto
  ): Promise<{
    application: IAdmissionApplication;
    studentId: string;
    enrollmentId: string;
    alreadyEnrolled: boolean;
  }> {
    const application = await AdmissionApplication.findById(applicationId);
    if (!application) {
      throw new NotFoundError('Admission Application');
    }

    if (
      application.status !== AdmissionStatus.APPROVED &&
      application.status !== AdmissionStatus.ENROLLED
    ) {
      throw new BadRequestError('Only APPROVED applications can be converted into enrolled students');
    }

    const applicantId = application.applicantId.toString();

    // Idempotent shortcut if already enrolled
    if (
      application.status === AdmissionStatus.ENROLLED &&
      application.studentId &&
      application.enrollmentId
    ) {
      return {
        application: application.toObject() as unknown as IAdmissionApplication,
        studentId: application.studentId.toString(),
        enrollmentId: application.enrollmentId.toString(),
        alreadyEnrolled: true,
      };
    }

    // 1. Update applicant User role to include STUDENT
    const user = await User.findById(applicantId);
    if (!user) {
      throw new NotFoundError('Applicant User Account');
    }

    if (!user.roles.includes(UserRole.STUDENT)) {
      user.roles.push(UserRole.STUDENT);
      if (user.activeRole === UserRole.VISITOR) {
        user.activeRole = UserRole.STUDENT;
      }
      await user.save();
    }

    // 2. Idempotent Academic Enrollment creation
    let enrollment = await Enrollment.findOne({
      studentId: applicantId,
      batchId: application.batchId,
    });

    if (!enrollment) {
      enrollment = await Enrollment.create({
        studentId: applicantId,
        courseId: application.courseId,
        batchId: application.batchId,
        status: EnrollmentStatus.ACTIVE,
        source: EnrollmentSource.ADMISSION,
        paymentStatus: dto?.paymentStatus ?? PaymentStatus.WAIVED,
        enrollmentDate: new Date(),
      });
    }

    // 3. Link Guardian if guardian contact details were provided
    if (application.guardianInfo?.email) {
      const guardianEmail = application.guardianInfo.email.trim().toLowerCase();
      const guardianUser = await User.findOne({ email: guardianEmail });
      if (guardianUser) {
        if (!guardianUser.roles.includes(UserRole.GUARDIAN)) {
          guardianUser.roles.push(UserRole.GUARDIAN);
          await guardianUser.save();
        }

        const existingLink = await GuardianLink.findOne({
          guardianId: guardianUser._id,
          studentId: applicantId,
        });

        if (!existingLink) {
          await GuardianLink.create({
            guardianId: guardianUser._id,
            studentId: applicantId,
            relationship: application.guardianInfo.relationship || 'GUARDIAN',
            status: 'ACTIVE',
            verified: true,
            verifiedBy: reviewerId,
            verifiedAt: new Date(),
            linkedBy: reviewerId,
          });
        }
      }
    }

    // 4. Finalize application document
    application.status = AdmissionStatus.ENROLLED;
    application.studentId = applicantId;
    application.enrollmentId = enrollment._id.toString();
    application.enrolledAt = new Date();
    await application.save();

    await AuditService.record({
      actor: {
        id: reviewerId,
        type: AuditActorType.USER,
      },
      action: AuditAction.ADMISSION_STUDENT_CONVERTED,
      category: AuditCategory.ADMISSION,
      resourceType: 'AdmissionApplication',
      resourceId: application._id.toString(),
      scope: {
        courseId: application.courseId?.toString(),
        batchId: application.batchId?.toString(),
        studentId: applicantId,
      },
      newValue: {
        status: AdmissionStatus.ENROLLED,
        studentId: applicantId,
        enrollmentId: enrollment._id.toString(),
      },
      severity: AuditSeverity.HIGH,
      result: AuditResult.SUCCESS,
    });

    return {
      application: application.toObject() as unknown as IAdmissionApplication,
      studentId: applicantId,
      enrollmentId: enrollment._id.toString(),
      alreadyEnrolled: false,
    };
  }

  /**
   * Withdraw application by applicant
   */
  public static async withdrawApplication(
    applicantId: string,
    applicationId: string
  ): Promise<ISafeAdmissionApplication> {
    const application = await AdmissionApplication.findById(applicationId);
    if (!application) {
      throw new NotFoundError('Admission Application');
    }

    if (application.applicantId.toString() !== applicantId) {
      throw new ForbiddenError('You can only withdraw your own admission application');
    }

    if (application.status === AdmissionStatus.ENROLLED) {
      throw new BadRequestError('Cannot withdraw an application that is already enrolled');
    }

    application.status = AdmissionStatus.WITHDRAWN;
    await application.save();

    return sanitizeForApplicant(application);
  }
}
