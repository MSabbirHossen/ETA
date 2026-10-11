import mongoose from 'mongoose';
import {
  EnrollmentStatus,
  AttendanceStatus,
  type IStudentAnalytics,
  type IStudentAnalyticsSummary,
  type ISubjectPerformance,
} from '@eta/types';
import { Enrollment } from '../academic/enrollment.model.js';
import { Course } from '../academic/course.model.js';
import { Subject } from '../academic/subject.model.js';
import { AssessmentAttemptModel } from '../assessment/attempt.model.js';
import { AssessmentModel } from '../assessment/assessment.model.js';
import { AttendanceRecord } from '../attendance/attendance.model.js';
import { Assignment } from '../assignment/assignment.model.js';
import { AssignmentSubmission } from '../assignment/submission.model.js';

export class StudentAnalyticsService {
  /**
   * Computes personalized analytics for a single student (PRD §54.1).
   */
  public static async getStudentAnalytics(
    studentId: string,
    filters?: { from?: string; to?: string; courseId?: string }
  ): Promise<IStudentAnalytics> {
    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const fromDate = filters?.from ? new Date(filters.from) : undefined;
    const toDate = filters?.to ? new Date(filters.to) : undefined;
    const courseFilter = filters?.courseId && mongoose.Types.ObjectId.isValid(filters.courseId)
      ? new mongoose.Types.ObjectId(filters.courseId)
      : undefined;

    // 1. Enrollments & Course Completion
    const enrollmentQuery: Record<string, any> = {
      studentId: studentObjectId,
      status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
    };
    if (courseFilter) {
      enrollmentQuery.courseId = courseFilter;
    }

    const enrollments = await Enrollment.find(enrollmentQuery)
      .populate('courseId', 'title code')
      .lean();

    const totalEnrolledCourses = enrollments.length;
    let completedCourses = 0;
    let progressSum = 0;

    for (const enr of enrollments) {
      if (enr.status === EnrollmentStatus.COMPLETED || (enr.progress?.completionPercentage ?? 0) >= 100) {
        completedCourses++;
      }
      progressSum += enr.progress?.completionPercentage ?? 0;
    }

    const courseCompletion =
      totalEnrolledCourses > 0 ? Math.round(progressSum / totalEnrolledCourses) : 0;

    const enrolledCourseObjectIds = enrollments.map((e: any) => e.courseId?._id || e.courseId);
    const enrolledBatchObjectIds = enrollments.map((e: any) => e.batchId).filter(Boolean);

    // 2. Assessment Scores
    const attemptQuery: Record<string, any> = {
      studentId: studentObjectId,
      status: 'GRADED',
    };
    if (fromDate || toDate) {
      attemptQuery.submittedAt = {};
      if (fromDate) attemptQuery.submittedAt.$gte = fromDate;
      if (toDate) attemptQuery.submittedAt.$lte = toDate;
    }

    const gradedAttempts = await AssessmentAttemptModel.find(attemptQuery)
      .populate('assessmentId', 'title courseId subjectId')
      .lean();

    // Filter attempts by course if courseId filter is active
    const filteredAttempts = courseFilter
      ? gradedAttempts.filter((att: any) => {
          const cId = att.assessmentId?.courseId?.toString() || att.assessmentId?.courseId;
          return cId === courseFilter.toString();
        })
      : gradedAttempts;

    let totalScoreSum = 0;
    for (const att of filteredAttempts) {
      totalScoreSum += att.percentage ?? (att.totalMarks > 0 ? (att.obtainedMarks ?? 0) / att.totalMarks * 100 : 0);
    }
    const assessmentScore =
      filteredAttempts.length > 0 ? Math.round((totalScoreSum / filteredAttempts.length) * 100) / 100 : null;

    // 3. Attendance Rate (Phase 4C Canonical Formula: (present + late) / totalClasses * 100)
    const attendanceQuery: Record<string, any> = {
      studentId: studentObjectId,
    };
    if (courseFilter) attendanceQuery.courseId = courseFilter;
    if (fromDate || toDate) {
      attendanceQuery.createdAt = {};
      if (fromDate) attendanceQuery.createdAt.$gte = fromDate;
      if (toDate) attendanceQuery.createdAt.$lte = toDate;
    }

    const attendanceRecords = await AttendanceRecord.find(attendanceQuery).lean();
    let presentCount = 0;
    let lateCount = 0;

    for (const rec of attendanceRecords) {
      if (rec.status === AttendanceStatus.PRESENT) presentCount++;
      else if (rec.status === AttendanceStatus.LATE) lateCount++;
    }

    const totalAttendanceSessions = attendanceRecords.length;
    const attendanceRate =
      totalAttendanceSessions > 0
        ? Math.round(((presentCount + lateCount) / totalAttendanceSessions) * 100)
        : 100;

    // 4. Pending Work (Assignments & Upcoming Assessments)
    const assignmentQuery: Record<string, any> = {
      status: 'PUBLISHED',
      batchId: { $in: enrolledBatchObjectIds },
    };
    if (courseFilter) assignmentQuery.courseId = courseFilter;

    const publishedAssignments = await Assignment.find(assignmentQuery).select('_id dueDate').lean();
    const assignmentIds = publishedAssignments.map((a) => a._id);

    const submissions = await AssignmentSubmission.find({
      studentId: studentObjectId,
      assignmentId: { $in: assignmentIds },
    })
      .select('assignmentId status')
      .lean();

    const submittedAssignmentIds = new Set(
      submissions.map((s) => s.assignmentId.toString())
    );

    const now = new Date();
    let pendingAssignments = 0;
    for (const a of publishedAssignments) {
      if (!submittedAssignmentIds.has(a._id.toString())) {
        pendingAssignments++;
      }
    }

    // Upcoming assessments in student's batches
    const assessmentQuery: Record<string, any> = {
      status: 'PUBLISHED',
      batchId: { $in: enrolledBatchObjectIds },
      dueAt: { $gte: now },
    };
    if (courseFilter) assessmentQuery.courseId = courseFilter;
    const upcomingAssessments = await AssessmentModel.countDocuments(assessmentQuery);

    // 5. Learning Streak (Deterministic Calendar Days)
    const activityDates = new Set<string>();

    for (const att of filteredAttempts) {
      if (att.submittedAt) {
        const dStr = new Date(att.submittedAt).toISOString().split('T')[0];
        if (dStr) activityDates.add(dStr);
      }
    }

    for (const sub of submissions) {
      if (sub.submittedAt) {
        const dStr = new Date(sub.submittedAt).toISOString().split('T')[0];
        if (dStr) activityDates.add(dStr);
      }
    }

    for (const attRec of attendanceRecords) {
      if (attRec.createdAt) {
        const dStr = new Date(attRec.createdAt).toISOString().split('T')[0];
        if (dStr) activityDates.add(dStr);
      }
    }

    for (const enr of enrollments) {
      if (enr.progress?.lastAccessedAt) {
        const dStr = new Date(enr.progress.lastAccessedAt).toISOString().split('T')[0];
        if (dStr) activityDates.add(dStr);
      }
    }

    const learningStreak = this.calculateStreak(activityDates);

    // 6. Subject Performance
    const subjects = await Subject.find({
      courseId: { $in: enrolledCourseObjectIds },
    }).lean();

    const subjectPerformanceMap: Record<string, { name: string; code: string; totalScores: number; count: number; assignments: number }> = {};
    for (const sub of subjects) {
      subjectPerformanceMap[sub._id.toString()] = {
        name: sub.title,
        code: sub.code,
        totalScores: 0,
        count: 0,
        assignments: 0,
      };
    }

    // Map graded attempts to subjects
    for (const att of filteredAttempts) {
      const subId = (att.assessmentId as any)?.subjectId?.toString();
      if (subId && subjectPerformanceMap[subId]) {
        const score = att.percentage ?? (att.totalMarks > 0 ? (att.obtainedMarks ?? 0) / att.totalMarks * 100 : 0);
        subjectPerformanceMap[subId].totalScores += score;
        subjectPerformanceMap[subId].count++;
      }
    }

    const subjectPerformance: ISubjectPerformance[] = Object.entries(subjectPerformanceMap)
      .map(([id, data]) => ({
        subjectId: id,
        subjectName: data.name,
        subjectCode: data.code,
        averageScorePercentage: data.count > 0 ? Math.round((data.totalScores / data.count) * 100) / 100 : 0,
        totalAssessments: data.count,
        totalAssignments: data.assignments,
      }))
      .filter((sp) => sp.totalAssessments > 0 || totalEnrolledCourses > 0);

    // 7. Recent Activity Trend (Last 14 days)
    const recentActivityTrend: Array<{ date: string; activityCount: number }> = [];
    const daysToShow = 14;
    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0] ?? '';
      let count = 0;

      for (const att of filteredAttempts) {
        if (att.submittedAt && new Date(att.submittedAt).toISOString().split('T')[0] === dateStr) count++;
      }
      for (const sub of submissions) {
        if (sub.submittedAt && new Date(sub.submittedAt).toISOString().split('T')[0] === dateStr) count++;
      }
      for (const attRec of attendanceRecords) {
        if (attRec.createdAt && new Date(attRec.createdAt).toISOString().split('T')[0] === dateStr) count++;
      }

      recentActivityTrend.push({ date: dateStr, activityCount: count });
    }

    const summary: IStudentAnalyticsSummary = {
      courseCompletion,
      assessmentScore,
      attendanceRate,
      learningStreak,
      totalEnrolledCourses,
      completedCourses,
      pendingAssignments,
      upcomingAssessments,
    };

    return {
      summary,
      subjectPerformance,
      recentActivityTrend,
    };
  }

  /**
   * Calculates consecutive active calendar days up to today or yesterday.
   */
  private static calculateStreak(uniqueDates: Set<string>): number {
    if (uniqueDates.size === 0) return 0;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0] ?? '';

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0] ?? '';

    // If neither today nor yesterday has activity, streak is broken
    let currentCheckDate: Date;
    if (uniqueDates.has(todayStr)) {
      currentCheckDate = today;
    } else if (uniqueDates.has(yesterdayStr)) {
      currentCheckDate = yesterday;
    } else {
      return 0;
    }

    let streak = 0;
    while (true) {
      const dateStr = currentCheckDate.toISOString().split('T')[0] ?? '';
      if (uniqueDates.has(dateStr)) {
        streak++;
        // Move back 1 day
        currentCheckDate.setDate(currentCheckDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }
}
