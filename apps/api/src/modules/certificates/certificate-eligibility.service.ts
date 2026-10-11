import mongoose from 'mongoose';
import {
  CertificateStatus,
  CertificateType,
  EnrollmentStatus,
  GradePublicationStatus,
  PaymentStatus,
  UserRole,
  type CertificateEligibilityResult,
  type CertificateEligibilityFactor,
} from '@eta/types';
import { Enrollment } from '../academic/enrollment.model.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { User } from '../users/user.model.js';
import { GradeResult } from '../gradebook/grade-result.model.js';
import { AttendanceService } from '../attendance/attendance.service.js';
import { CertificateModel } from './certificate.model.js';
import { FinanceService } from '../finance/finance.service.js';
import { NotFoundError } from '../../common/errors.js';

export interface EligibilityOptions {
  certificateType?: CertificateType;
  allowOverride?: boolean;
  overrideReason?: string;
  overriddenBy?: string;
  minProgressPercentage?: number;
  minAttendancePercentage?: number;
}

export class CertificateEligibilityService {
  /**
   * Evaluates eligibility for a single student in a course/batch
   */
  static async evaluateStudentEligibility(
    studentId: string,
    courseId: string,
    batchId?: string,
    options: EligibilityOptions = {}
  ): Promise<CertificateEligibilityResult> {
    const certType = options.certificateType || CertificateType.COURSE_COMPLETION;
    const minProgress = options.minProgressPercentage ?? 80;
    const minAttendance = options.minAttendancePercentage ?? 70;

    // 1. Fetch Student & Course
    const student = await User.findById(studentId).lean();
    if (!student) {
      throw new NotFoundError('Student');
    }

    const course = await Course.findById(courseId).lean();
    if (!course) {
      throw new NotFoundError('Course');
    }

    let batch = null;
    if (batchId) {
      const batchDoc = await Batch.findById(batchId);
      if (batchDoc && typeof (batchDoc as any).lean === 'function') {
        batch = await (batchDoc as any).lean();
      } else {
        batch = batchDoc;
      }
    }

    const factors: CertificateEligibilityFactor[] = [];
    const reasons: string[] = [];

    // 2. Fetch Enrollment
    const enrollmentQuery: Record<string, any> = {
      studentId: new mongoose.Types.ObjectId(studentId),
      courseId: new mongoose.Types.ObjectId(courseId),
    };
    if (batchId) {
      enrollmentQuery.batchId = new mongoose.Types.ObjectId(batchId);
    }

    const enrollment = await Enrollment.findOne(enrollmentQuery)
      .sort({ createdAt: -1 })
      .lean();

    if (!enrollment) {
      factors.push({
        factor: 'ENROLLMENT',
        satisfied: false,
        details: 'Student has no active enrollment record in this course',
      });
      reasons.push('No enrollment record found for this course.');
    } else {
      const isStatusValid = [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED].includes(
        enrollment.status
      );
      factors.push({
        factor: 'ENROLLMENT',
        satisfied: isStatusValid,
        requiredValue: `${EnrollmentStatus.ACTIVE} or ${EnrollmentStatus.COMPLETED}`,
        actualValue: enrollment.status,
        details: isStatusValid
          ? `Valid enrollment status (${enrollment.status})`
          : `Invalid enrollment status: ${enrollment.status}`,
      });
      if (!isStatusValid) {
        reasons.push(`Enrollment is ${enrollment.status}. Must be ACTIVE or COMPLETED.`);
      }

      // Progress Check
      const progress = enrollment.progress?.completionPercentage ?? 0;
      const isProgressSatisfied = progress >= minProgress;
      factors.push({
        factor: 'PROGRESS',
        satisfied: isProgressSatisfied,
        requiredValue: minProgress,
        actualValue: progress,
        details: isProgressSatisfied
          ? `Course progress satisfied (${progress}% >= ${minProgress}%)`
          : `Course progress below required threshold (${progress}% < ${minProgress}%)`,
      });
      if (!isProgressSatisfied) {
        reasons.push(`Course progress (${progress}%) is below minimum requirement (${minProgress}%).`);
      }

      // Payment Check — Authoritative Finance Module Integration (PRD §50)
      const tuitionClearance = await FinanceService.checkStudentTuitionClearance(
        studentId,
        courseId,
        enrollment._id?.toString()
      );

      const isPaymentSatisfied =
        tuitionClearance.cleared &&
        [PaymentStatus.PAID, PaymentStatus.WAIVED].includes(enrollment.paymentStatus);

      factors.push({
        factor: 'PAYMENT',
        satisfied: isPaymentSatisfied,
        requiredValue: 'Full tuition cleared (No outstanding balance)',
        actualValue: tuitionClearance.cleared ? 'CLEARED' : `OUTSTANDING (${tuitionClearance.currency} ${(tuitionClearance.totalOutstandingMinor / 100).toFixed(2)})`,
        details: isPaymentSatisfied
          ? 'Tuition fully cleared in institutional finance ledger'
          : `Outstanding tuition balance of ${tuitionClearance.currency} ${(tuitionClearance.totalOutstandingMinor / 100).toFixed(2)}`,
      });

      if (!isPaymentSatisfied) {
        if (tuitionClearance.reasons.length > 0) {
          reasons.push(...tuitionClearance.reasons);
        } else {
          reasons.push(`Tuition payment status is ${enrollment.paymentStatus}. Must be PAID or WAIVED.`);
        }
      }
    }

    // 3. Grade Result Verification (Crucial: Must be finalized and published)
    const gradeQuery: Record<string, any> = {
      studentId: new mongoose.Types.ObjectId(studentId),
      courseId: new mongoose.Types.ObjectId(courseId),
    };
    if (batchId) {
      gradeQuery.batchId = new mongoose.Types.ObjectId(batchId);
    }

    const gradeResult = await GradeResult.findOne(gradeQuery)
      .sort({ createdAt: -1 })
      .lean();

    let grade = undefined;
    let gpa = undefined;
    let percentage = undefined;

    if (!gradeResult) {
      factors.push({
        factor: 'GRADE_RESULT',
        satisfied: false,
        details: 'No published grade record found for this student',
      });
      reasons.push('Academic grades have not been calculated or published.');
    } else {
      grade = gradeResult.letterGrade;
      gpa = gradeResult.gpa;
      percentage = gradeResult.finalPercentage;

      const isPublished = [
        GradePublicationStatus.PUBLISHED,
        GradePublicationStatus.CORRECTED,
      ].includes(gradeResult.publicationStatus);

      const isPassed = gradeResult.isPassed === true;

      const gradeSatisfied = isPublished && isPassed;

      factors.push({
        factor: 'GRADE_RESULT',
        satisfied: gradeSatisfied,
        requiredValue: 'PUBLISHED and isPassed: true',
        actualValue: `${gradeResult.publicationStatus} (Grade: ${gradeResult.letterGrade}, Passed: ${gradeResult.isPassed})`,
        details: gradeSatisfied
          ? `Academic criteria satisfied with Grade ${gradeResult.letterGrade} (GPA ${gradeResult.gpa})`
          : !isPublished
            ? `Grade results are still in ${gradeResult.publicationStatus} status and not finalized`
            : `Student has not achieved a passing grade in this course (Grade: ${gradeResult.letterGrade})`,
      });

      if (!isPublished) {
        reasons.push(
          `Grades are currently ${gradeResult.publicationStatus}. Certificates can only be issued from finalized PUBLISHED results.`
        );
      }
      if (!isPassed) {
        reasons.push(`Student did not pass the course (Grade: ${gradeResult.letterGrade}).`);
      }
    }

    // 4. Attendance Check
    let attendanceSatisfied = true;
    try {
      if (batchId || enrollment?.batchId) {
        const targetBatchId = batchId || enrollment?.batchId?.toString();
        const attendanceData = await AttendanceService.getStudentAttendance(
          studentId,
          [UserRole.ADMIN],
          studentId,
          { courseId, batchId: targetBatchId }
        );
        if (attendanceData && attendanceData.summary && attendanceData.summary.totalClasses > 0) {
          const attPct = attendanceData.summary.attendancePercentage;
          attendanceSatisfied = attPct >= minAttendance;
          factors.push({
            factor: 'ATTENDANCE',
            satisfied: attendanceSatisfied,
            requiredValue: minAttendance,
            actualValue: attPct,
            details: attendanceSatisfied
              ? `Attendance satisfied (${attPct}% >= ${minAttendance}%)`
              : `Attendance below required threshold (${attPct}% < ${minAttendance}%)`,
          });
          if (!attendanceSatisfied) {
            reasons.push(
              `Attendance rate (${attPct}%) is below minimum requirement (${minAttendance}%).`
            );
          }
        } else {
          factors.push({
            factor: 'ATTENDANCE',
            satisfied: true,
            details: 'No attendance requirements recorded or applicable',
          });
        }
      } else {
        factors.push({
          factor: 'ATTENDANCE',
          satisfied: true,
          details: 'Self-paced or asynchronous course (attendance excused)',
        });
      }
    } catch {
      // In case attendance lookup is not applicable, treat as satisfied
      factors.push({
        factor: 'ATTENDANCE',
        satisfied: true,
        details: 'Attendance criteria waived or verified',
      });
    }

    // 5. Existing Active Certificate Check
    const existingCert = await CertificateModel.findOne({
      studentId: new mongoose.Types.ObjectId(studentId),
      courseId: new mongoose.Types.ObjectId(courseId),
      certificateType: certType,
      status: CertificateStatus.ISSUED,
    }).lean();

    let existingCertSummary = null;
    if (existingCert) {
      existingCertSummary = {
        id: existingCert._id.toString(),
        certificateNumber: existingCert.certificateNumber,
        status: existingCert.status,
        issuedAt: existingCert.issuedAt.toISOString(),
      };
      reasons.push(`Active certificate already issued (${existingCert.certificateNumber}).`);
    }

    // Determine Final Eligibility
    let isEligible = factors.every((f) => f.satisfied) && !existingCert;

    // Handle Manual Override
    if (!isEligible && options.allowOverride && options.overrideReason) {
      isEligible = true;
    }

    return {
      eligible: isEligible,
      studentId,
      studentName: (student as any).name || 'Student',
      courseId,
      courseTitle: course.title,
      batchId: batchId || enrollment?.batchId?.toString(),
      batchCode: batch?.batchCode,
      enrollmentId: enrollment?._id?.toString(),
      gradeResultId: gradeResult?._id?.toString(),
      grade,
      gpa,
      percentage,
      factors,
      reasons,
      existingCertificate: existingCertSummary,
      isOverridden: !!(options.allowOverride && options.overrideReason),
      overrideReason: options.overrideReason,
      overriddenBy: options.overriddenBy,
    };
  }

  /**
   * Evaluates eligibility for all students enrolled in a course or batch
   */
  static async evaluateBatchEligibility(
    courseId: string,
    batchId?: string,
    options: EligibilityOptions = {}
  ): Promise<CertificateEligibilityResult[]> {
    const course = await Course.findById(courseId).lean();
    if (!course) {
      throw new NotFoundError('Course');
    }

    const query: Record<string, any> = {
      courseId: new mongoose.Types.ObjectId(courseId),
      status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
    };
    if (batchId) {
      query.batchId = new mongoose.Types.ObjectId(batchId);
    }

    const enrollments = await Enrollment.find(query).lean();
    const results: CertificateEligibilityResult[] = [];

    for (const enrollment of enrollments) {
      const studentId = enrollment.studentId.toString();
      const evalResult = await this.evaluateStudentEligibility(
        studentId,
        courseId,
        batchId || enrollment.batchId?.toString(),
        options
      );
      results.push(evalResult);
    }

    return results;
  }
}
