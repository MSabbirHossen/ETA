import mongoose from 'mongoose';
import {
  EnrollmentStatus,
  AttendanceStatus,
  type ITeacherAnalytics,
  type ITeacherAnalyticsSummary,
  type IStrugglingStudent,
  type IUngradedWorkItem,
  type ITeacherBatchBreakdown,
} from '@eta/types';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { AttendanceRecord, AttendanceSession } from '../attendance/attendance.model.js';
import { Assignment } from '../assignment/assignment.model.js';
import { AssignmentSubmission } from '../assignment/submission.model.js';
import { AssessmentModel } from '../assessment/assessment.model.js';
import { AssessmentAttemptModel } from '../assessment/attempt.model.js';
import { User } from '../users/user.model.js';
import { ForbiddenError } from '../../common/errors.js';

export class TeacherAnalyticsService {
  /**
   * Computes teacher analytics scoped to assigned courses and batches (PRD §54.2).
   */
  public static async getTeacherAnalytics(
    teacherId: string,
    filters?: { from?: string; to?: string; courseId?: string; batchId?: string }
  ): Promise<ITeacherAnalytics> {
    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);

    // 1. Resolve Assigned Scope
    const assignedCourses = await Course.find({ teacherIds: teacherObjectId }).select('_id title code').lean();
    const assignedBatches = await Batch.find({ teacherIds: teacherObjectId }).select('_id batchName batchCode courseId').lean();

    const assignedCourseIds = assignedCourses.map((c) => c._id.toString());
    const assignedBatchIds = assignedBatches.map((b) => b._id.toString());

    // Validate requested filter boundaries against assigned scope
    if (filters?.courseId && !assignedCourseIds.includes(filters.courseId)) {
      throw new ForbiddenError('Unauthorized: You are not assigned to this course.');
    }
    if (filters?.batchId && !assignedBatchIds.includes(filters.batchId)) {
      throw new ForbiddenError('Unauthorized: You are not assigned to this batch.');
    }

    const targetCourseIds = filters?.courseId
      ? [new mongoose.Types.ObjectId(filters.courseId)]
      : assignedCourses.map((c) => c._id);

    const targetBatchIds = filters?.batchId
      ? [new mongoose.Types.ObjectId(filters.batchId)]
      : assignedBatches.map((b) => b._id);

    // 2. Enrolled Students in Scope
    const enrollments = await Enrollment.find({
      batchId: { $in: targetBatchIds },
      status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
    })
      .populate('studentId', 'name email')
      .populate('batchId', 'batchName')
      .populate('courseId', 'title')
      .lean();

    const uniqueStudentIds = Array.from(
      new Set(enrollments.map((e: any) => (e.studentId?._id || e.studentId)?.toString()).filter(Boolean))
    );
    const totalStudents = uniqueStudentIds.length;

    // Average Student Progress
    let progressSum = 0;
    for (const enr of enrollments) {
      progressSum += enr.progress?.completionPercentage ?? 0;
    }
    const averageStudentProgress =
      enrollments.length > 0 ? Math.round(progressSum / enrollments.length) : 0;

    // 3. Class Attendance Rate
    const attendanceRecordQuery: Record<string, any> = {
      batchId: { $in: targetBatchIds },
    };
    if (filters?.from || filters?.to) {
      attendanceRecordQuery.createdAt = {};
      if (filters.from) attendanceRecordQuery.createdAt.$gte = new Date(filters.from);
      if (filters.to) attendanceRecordQuery.createdAt.$lte = new Date(filters.to);
    }

    const attendanceRecords = await AttendanceRecord.find(attendanceRecordQuery).lean();
    let presentCount = 0;
    let lateCount = 0;
    for (const r of attendanceRecords) {
      if (r.status === AttendanceStatus.PRESENT) presentCount++;
      else if (r.status === AttendanceStatus.LATE) lateCount++;
    }
    const totalAttendanceCount = attendanceRecords.length;
    const classAttendanceRate =
      totalAttendanceCount > 0
        ? Math.round(((presentCount + lateCount) / totalAttendanceCount) * 100)
        : 100;

    // 4. Assignment Completion Rate
    const assignmentQuery: Record<string, any> = {
      batchId: { $in: targetBatchIds },
      status: 'PUBLISHED',
    };
    const publishedAssignments = await Assignment.find(assignmentQuery).select('_id title batchId dueDate').lean();
    const assignmentIds = publishedAssignments.map((a) => a._id);

    const submissions = await AssignmentSubmission.find({
      assignmentId: { $in: assignmentIds },
      status: { $in: ['SUBMITTED', 'RESUBMITTED', 'GRADED'] },
    }).lean();

    // Denominator = total published assignments * students enrolled per batch
    let totalEligiblePairs = 0;
    for (const assign of publishedAssignments) {
      const batchEnrollmentCount = enrollments.filter(
        (e: any) => (e.batchId?._id || e.batchId)?.toString() === assign.batchId?.toString()
      ).length;
      totalEligiblePairs += batchEnrollmentCount;
    }

    const assignmentCompletionRate =
      totalEligiblePairs > 0
        ? Math.min(100, Math.round((submissions.length / totalEligiblePairs) * 100))
        : 100;

    // 5. Average Quiz Result
    const assessmentQuery: Record<string, any> = {
      batchId: { $in: targetBatchIds },
    };
    const assessments = await AssessmentModel.find(assessmentQuery).select('_id title').lean();
    const assessmentIds = assessments.map((a: any) => a._id);

    const gradedAttempts = await AssessmentAttemptModel.find({
      assessmentId: { $in: assessmentIds },
      status: 'GRADED',
    }).lean();

    let quizScoreSum = 0;
    for (const att of gradedAttempts) {
      quizScoreSum += att.percentage ?? (att.totalMarks > 0 ? (att.obtainedMarks ?? 0) / att.totalMarks * 100 : 0);
    }
    const averageQuizResult =
      gradedAttempts.length > 0 ? Math.round((quizScoreSum / gradedAttempts.length) * 100) / 100 : null;

    // 6. Ungraded Work
    const pendingSubmissions = await AssignmentSubmission.find({
      assignmentId: { $in: assignmentIds },
      status: { $in: ['submitted', 'under_review', 'resubmission_requested'] },
    })
      .populate('studentId', 'name')
      .populate('assignmentId', 'title courseId batchId')
      .lean();

    const pendingAttempts = await AssessmentAttemptModel.find({
      assessmentId: { $in: assessmentIds },
      gradingStatus: 'PENDING',
      status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
    })
      .populate('studentId', 'name')
      .populate('assessmentId', 'title')
      .populate('batchId', 'batchName')
      .lean();

    const ungradedWork: IUngradedWorkItem[] = [];

    for (const s of pendingSubmissions) {
      const assign = s.assignmentId as any;
      const course = assignedCourses.find((c) => c._id.toString() === assign?.courseId?.toString());
      const batch = assignedBatches.find((b) => b._id.toString() === assign?.batchId?.toString());
      ungradedWork.push({
        id: s._id.toString(),
        type: 'ASSIGNMENT',
        title: assign?.title || 'Assignment Submission',
        studentId: (s.studentId as any)?._id?.toString() || s.studentId?.toString(),
        studentName: (s.studentId as any)?.name || 'Student',
        courseTitle: course?.title || 'Course',
        batchName: batch?.batchName || 'Batch',
        submittedAt: s.submittedAt ? new Date(s.submittedAt).toISOString() : new Date().toISOString(),
      });
    }

    for (const att of pendingAttempts) {
      const assess = att.assessmentId as any;
      ungradedWork.push({
        id: att._id.toString(),
        type: 'ASSESSMENT',
        title: assess?.title || 'Assessment Attempt',
        studentId: (att.studentId as any)?._id?.toString() || att.studentId?.toString(),
        studentName: (att.studentId as any)?.name || 'Student',
        courseTitle: 'Assessment',
        batchName: (att.batchId as any)?.batchName || 'Batch',
        submittedAt: att.submittedAt ? new Date(att.submittedAt).toISOString() : new Date().toISOString(),
      });
    }

    // 7. Struggling Students (Explainable Risk Rules: attendance < 75% OR score < 60% OR missing >= 2)
    const now = new Date();
    const strugglingStudents: IStrugglingStudent[] = [];

    // Group attendance by student
    const studentAttendanceMap: Record<string, { present: number; total: number }> = {};
    for (const r of attendanceRecords) {
      const sId = r.studentId.toString();
      if (!studentAttendanceMap[sId]) studentAttendanceMap[sId] = { present: 0, total: 0 };
      studentAttendanceMap[sId].total++;
      if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE) {
        studentAttendanceMap[sId].present++;
      }
    }

    // Group assessment scores by student
    const studentScoreMap: Record<string, { scoreSum: number; count: number }> = {};
    for (const att of gradedAttempts) {
      const sId = att.studentId.toString();
      if (!studentScoreMap[sId]) studentScoreMap[sId] = { scoreSum: 0, count: 0 };
      const pct = att.percentage ?? (att.totalMarks > 0 ? (att.obtainedMarks ?? 0) / att.totalMarks * 100 : 0);
      studentScoreMap[sId].scoreSum += pct;
      studentScoreMap[sId].count++;
    }

    // Group submitted assignment IDs by student
    const studentSubmittedAssignmentsMap: Record<string, Set<string>> = {};
    for (const s of submissions) {
      const sId = s.studentId.toString();
      if (!studentSubmittedAssignmentsMap[sId]) studentSubmittedAssignmentsMap[sId] = new Set();
      studentSubmittedAssignmentsMap[sId].add(s.assignmentId.toString());
    }

    // Evaluate each enrolled student
    for (const enr of enrollments) {
      const sObj = enr.studentId as any;
      if (!sObj) continue;
      const sId = (sObj._id || sObj).toString();

      const reasons: string[] = [];

      // A. Attendance Check
      const attData = studentAttendanceMap[sId];
      const studentAttendanceRate =
        attData && attData.total > 0 ? Math.round((attData.present / attData.total) * 100) : 100;
      if (attData && attData.total >= 2 && studentAttendanceRate < 75) {
        reasons.push(`Attendance rate is ${studentAttendanceRate}% (below 75% requirement)`);
      }

      // B. Assessment Check
      const scoreData = studentScoreMap[sId];
      const studentAvgScore =
        scoreData && scoreData.count > 0 ? Math.round((scoreData.scoreSum / scoreData.count) * 100) / 100 : null;
      if (studentAvgScore !== null && studentAvgScore < 60) {
        reasons.push(`Average assessment score is ${studentAvgScore}% (below 60% passing mark)`);
      }

      // C. Missing Assignments
      const submittedSet = studentSubmittedAssignmentsMap[sId] || new Set();
      let missingCount = 0;
      for (const a of publishedAssignments) {
        if (
          a.batchId?.toString() === (enr.batchId?._id || enr.batchId)?.toString() &&
          a.dueDate &&
          new Date(a.dueDate) < now &&
          !submittedSet.has(a._id.toString())
        ) {
          missingCount++;
        }
      }
      if (missingCount >= 2) {
        reasons.push(`${missingCount} overdue assignments have not been submitted`);
      }

      if (reasons.length > 0) {
        strugglingStudents.push({
          studentId: sId,
          studentName: sObj.name || 'Student',
          studentEmail: sObj.email,
          courseId: (enr.courseId as any)?._id?.toString() || enr.courseId?.toString() || '',
          courseTitle: (enr.courseId as any)?.title || 'Course',
          batchId: (enr.batchId as any)?._id?.toString() || enr.batchId?.toString() || '',
          batchName: (enr.batchId as any)?.batchName || 'Batch',
          attendanceRate: studentAttendanceRate,
          assessmentAverage: studentAvgScore,
          missingAssignmentsCount: missingCount,
          reasons,
        });
      }
    }

    // 8. Batch Breakdown
    const batchBreakdown: ITeacherBatchBreakdown[] = [];
    for (const b of assignedBatches) {
      if (filters?.batchId && b._id.toString() !== filters.batchId) continue;
      const bEnrollments = enrollments.filter(
        (e: any) => (e.batchId?._id || e.batchId)?.toString() === b._id.toString()
      );
      const bRecords = attendanceRecords.filter((r) => r.batchId?.toString() === b._id.toString());
      let bPresent = 0;
      for (const r of bRecords) {
        if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE) bPresent++;
      }
      const bAttRate = bRecords.length > 0 ? Math.round((bPresent / bRecords.length) * 100) : 100;

      const course = assignedCourses.find((c) => c._id.toString() === (b as any).courseId?.toString());
      batchBreakdown.push({
        batchId: b._id.toString(),
        batchName: b.batchName,
        courseTitle: course?.title || 'Course',
        studentCount: bEnrollments.length,
        attendanceRate: bAttRate,
        assignmentCompletionRate,
      });
    }

    const summary: ITeacherAnalyticsSummary = {
      classAttendanceRate,
      assignmentCompletionRate,
      averageQuizResult,
      averageStudentProgress,
      totalAssignedCourses: assignedCourses.length,
      totalAssignedBatches: assignedBatches.length,
      totalStudents,
      ungradedSubmissionsCount: ungradedWork.length,
      strugglingStudentsCount: strugglingStudents.length,
    };

    return {
      summary,
      strugglingStudents,
      ungradedWork,
      batchBreakdown,
    };
  }
}
