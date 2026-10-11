import mongoose from 'mongoose';
import {
  ReportType,
  AttendanceStatus,
  SubmissionStatus,
  type IReportResult,
  type IReportRow,
  type IReportMetadata,
  type ReportFilterDto,
  UserRole,
} from '@eta/types';
import { Enrollment } from '../academic/enrollment.model.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { AttendanceRecord } from '../attendance/attendance.model.js';
import { GradeResult } from '../gradebook/grade-result.model.js';
import { AssessmentModel } from '../assessment/assessment.model.js';
import { AssessmentAttemptModel } from '../assessment/attempt.model.js';
import { Assignment } from '../assignment/assignment.model.js';
import { AssignmentSubmission } from '../assignment/submission.model.js';
import { User } from '../users/user.model.js';
import { CertificateModel } from '../certificates/certificate.model.js';
import { Payment } from '../finance/payment.model.js';
import { AdmissionApplication } from '../admission/admission-application.model.js';

export class AnalyticsReportService {
  /**
   * Generates a tabular report result DTO with columns and rows (PRD §55).
   */
  public static async generateReport(
    filter: ReportFilterDto,
    actor: { id: string; name?: string; role: UserRole }
  ): Promise<IReportResult> {
    const fromDate = filter.from ? new Date(filter.from) : undefined;
    const toDate = filter.to ? new Date(filter.to) : undefined;
    const courseId = filter.courseId && mongoose.Types.ObjectId.isValid(filter.courseId)
      ? new mongoose.Types.ObjectId(filter.courseId)
      : undefined;
    const batchId = filter.batchId && mongoose.Types.ObjectId.isValid(filter.batchId)
      ? new mongoose.Types.ObjectId(filter.batchId)
      : undefined;

    switch (filter.reportType) {
      case ReportType.ENROLLMENT:
        return this.generateEnrollmentReport(fromDate, toDate, courseId, batchId, actor);
      case ReportType.ATTENDANCE:
        return this.generateAttendanceReport(fromDate, toDate, courseId, batchId, actor);
      case ReportType.GRADES:
        return this.generateGradesReport(fromDate, toDate, courseId, batchId, actor);
      case ReportType.ASSESSMENT_PERFORMANCE:
        return this.generateAssessmentPerformanceReport(fromDate, toDate, courseId, batchId, actor);
      case ReportType.ASSIGNMENT_COMPLETION:
        return this.generateAssignmentCompletionReport(fromDate, toDate, courseId, batchId, actor);
      case ReportType.TEACHER_WORKLOAD:
        return this.generateTeacherWorkloadReport(fromDate, toDate, actor);
      case ReportType.CERTIFICATES:
        return this.generateCertificatesReport(fromDate, toDate, courseId, actor);
      case ReportType.FINANCE:
        return this.generateFinanceReport(fromDate, toDate, actor);
      case ReportType.ADMISSIONS:
        return this.generateAdmissionsReport(fromDate, toDate, actor);
      default:
        throw new Error(`Unsupported report type: ${filter.reportType}`);
    }
  }

  private static createMetadata(
    title: string,
    reportType: ReportType,
    totalRows: number,
    fromDate?: Date,
    toDate?: Date,
    actorName?: string
  ): IReportMetadata {
    return {
      title,
      reportType,
      generatedAt: new Date().toISOString(),
      generatedBy: actorName || 'System',
      dateRange: {
        from: fromDate ? fromDate.toISOString() : 'All Time',
        to: toDate ? toDate.toISOString() : new Date().toISOString(),
      },
      totalRows,
    };
  }

  // 1. Enrollment Report
  private static async generateEnrollmentReport(
    from?: Date,
    to?: Date,
    courseId?: mongoose.Types.ObjectId,
    batchId?: mongoose.Types.ObjectId,
    actor?: { name?: string }
  ): Promise<IReportResult> {
    const q: Record<string, any> = {};
    if (courseId) q.courseId = courseId;
    if (batchId) q.batchId = batchId;
    if (from || to) {
      q.enrollmentDate = {};
      if (from) q.enrollmentDate.$gte = from;
      if (to) q.enrollmentDate.$lte = to;
    }

    const docs = await Enrollment.find(q)
      .populate('studentId', 'name email')
      .populate('courseId', 'title code')
      .populate('batchId', 'batchName batchCode')
      .sort({ enrollmentDate: -1 })
      .lean();

    const columns = ['studentName', 'studentEmail', 'courseTitle', 'batchName', 'status', 'source', 'enrollmentDate'];
    const headers = ['Student Name', 'Student Email', 'Course', 'Batch', 'Status', 'Source', 'Enrollment Date'];

    const rows: IReportRow[] = docs.map((d: any) => ({
      studentName: d.studentId?.name || 'Unknown',
      studentEmail: d.studentId?.email || 'N/A',
      courseTitle: d.courseId?.title || 'Unknown',
      batchName: d.batchId?.batchName || 'N/A',
      status: d.status,
      source: d.source,
      enrollmentDate: d.enrollmentDate ? new Date(d.enrollmentDate).toISOString().split('T')[0] : 'N/A',
    }));

    return {
      metadata: this.createMetadata('Academic Enrollment Report', ReportType.ENROLLMENT, rows.length, from, to, actor?.name),
      columns,
      headers,
      rows,
    };
  }

  // 2. Attendance Report
  private static async generateAttendanceReport(
    from?: Date,
    to?: Date,
    courseId?: mongoose.Types.ObjectId,
    batchId?: mongoose.Types.ObjectId,
    actor?: { name?: string }
  ): Promise<IReportResult> {
    const q: Record<string, any> = {};
    if (courseId) q.courseId = courseId;
    if (batchId) q.batchId = batchId;
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = from;
      if (to) q.createdAt.$lte = to;
    }

    const docs = await AttendanceRecord.find(q)
      .populate('studentId', 'name email')
      .populate('batchId', 'batchName')
      .populate('courseId', 'title')
      .lean();

    // Group by student
    const studentMap: Record<string, { name: string; email: string; batch: string; course: string; present: number; late: number; absent: number; total: number }> = {};
    for (const d of docs) {
      const sId = d.studentId?._id?.toString() || d.studentId?.toString();
      if (!sId) continue;
      if (!studentMap[sId]) {
        studentMap[sId] = {
          name: (d.studentId as any)?.name || 'Student',
          email: (d.studentId as any)?.email || 'N/A',
          batch: (d.batchId as any)?.batchName || 'Batch',
          course: (d.courseId as any)?.title || 'Course',
          present: 0,
          late: 0,
          absent: 0,
          total: 0,
        };
      }
      studentMap[sId].total++;
      if (d.status === AttendanceStatus.PRESENT) studentMap[sId].present++;
      else if (d.status === AttendanceStatus.LATE) studentMap[sId].late++;
      else if (d.status === AttendanceStatus.ABSENT) studentMap[sId].absent++;
    }

    const columns = ['studentName', 'studentEmail', 'courseTitle', 'batchName', 'totalSessions', 'present', 'late', 'absent', 'attendanceRate'];
    const headers = ['Student Name', 'Student Email', 'Course', 'Batch', 'Total Sessions', 'Present', 'Late', 'Absent', 'Attendance Rate %'];

    const rows: IReportRow[] = Object.values(studentMap).map((s) => {
      const rate = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 100;
      return {
        studentName: s.name,
        studentEmail: s.email,
        courseTitle: s.course,
        batchName: s.batch,
        totalSessions: s.total,
        present: s.present,
        late: s.late,
        absent: s.absent,
        attendanceRate: `${rate}%`,
      };
    });

    return {
      metadata: this.createMetadata('Attendance Performance Report', ReportType.ATTENDANCE, rows.length, from, to, actor?.name),
      columns,
      headers,
      rows,
    };
  }

  // 3. Grades Report
  private static async generateGradesReport(
    from?: Date,
    to?: Date,
    courseId?: mongoose.Types.ObjectId,
    batchId?: mongoose.Types.ObjectId,
    actor?: { name?: string }
  ): Promise<IReportResult> {
    const q: Record<string, any> = { publicationStatus: 'published' };
    if (courseId) q.courseId = courseId;
    if (batchId) q.batchId = batchId;
    if (from || to) {
      q.updatedAt = {};
      if (from) q.updatedAt.$gte = from;
      if (to) q.updatedAt.$lte = to;
    }

    const docs = await GradeResult.find(q)
      .populate('studentId', 'name email')
      .populate('courseId', 'title code')
      .populate('batchId', 'batchName')
      .lean();

    const columns = ['studentName', 'courseTitle', 'batchName', 'finalScore', 'letterGrade', 'gradePoint', 'isPassed'];
    const headers = ['Student Name', 'Course', 'Batch', 'Final Score %', 'Letter Grade', 'Grade Point', 'Status'];

    const rows: IReportRow[] = docs.map((d: any) => ({
      studentName: d.studentId?.name || 'Student',
      courseTitle: d.courseId?.title || 'Course',
      batchName: d.batchId?.batchName || 'N/A',
      finalScore: `${d.finalPercentage ?? d.finalScore}%`,
      letterGrade: d.letterGrade || 'N/A',
      gradePoint: d.gradePoint ?? 0,
      isPassed: d.isPassed ? 'Passed' : 'Failed',
    }));

    return {
      metadata: this.createMetadata('Student Gradebook Report', ReportType.GRADES, rows.length, from, to, actor?.name),
      columns,
      headers,
      rows,
    };
  }

  // 4. Assessment Performance Report
  private static async generateAssessmentPerformanceReport(
    from?: Date,
    to?: Date,
    courseId?: mongoose.Types.ObjectId,
    batchId?: mongoose.Types.ObjectId,
    actor?: { name?: string }
  ): Promise<IReportResult> {
    const q: Record<string, any> = { status: 'PUBLISHED' };
    if (courseId) q.courseId = courseId;
    if (batchId) q.batchId = batchId;

    const assessments = await AssessmentModel.find(q).populate('courseId', 'title').lean();
    const assessIds = assessments.map((a: any) => a._id);

    const attemptQ: Record<string, any> = {
      assessmentId: { $in: assessIds },
      status: 'GRADED',
    };
    if (from || to) {
      attemptQ.submittedAt = {};
      if (from) attemptQ.submittedAt.$gte = from;
      if (to) attemptQ.submittedAt.$lte = to;
    }

    const attempts = await AssessmentAttemptModel.find(attemptQ).lean();

    const columns = ['assessmentTitle', 'courseTitle', 'type', 'totalAttempts', 'averageScore', 'passRate'];
    const headers = ['Assessment Title', 'Course', 'Type', 'Total Attempts', 'Average Score %', 'Pass Rate %'];

    const rows: IReportRow[] = assessments.map((a: any) => {
      const aAttempts = attempts.filter((att: any) => att.assessmentId.toString() === a._id.toString());
      let scoreSum = 0;
      let passed = 0;
      for (const att of aAttempts) {
        scoreSum += att.percentage ?? (att.totalMarks > 0 ? ((att.obtainedMarks ?? 0) / att.totalMarks) * 100 : 0);
        if (att.isPassed) passed++;
      }
      const avg = aAttempts.length > 0 ? Math.round((scoreSum / aAttempts.length) * 100) / 100 : 0;
      const passRate = aAttempts.length > 0 ? Math.round((passed / aAttempts.length) * 100) : 0;

      return {
        assessmentTitle: a.title,
        courseTitle: a.courseId?.title || 'N/A',
        type: a.type,
        totalAttempts: aAttempts.length,
        averageScore: `${avg}%`,
        passRate: `${passRate}%`,
      };
    });

    return {
      metadata: this.createMetadata('Assessment Performance Report', ReportType.ASSESSMENT_PERFORMANCE, rows.length, from, to, actor?.name),
      columns,
      headers,
      rows,
    };
  }

  // 5. Assignment Completion Report
  private static async generateAssignmentCompletionReport(
    from?: Date,
    to?: Date,
    courseId?: mongoose.Types.ObjectId,
    batchId?: mongoose.Types.ObjectId,
    actor?: { name?: string }
  ): Promise<IReportResult> {
    const q: Record<string, any> = { status: 'PUBLISHED' };
    if (courseId) q.courseId = courseId;
    if (batchId) q.batchId = batchId;

    const assignments = await Assignment.find(q)
      .populate('courseId', 'title')
      .populate('batchId', 'batchName')
      .lean();
    const assignIds = assignments.map((a) => a._id);

    const subQ: Record<string, any> = {
      assignmentId: { $in: assignIds },
      status: { $in: ['SUBMITTED', 'RESUBMITTED', 'GRADED'] },
    };
    if (from || to) {
      subQ.submittedAt = {};
      if (from) subQ.submittedAt.$gte = from;
      if (to) subQ.submittedAt.$lte = to;
    }
    const submissions = await AssignmentSubmission.find(subQ).lean();

    const columns = ['assignmentTitle', 'courseTitle', 'batchName', 'dueDate', 'submittedCount', 'gradedCount'];
    const headers = ['Assignment Title', 'Course', 'Batch', 'Due Date', 'Submitted Count', 'Graded Count'];

    const rows: IReportRow[] = assignments.map((a: any) => {
      const aSubs = submissions.filter((s) => s.assignmentId.toString() === a._id.toString());
      const graded = aSubs.filter((s) => s.status === SubmissionStatus.GRADED).length;

      return {
        assignmentTitle: a.title,
        courseTitle: a.courseId?.title || 'N/A',
        batchName: a.batchId?.batchName || 'N/A',
        dueDate: a.dueDate ? new Date(a.dueDate).toISOString().split('T')[0] : 'None',
        submittedCount: aSubs.length,
        gradedCount: graded,
      };
    });

    return {
      metadata: this.createMetadata('Assignment Completion Report', ReportType.ASSIGNMENT_COMPLETION, rows.length, from, to, actor?.name),
      columns,
      headers,
      rows,
    };
  }

  // 6. Teacher Workload Report
  private static async generateTeacherWorkloadReport(
    from?: Date,
    to?: Date,
    actor?: { name?: string }
  ): Promise<IReportResult> {
    const teachers = await User.find({ roles: UserRole.TEACHER }).select('_id name email').lean();
    const courses = await Course.find().select('teacherIds').lean();
    const batches = await Batch.find().select('teacherIds').lean();
    const assignments = await Assignment.find().select('createdBy').lean();

    const columns = ['teacherName', 'teacherEmail', 'coursesCount', 'batchesCount', 'assignmentsCreated'];
    const headers = ['Teacher Name', 'Teacher Email', 'Assigned Courses', 'Assigned Batches', 'Assignments Created'];

    const rows: IReportRow[] = teachers.map((t) => {
      const tId = t._id.toString();
      const cCount = courses.filter((c: any) => c.teacherIds?.some((id: any) => id.toString() === tId)).length;
      const bCount = batches.filter((b: any) => b.teacherIds?.some((id: any) => id.toString() === tId)).length;
      const aCount = assignments.filter((a: any) => a.createdBy?.toString() === tId).length;

      return {
        teacherName: t.name,
        teacherEmail: t.email,
        coursesCount: cCount,
        batchesCount: bCount,
        assignmentsCreated: aCount,
      };
    });

    return {
      metadata: this.createMetadata('Faculty Workload Report', ReportType.TEACHER_WORKLOAD, rows.length, from, to, actor?.name),
      columns,
      headers,
      rows,
    };
  }

  // 7. Certificates Report
  private static async generateCertificatesReport(
    from?: Date,
    to?: Date,
    courseId?: mongoose.Types.ObjectId,
    actor?: { name?: string }
  ): Promise<IReportResult> {
    const q: Record<string, any> = {};
    if (courseId) q.courseId = courseId;
    if (from || to) {
      q.issuedAt = {};
      if (from) q.issuedAt.$gte = from;
      if (to) q.issuedAt.$lte = to;
    }

    const certs = await CertificateModel.find(q)
      .populate('studentId', 'name email')
      .populate('courseId', 'title')
      .sort({ issuedAt: -1 })
      .lean();

    const columns = ['certificateNumber', 'studentName', 'courseTitle', 'certificateType', 'status', 'issuedAt'];
    const headers = ['Certificate Number', 'Student Name', 'Course', 'Type', 'Status', 'Issue Date'];

    const rows: IReportRow[] = certs.map((c: any) => ({
      certificateNumber: c.certificateNumber,
      studentName: c.studentId?.name || 'Student',
      courseTitle: c.courseId?.title || 'Course',
      certificateType: c.certificateType,
      status: c.status,
      issuedAt: c.issuedAt ? new Date(c.issuedAt).toISOString().split('T')[0] : 'N/A',
    }));

    return {
      metadata: this.createMetadata('Credentials & Certificates Report', ReportType.CERTIFICATES, rows.length, from, to, actor?.name),
      columns,
      headers,
      rows,
    };
  }

  // 8. Finance Report
  private static async generateFinanceReport(
    from?: Date,
    to?: Date,
    actor?: { name?: string }
  ): Promise<IReportResult> {
    const q: Record<string, any> = {};
    if (from || to) {
      q.paidAt = {};
      if (from) q.paidAt.$gte = from;
      if (to) q.paidAt.$lte = to;
    }

    const payments = await Payment.find(q)
      .populate('studentId', 'name email')
      .sort({ paidAt: -1 })
      .lean();

    const columns = ['paymentNumber', 'receiptNumber', 'studentName', 'amount', 'currency', 'paymentMethod', 'status', 'paidAt'];
    const headers = ['Payment #', 'Receipt #', 'Student Name', 'Amount', 'Currency', 'Method', 'Status', 'Paid Date'];

    const rows: IReportRow[] = payments.map((p: any) => ({
      paymentNumber: p.paymentNumber,
      receiptNumber: p.receiptNumber,
      studentName: p.studentId?.name || 'Student',
      amount: (p.amountMinor / 100).toFixed(2),
      currency: p.currency,
      paymentMethod: p.paymentMethod,
      status: p.status,
      paidAt: p.paidAt ? new Date(p.paidAt).toISOString().split('T')[0] : 'N/A',
    }));

    return {
      metadata: this.createMetadata('Financial Collections Report', ReportType.FINANCE, rows.length, from, to, actor?.name),
      columns,
      headers,
      rows,
    };
  }

  // 9. Admissions Report
  private static async generateAdmissionsReport(
    from?: Date,
    to?: Date,
    actor?: { name?: string }
  ): Promise<IReportResult> {
    const q: Record<string, any> = {};
    if (from || to) {
      q.submittedAt = {};
      if (from) q.submittedAt.$gte = from;
      if (to) q.submittedAt.$lte = to;
    }

    const apps = await AdmissionApplication.find(q)
      .populate('programId', 'title')
      .sort({ createdAt: -1 })
      .lean();

    const columns = ['applicationNumber', 'applicantName', 'applicantEmail', 'programTitle', 'status', 'submittedAt'];
    const headers = ['Application #', 'Applicant Name', 'Email', 'Program', 'Status', 'Submission Date'];

    const rows: IReportRow[] = apps.map((a: any) => ({
      applicationNumber: a.applicationNumber,
      applicantName: a.personalInfo?.fullName || 'Applicant',
      applicantEmail: a.personalInfo?.email || 'N/A',
      programTitle: a.programId?.title || 'Program',
      status: a.status,
      submittedAt: a.submittedAt ? new Date(a.submittedAt).toISOString().split('T')[0] : 'Draft',
    }));

    return {
      metadata: this.createMetadata('Admissions & Applications Report', ReportType.ADMISSIONS, rows.length, from, to, actor?.name),
      columns,
      headers,
      rows,
    };
  }
}
