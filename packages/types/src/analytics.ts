/**
 * Shared types for Analytics Engine, Reports & Exports — PRD §54, §55
 */

export enum ReportType {
  ENROLLMENT = 'ENROLLMENT',
  ATTENDANCE = 'ATTENDANCE',
  GRADES = 'GRADES',
  ASSESSMENT_PERFORMANCE = 'ASSESSMENT_PERFORMANCE',
  ASSIGNMENT_COMPLETION = 'ASSIGNMENT_COMPLETION',
  TEACHER_WORKLOAD = 'TEACHER_WORKLOAD',
  CERTIFICATES = 'CERTIFICATES',
  FINANCE = 'FINANCE',
  ADMISSIONS = 'ADMISSIONS',
}

export enum ReportFormat {
  CSV = 'CSV',
  PDF = 'PDF',
}

export enum AnalyticsGranularity {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
}

// ---------------------------------------------------------------------------
// 1. Student Analytics Types — PRD §54.1
// ---------------------------------------------------------------------------

export interface ISubjectPerformance {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  averageScorePercentage: number;
  totalAssessments: number;
  totalAssignments: number;
}

export interface IStudentAnalyticsSummary {
  courseCompletion: number; // Percentage 0 - 100
  assessmentScore: number | null; // Overall average graded percentage or null if none
  attendanceRate: number; // Canonical Phase 4C attendance rate
  learningStreak: number; // Consecutive active days
  totalEnrolledCourses: number;
  completedCourses: number;
  pendingAssignments: number;
  upcomingAssessments: number;
}

export interface IStudentAnalytics {
  summary: IStudentAnalyticsSummary;
  subjectPerformance: ISubjectPerformance[];
  recentActivityTrend: Array<{
    date: string;
    activityCount: number;
  }>;
}

// ---------------------------------------------------------------------------
// 2. Teacher Analytics Types — PRD §54.2
// ---------------------------------------------------------------------------

export interface IStrugglingStudent {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  courseId: string;
  courseTitle: string;
  batchId: string;
  batchName: string;
  attendanceRate: number;
  assessmentAverage: number | null;
  missingAssignmentsCount: number;
  reasons: string[];
}

export interface IUngradedWorkItem {
  id: string;
  type: 'ASSIGNMENT' | 'ASSESSMENT';
  title: string;
  studentId: string;
  studentName: string;
  courseTitle: string;
  batchName: string;
  submittedAt: string;
}

export interface ITeacherAnalyticsSummary {
  classAttendanceRate: number; // Average attendance rate across teacher's classes
  assignmentCompletionRate: number; // Submissions / eligible enrollments
  averageQuizResult: number | null; // Graded assessment average %
  averageStudentProgress: number; // Average course progress %
  totalAssignedCourses: number;
  totalAssignedBatches: number;
  totalStudents: number;
  ungradedSubmissionsCount: number;
  strugglingStudentsCount: number;
}

export interface ITeacherBatchBreakdown {
  batchId: string;
  batchName: string;
  courseTitle: string;
  studentCount: number;
  attendanceRate: number;
  assignmentCompletionRate: number;
}

export interface ITeacherAnalytics {
  summary: ITeacherAnalyticsSummary;
  strugglingStudents: IStrugglingStudent[];
  ungradedWork: IUngradedWorkItem[];
  batchBreakdown: ITeacherBatchBreakdown[];
}

// ---------------------------------------------------------------------------
// 3. Admin Analytics Types — PRD §54.3
// ---------------------------------------------------------------------------

export interface ITeacherActivityItem {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  classesTaught: number;
  attendanceFinalized: number;
  assignmentsCreated: number;
  submissionsGraded: number;
}

export interface IAdminAnalyticsSummary {
  totalStudents: number;
  activeStudents: number;
  studentGrowth: number; // New registered students within date range
  totalEnrollments: number;
  activeEnrollments: number;
  courseCompletionRate: number; // Completed enrollments / total enrollments
  overallAttendanceRate: number; // Institution-wide average attendance rate
  averageAssessmentScore: number | null; // Institutional quiz/exam average %
  assessmentPassRate: number | null; // Passed attempts / total graded attempts %
  certificatesIssued: number; // Active issued credentials
  applicationConversionRate: number; // Enrolled applications / decided applications %
  totalApplications: number;
  enrolledApplications: number;
  grossRevenueMinor: number;
  refundAmountMinor: number;
  netRevenueMinor: number;
  currency: string;
}

export interface IAdminAnalytics {
  summary: IAdminAnalyticsSummary;
  growthTrend: Array<{
    label: string;
    newStudents: number;
    newEnrollments: number;
  }>;
  enrollmentBreakdown: Array<{
    courseId: string;
    courseTitle: string;
    count: number;
  }>;
  teacherActivity: ITeacherActivityItem[];
}

// ---------------------------------------------------------------------------
// 4. Reports & Exports Types — PRD §55
// ---------------------------------------------------------------------------

export type ReportCell = string | number | boolean | null | undefined;
export type IReportRow = Record<string, ReportCell>;

export interface IReportMetadata {
  title: string;
  reportType: ReportType;
  generatedAt: string;
  generatedBy: string;
  dateRange: {
    from: string;
    to: string;
  };
  totalRows: number;
  filters?: Record<string, string | undefined>;
}

export interface IReportResult {
  metadata: IReportMetadata;
  columns: string[];
  headers: string[];
  rows: Array<Record<string, ReportCell>>;
  summary?: Record<string, ReportCell>;
}

export interface ReportFilterDto {
  reportType: ReportType;
  from?: string;
  to?: string;
  courseId?: string;
  batchId?: string;
  teacherId?: string;
  format?: ReportFormat;
}
