import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import {
  UserRole,
  EnrollmentStatus,
  AttendanceStatus,
  SubmissionStatus,
  ReportType,
  ReportFormat,
} from '@eta/types';
import {
  analyticsDateRangeSchema,
  sanitizeCsvCell,
  reportFilterSchema,
} from '@eta/validation';
import { StudentAnalyticsService } from './student-analytics.service.js';
import { TeacherAnalyticsService } from './teacher-analytics.service.js';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import { AnalyticsReportService } from './analytics-report.service.js';
import { AnalyticsExportService } from './analytics-export.service.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Subject } from '../academic/subject.model.js';
import { AttendanceRecord, AttendanceSession } from '../attendance/attendance.model.js';
import { AssessmentModel } from '../assessment/assessment.model.js';
import { AssessmentAttemptModel } from '../assessment/attempt.model.js';
import { Assignment } from '../assignment/assignment.model.js';
import { AssignmentSubmission } from '../assignment/submission.model.js';
import { User } from '../users/user.model.js';
import { Payment } from '../finance/payment.model.js';
import { Refund } from '../finance/refund.model.js';
import { AdmissionApplication } from '../admission/admission-application.model.js';
import { CertificateModel } from '../certificates/certificate.model.js';
import { ForbiddenError } from '../../common/errors.js';

describe('Phase 14 — Analytics Engine, Reports & Exports', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Validation & CSV Security (PRD §55)
  // =========================================================================
  describe('Validation & CSV Security', () => {
    it('validates date range successfully within 366 days', () => {
      const result = analyticsDateRangeSchema.safeParse({
        from: '2026-01-01',
        to: '2026-06-01',
      });
      expect(result.success).toBe(true);
    });

    it('rejects inverted date ranges where from > to', () => {
      const result = analyticsDateRangeSchema.safeParse({
        from: '2026-06-01',
        to: '2026-01-01',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(/less than or equal to/);
      }
    });

    it('rejects date range exceeding 366 days boundary', () => {
      const result = analyticsDateRangeSchema.safeParse({
        from: '2024-01-01',
        to: '2026-01-01',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toMatch(/exceed 366 days/);
      }
    });

    it('sanitizes dangerous formulas to prevent CSV Formula Injection', () => {
      expect(sanitizeCsvCell('=SUM(A1:B10)')).toBe("'=SUM(A1:B10)");
      expect(sanitizeCsvCell('+CMD|/C calc')).toBe("'+CMD|/C calc");
      expect(sanitizeCsvCell('-5+2')).toBe("'-5+2");
      expect(sanitizeCsvCell('@HYPERLINK("evil.com")')).toBe("\"'@HYPERLINK(\"\"evil.com\"\")\"");
      expect(sanitizeCsvCell('\tMaliciousTab')).toBe("'\tMaliciousTab");
    });

    it('properly quotes RFC 4180 cells with commas, quotes, and newlines', () => {
      expect(sanitizeCsvCell('Hello, World')).toBe('"Hello, World"');
      expect(sanitizeCsvCell('He said "Hello"')).toBe('"He said ""Hello"""');
      expect(sanitizeCsvCell('Line1\nLine2')).toBe('"Line1\nLine2"');
      expect(sanitizeCsvCell('Normal Text')).toBe('Normal Text');
    });
  });

  // =========================================================================
  // 2. Student Analytics (PRD §54.1)
  // =========================================================================
  describe('Student Analytics Service', () => {
    it('calculates canonical course completion, attendance, and assessment score', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId().toString();
      const batchId = new mongoose.Types.ObjectId().toString();

      vi.spyOn(Enrollment, 'find').mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            courseId: { _id: courseId, title: 'Web Development' },
            batchId,
            status: EnrollmentStatus.ACTIVE,
            progress: { completionPercentage: 75, lastAccessedAt: new Date() },
          },
        ]),
      } as any);

      vi.spyOn(AssessmentAttemptModel, 'find').mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            assessmentId: { _id: new mongoose.Types.ObjectId(), courseId, title: 'Quiz 1' },
            percentage: 85,
            totalMarks: 100,
            obtainedMarks: 85,
            submittedAt: new Date(),
          },
        ]),
      } as any);

      vi.spyOn(AttendanceRecord, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { status: AttendanceStatus.PRESENT, createdAt: new Date() },
          { status: AttendanceStatus.LATE, createdAt: new Date() },
          { status: AttendanceStatus.ABSENT, createdAt: new Date() },
        ]),
      } as any);

      vi.spyOn(Assignment, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(AssignmentSubmission, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(AssessmentModel, 'countDocuments').mockResolvedValue(1 as any);

      vi.spyOn(Subject, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      const analytics = await StudentAnalyticsService.getStudentAnalytics(studentId);

      expect(analytics.summary.courseCompletion).toBe(75);
      expect(analytics.summary.assessmentScore).toBe(85);
      // (1 present + 1 late) / 3 total = 66.67% -> 67%
      expect(analytics.summary.attendanceRate).toBe(67);
      expect(analytics.summary.totalEnrolledCourses).toBe(1);
      expect(analytics.summary.learningStreak).toBeGreaterThanOrEqual(1);
    });

    it('handles student with zero enrollments or data gracefully without division by zero', async () => {
      const studentId = new mongoose.Types.ObjectId().toString();

      vi.spyOn(Enrollment, 'find').mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(AssessmentAttemptModel, 'find').mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(AttendanceRecord, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(Assignment, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(AssignmentSubmission, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(AssessmentModel, 'countDocuments').mockResolvedValue(0 as any);

      vi.spyOn(Subject, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      const analytics = await StudentAnalyticsService.getStudentAnalytics(studentId);

      expect(analytics.summary.courseCompletion).toBe(0);
      expect(analytics.summary.assessmentScore).toBeNull();
      expect(analytics.summary.attendanceRate).toBe(100);
      expect(analytics.summary.learningStreak).toBe(0);
      expect(analytics.subjectPerformance).toEqual([]);
    });
  });

  // =========================================================================
  // 3. Teacher Analytics (PRD §54.2)
  // =========================================================================
  describe('Teacher Analytics Service', () => {
    it('enforces assigned-scope security and rejects unauthorized courses', async () => {
      const teacherId = new mongoose.Types.ObjectId().toString();
      const unauthorizedCourseId = new mongoose.Types.ObjectId().toString();

      vi.spyOn(Course, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]), // Teacher assigned to NO courses
      } as any);

      vi.spyOn(Batch, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      await expect(
        TeacherAnalyticsService.getTeacherAnalytics(teacherId, { courseId: unauthorizedCourseId })
      ).rejects.toThrow(ForbiddenError);
    });

    it('identifies struggling students with transparent explainable reasons', async () => {
      const teacherId = new mongoose.Types.ObjectId().toString();
      const courseId = new mongoose.Types.ObjectId();
      const batchId = new mongoose.Types.ObjectId();
      const student1Id = new mongoose.Types.ObjectId();

      vi.spyOn(Course, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ _id: courseId, title: 'Robotics' }]),
      } as any);

      vi.spyOn(Batch, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ _id: batchId, batchName: 'Batch A', courseId }]),
      } as any);

      vi.spyOn(Enrollment, 'find').mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            studentId: { _id: student1Id, name: 'Alice', email: 'alice@eta.test' },
            courseId: { _id: courseId, title: 'Robotics' },
            batchId: { _id: batchId, batchName: 'Batch A' },
            status: EnrollmentStatus.ACTIVE,
            progress: { completionPercentage: 40 },
          },
        ]),
      } as any);

      // Alice has 3 absences out of 3 sessions (0% attendance)
      vi.spyOn(AttendanceRecord, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { studentId: student1Id, status: AttendanceStatus.ABSENT },
          { studentId: student1Id, status: AttendanceStatus.ABSENT },
          { studentId: student1Id, status: AttendanceStatus.ABSENT },
        ]),
      } as any);

      // 2 published assignments, 0 submitted by Alice
      const assign1Id = new mongoose.Types.ObjectId();
      const assign2Id = new mongoose.Types.ObjectId();
      const yesterday = new Date(Date.now() - 86400000);
      vi.spyOn(Assignment, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          { _id: assign1Id, title: 'HW 1', courseId, batchId, dueDate: yesterday },
          { _id: assign2Id, title: 'HW 2', courseId, batchId, dueDate: yesterday },
        ]),
      } as any);

      vi.spyOn(AssignmentSubmission, 'find').mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(AssessmentModel, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(AssessmentAttemptModel, 'find').mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      const analytics = await TeacherAnalyticsService.getTeacherAnalytics(teacherId);

      expect(analytics.strugglingStudents.length).toBe(1);
      const student = analytics.strugglingStudents[0];
      expect(student?.studentName).toBe('Alice');
      expect(student?.attendanceRate).toBe(0);
      expect(student?.missingAssignmentsCount).toBe(2);
      expect(student?.reasons.length).toBeGreaterThanOrEqual(2);
      expect(student?.reasons.some((r) => r.includes('Attendance rate'))).toBe(true);
      expect(student?.reasons.some((r) => r.includes('overdue assignments'))).toBe(true);
    });
  });

  // =========================================================================
  // 4. Admin Analytics (PRD §54.3)
  // =========================================================================
  describe('Admin Analytics Service', () => {
    it('computes institutional KPIs and net revenue subtracting refunds', async () => {
      vi.spyOn(User, 'countDocuments')
        .mockResolvedValueOnce(50 as any) // totalStudents
        .mockResolvedValueOnce(45 as any) // activeStudents
        .mockResolvedValueOnce(10 as any); // studentGrowth

      vi.spyOn(Enrollment, 'find').mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          { status: EnrollmentStatus.ACTIVE, courseId: { title: 'Web' } },
          { status: EnrollmentStatus.ACTIVE, courseId: { title: 'Web' } },
          { status: EnrollmentStatus.COMPLETED, courseId: { title: 'Mobile' } },
        ]),
      } as any);

      vi.spyOn(AttendanceRecord, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          { status: AttendanceStatus.PRESENT },
          { status: AttendanceStatus.PRESENT },
          { status: AttendanceStatus.ABSENT },
        ]),
      } as any);

      vi.spyOn(AssessmentAttemptModel, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { percentage: 90, totalMarks: 100, obtainedMarks: 90, isPassed: true },
          { percentage: 50, totalMarks: 100, obtainedMarks: 50, isPassed: false },
        ]),
      } as any);

      vi.spyOn(CertificateModel, 'countDocuments').mockResolvedValue(8 as any);

      vi.spyOn(AdmissionApplication, 'countDocuments')
        .mockResolvedValueOnce(20 as any) // totalApplications
        .mockResolvedValueOnce(15 as any) // decidedApplications
        .mockResolvedValueOnce(10 as any); // enrolledApplications

      // Payments: 100,000 minor units ($1,000)
      vi.spyOn(Payment, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ amountMinor: 100000 }]),
      } as any);

      // Refunds: 20,000 minor units ($200)
      vi.spyOn(Refund, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ amountMinor: 20000 }]),
      } as any);

      vi.spyOn(User, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(AttendanceSession, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(Assignment, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      vi.spyOn(AssignmentSubmission, 'find').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      const analytics = await AdminAnalyticsService.getAdminAnalytics();

      expect(analytics.summary.totalStudents).toBe(50);
      expect(analytics.summary.activeStudents).toBe(45);
      expect(analytics.summary.studentGrowth).toBe(10);
      expect(analytics.summary.totalEnrollments).toBe(3);
      expect(analytics.summary.activeEnrollments).toBe(2);
      expect(analytics.summary.courseCompletionRate).toBe(33); // 1 / 3 = 33%
      expect(analytics.summary.certificatesIssued).toBe(8);
      // Conversion: 15 enrolled / 20 total = 75%
      expect(analytics.summary.applicationConversionRate).toBe(75);
      // Finance: 100,000 gross - 20,000 refunds = 80,000 net
      expect(analytics.summary.grossRevenueMinor).toBe(100000);
      expect(analytics.summary.refundAmountMinor).toBe(20000);
      expect(analytics.summary.netRevenueMinor).toBe(80000);
      // Assessment: average (90+50)/2 = 70%, pass rate 1/2 = 50%
      expect(analytics.summary.averageAssessmentScore).toBe(70);
      expect(analytics.summary.assessmentPassRate).toBe(50);
    });
  });

  // =========================================================================
  // 5. Reports & Exports (PRD §55)
  // =========================================================================
  describe('Reports & Exports Service', () => {
    it('generates attendance report and exports compliant RFC 4180 CSV with BOM', async () => {
      vi.spyOn(AttendanceRecord, 'find').mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            studentId: { name: 'Bob Smith', email: 'bob@eta.test' },
            courseId: { title: 'Robotics 101' },
            batchId: { batchName: 'Morning Cohort' },
            status: AttendanceStatus.PRESENT,
          },
        ]),
      } as any);

      const report = await AnalyticsReportService.generateReport({
        reportType: ReportType.ATTENDANCE,
        from: '2026-01-01',
        to: '2026-02-01',
      });

      expect(report.metadata.reportType).toBe(ReportType.ATTENDANCE);
      expect(report.rows.length).toBe(1);
      expect(report.rows[0]?.studentName).toBe('Bob Smith');
      expect(report.rows[0]?.attendanceRate).toBe('100%');

      const csv = AnalyticsExportService.exportCsv(report);
      // Verify BOM
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('Bob Smith');
      expect(csv).toContain('Robotics 101');
    });

    it('generates compliant binary %PDF-1.4 report buffer', async () => {
      vi.spyOn(AttendanceRecord, 'find').mockReturnValue({
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      } as any);

      const report = await AnalyticsReportService.generateReport({
        reportType: ReportType.ATTENDANCE,
      });

      const pdfBuffer = AnalyticsExportService.exportPdf(report);

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      const pdfString = pdfBuffer.toString('binary');
      // Must start with PDF magic header
      expect(pdfString.startsWith('%PDF-1.4')).toBe(true);
      // Must contain EOF trailer
      expect(pdfString.includes('%%EOF')).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(100);
    });
  });
});
