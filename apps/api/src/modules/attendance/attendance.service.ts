import mongoose from 'mongoose';
import {
  AttendanceRecord,
  AttendanceSession,
  toIAttendanceRecord,
  toIAttendanceSession,
  type AttendanceRecordDocument,
  type AttendanceSessionDocument,
} from './attendance.model.js';
import { ClassSession, type ClassSessionDocument } from '../learning/class-session.model.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { User } from '../users/user.model.js';
import { GuardianLink } from '../users/guardian-link.model.js';
import { NotificationDispatcher } from '../communication/notification-dispatcher.js';
import {
  AttendanceStatus,
  AttendanceSessionStatus,
  EnrollmentStatus,
  UserRole,
  type IAttendanceRecord,
  type IAttendanceRosterResponse,
  type IAttendanceRosterStudent,
  type IAttendanceSummary,
  type MarkStudentAttendanceDto,
  type BulkMarkAttendanceDto,
  type FinalizeAttendanceDto,
  type CorrectAttendanceDto,
} from '@eta/types';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../common/errors.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction, AuditCategory, AuditSeverity, AuditResult, AuditActorType } from '@eta/types';

export class AttendanceService {
  // ==========================================================================
  // Authorization Helpers
  // ==========================================================================

  /**
   * Verify teacher assignment to course, batch, or classSession; or admin privilege.
   */
  public static async verifyTeacherOrAdmin(
    actorId: string,
    actorRoles: UserRole[],
    classSession: ClassSessionDocument,
  ): Promise<void> {
    if (actorRoles.includes(UserRole.ADMIN) || actorRoles.includes(UserRole.SUPER_ADMIN)) {
      return;
    }

    if (!actorRoles.includes(UserRole.TEACHER)) {
      throw new ForbiddenError('Only assigned teachers or administrators can manage attendance.');
    }

    // 1. Direct class session teacher
    if (classSession.teacherId.toString() === actorId) {
      return;
    }

    // 2. Batch assigned teacher
    if (classSession.batchId) {
      const batch = await Batch.findById(classSession.batchId).select('teacherIds').lean();
      if (batch && batch.teacherIds?.some((id) => id.toString() === actorId)) {
        return;
      }
    }

    // 3. Course assigned teacher
    if (classSession.courseId) {
      const course = await Course.findById(classSession.courseId).select('teacherIds').lean();
      if (course && course.teacherIds?.some((id) => id.toString() === actorId)) {
        return;
      }
    }

    throw new ForbiddenError('You are not assigned to teach this class session or its batch/course.');
  }

  /**
   * Ensure student identity or authorized guardian/teacher/admin viewing.
   */
  public static async verifyStudentAccess(
    actorId: string,
    actorRoles: UserRole[],
    targetStudentId?: string,
  ): Promise<string> {
    if (!targetStudentId || targetStudentId === actorId) {
      return actorId;
    }

    // Broad privileges
    if (
      actorRoles.includes(UserRole.ADMIN) ||
      actorRoles.includes(UserRole.SUPER_ADMIN) ||
      actorRoles.includes(UserRole.STAFF)
    ) {
      return targetStudentId;
    }

    // If teacher, check if teacher teaches any batch of this student
    if (actorRoles.includes(UserRole.TEACHER)) {
      const studentEnrollments = await Enrollment.find({
        studentId: targetStudentId,
        status: EnrollmentStatus.ACTIVE,
      }).select('batchId courseId').lean();

      for (const enr of studentEnrollments) {
        const batch = await Batch.findById(enr.batchId).select('teacherIds').lean();
        if (batch?.teacherIds?.some((id) => id.toString() === actorId)) {
          return targetStudentId;
        }
        const course = await Course.findById(enr.courseId).select('teacherIds').lean();
        if (course?.teacherIds?.some((id) => id.toString() === actorId)) {
          return targetStudentId;
        }
      }
    }

    // If guardian, check active relationship link
    if (actorRoles.includes(UserRole.GUARDIAN)) {
      const link = await GuardianLink.findOne({
        guardianId: actorId,
        studentId: targetStudentId,
        status: 'ACTIVE',
      }).lean();
      if (link) {
        return targetStudentId;
      }
    }

    // IDOR protection
    throw new ForbiddenError("You are not authorized to view another student's attendance records.");
  }

  // ==========================================================================
  // Core Workflows
  // ==========================================================================

  /**
   * Get eligible student roster and current attendance state for a class session.
   */
  public static async getClassRoster(
    actorId: string,
    actorRoles: UserRole[],
    classSessionId: string,
  ): Promise<IAttendanceRosterResponse> {
    if (!mongoose.Types.ObjectId.isValid(classSessionId)) {
      throw new BadRequestError('Invalid classSessionId');
    }

    const classSession = await ClassSession.findById(classSessionId);
    if (!classSession) {
      throw new NotFoundError('Class session not found');
    }

    await this.verifyTeacherOrAdmin(actorId, actorRoles, classSession);

    // Fetch batch and course info
    const batch = await Batch.findById(classSession.batchId).select('batchName').lean();
    const course = await Course.findById(classSession.courseId).select('title').lean();
    const teacher = await User.findById(classSession.teacherId).select('name').lean();

    // Find or create AttendanceSession
    let attendanceSession = await AttendanceSession.findOne({ classSessionId });
    if (!attendanceSession) {
      attendanceSession = await AttendanceSession.create({
        classSessionId: classSession._id,
        courseId: classSession.courseId,
        batchId: classSession.batchId,
        status: AttendanceSessionStatus.OPEN,
        openedBy: actorId,
        openedAt: new Date(),
      });
    }

    // Query active enrollments for this batch
    const activeEnrollments = await Enrollment.find({
      batchId: classSession.batchId,
      status: EnrollmentStatus.ACTIVE,
    })
      .populate('studentId', 'name email avatarUrl phone')
      .lean();

    // Query existing marked attendance records for this class session
    const existingRecords = await AttendanceRecord.find({ classSessionId }).lean();
    const recordByStudentId = new Map<string, any>();
    for (const rec of existingRecords) {
      recordByStudentId.set(rec.studentId.toString(), rec);
    }

    // Build roster items
    const roster: IAttendanceRosterStudent[] = [];
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    let leaveCount = 0;
    let unmarkedCount = 0;

    for (const enr of activeEnrollments) {
      const student = enr.studentId as any;
      if (!student || !student._id) continue;

      const sId = student._id.toString();
      const existing = recordByStudentId.get(sId);

      if (existing) {
        roster.push({
          studentId: sId,
          studentName: student.name || 'Unnamed Student',
          studentEmail: student.email || '',
          avatarUrl: student.avatarUrl ?? null,
          status: existing.status,
          markedAt: existing.markedAt ? new Date(existing.markedAt).toISOString() : null,
          markedBy: existing.markedBy ? existing.markedBy.toString() : null,
          note: existing.note ?? null,
          recordId: existing._id.toString(),
        });

        switch (existing.status) {
          case AttendanceStatus.PRESENT:
            presentCount++;
            break;
          case AttendanceStatus.ABSENT:
            absentCount++;
            break;
          case AttendanceStatus.LATE:
            lateCount++;
            break;
          case AttendanceStatus.EXCUSED:
            excusedCount++;
            break;
          case AttendanceStatus.LEAVE:
            leaveCount++;
            break;
        }
      } else {
        roster.push({
          studentId: sId,
          studentName: student.name || 'Unnamed Student',
          studentEmail: student.email || '',
          avatarUrl: student.avatarUrl ?? null,
          status: null,
          markedAt: null,
          markedBy: null,
          note: null,
          recordId: null,
        });
        unmarkedCount++;
      }
    }

    // Sort roster alphabetically by student name
    roster.sort((a, b) => a.studentName.localeCompare(b.studentName));

    const isFinalized = attendanceSession.status === AttendanceSessionStatus.FINALIZED;

    return {
      classSession: {
        _id: classSession._id.toString(),
        title: classSession.title,
        batchId: classSession.batchId.toString(),
        batchName: batch?.batchName,
        courseId: classSession.courseId.toString(),
        courseTitle: course?.title,
        teacherId: classSession.teacherId.toString(),
        teacherName: teacher?.name,
        scheduledStart: classSession.scheduledStart.toISOString(),
        scheduledEnd: classSession.scheduledEnd.toISOString(),
        status: classSession.status,
      },
      attendanceSession: toIAttendanceSession(attendanceSession),
      isFinalized,
      roster,
      stats: {
        totalEligible: roster.length,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        excused: excusedCount,
        leave: leaveCount,
        unmarked: unmarkedCount,
      },
    };
  }

  /**
   * Mark attendance for a single student in a class session.
   */
  public static async markSingleAttendance(
    actorId: string,
    actorRoles: UserRole[],
    classSessionId: string,
    dto: MarkStudentAttendanceDto,
  ): Promise<IAttendanceRecord> {
    if (!mongoose.Types.ObjectId.isValid(classSessionId)) {
      throw new BadRequestError('Invalid classSessionId');
    }
    if (!mongoose.Types.ObjectId.isValid(dto.studentId)) {
      throw new BadRequestError('Invalid studentId');
    }

    const classSession = await ClassSession.findById(classSessionId);
    if (!classSession) {
      throw new NotFoundError('Class session not found');
    }

    await this.verifyTeacherOrAdmin(actorId, actorRoles, classSession);

    // Verify session is not already finalized
    const attendanceSession = await AttendanceSession.findOne({ classSessionId });
    if (attendanceSession?.status === AttendanceSessionStatus.FINALIZED) {
      throw new ForbiddenError(
        'Attendance is finalized for this session. Use the correction endpoint to adjust records.',
      );
    }

    // Verify student is actively enrolled in this batch
    const enrollment = await Enrollment.findOne({
      batchId: classSession.batchId,
      studentId: dto.studentId,
      status: EnrollmentStatus.ACTIVE,
    });
    if (!enrollment) {
      throw new BadRequestError(
        'Student is not actively enrolled in the batch for this class session.',
      );
    }

    // Upsert record atomically
    const record = await AttendanceRecord.findOneAndUpdate(
      { classSessionId, studentId: dto.studentId },
      {
        $set: {
          classSessionId: classSession._id,
          attendanceSessionId: attendanceSession?._id ?? null,
          courseId: classSession.courseId,
          batchId: classSession.batchId,
          studentId: new mongoose.Types.ObjectId(dto.studentId),
          status: dto.status,
          markedBy: new mongoose.Types.ObjectId(actorId),
          markedAt: new Date(),
          note: dto.note ?? null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return toIAttendanceRecord(record);
  }

  /**
   * Bulk mark attendance for eligible roster students.
   */
  public static async bulkMarkAttendance(
    actorId: string,
    actorRoles: UserRole[],
    classSessionId: string,
    dto: BulkMarkAttendanceDto,
  ): Promise<IAttendanceRosterResponse> {
    if (!mongoose.Types.ObjectId.isValid(classSessionId)) {
      throw new BadRequestError('Invalid classSessionId');
    }

    const classSession = await ClassSession.findById(classSessionId);
    if (!classSession) {
      throw new NotFoundError('Class session not found');
    }

    await this.verifyTeacherOrAdmin(actorId, actorRoles, classSession);

    // Ensure session or attendanceSession is open
    let attendanceSession = await AttendanceSession.findOne({ classSessionId });
    if (attendanceSession?.status === AttendanceSessionStatus.FINALIZED) {
      throw new ForbiddenError(
        'Attendance has already been finalized. Use the correction workflow to modify records.',
      );
    }
    if (!attendanceSession) {
      attendanceSession = await AttendanceSession.create({
        classSessionId: classSession._id,
        courseId: classSession.courseId,
        batchId: classSession.batchId,
        status: AttendanceSessionStatus.OPEN,
        openedBy: actorId,
        openedAt: new Date(),
      });
    }

    // Query all active enrollments for this batch to validate roster membership
    const activeEnrollments = await Enrollment.find({
      batchId: classSession.batchId,
      status: EnrollmentStatus.ACTIVE,
    }).select('studentId').lean();

    const activeStudentIds = new Set(activeEnrollments.map((e) => e.studentId.toString()));

    // Verify all submitted students are actively enrolled
    for (const item of dto.records) {
      if (!activeStudentIds.has(item.studentId)) {
        throw new BadRequestError(
          `Student with ID ${item.studentId} is not actively enrolled in this batch.`,
        );
      }
    }

    // Execute bulk upserts
    const bulkOps = dto.records.map((item) => ({
      updateOne: {
        filter: { classSessionId: classSession._id, studentId: new mongoose.Types.ObjectId(item.studentId) },
        update: {
          $set: {
            classSessionId: classSession._id,
            attendanceSessionId: attendanceSession._id,
            courseId: classSession.courseId,
            batchId: classSession.batchId,
            studentId: new mongoose.Types.ObjectId(item.studentId),
            status: item.status,
            markedBy: new mongoose.Types.ObjectId(actorId),
            markedAt: new Date(),
            note: item.note ?? null,
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await AttendanceRecord.bulkWrite(bulkOps);
    }

    return this.getClassRoster(actorId, actorRoles, classSessionId);
  }

  /**
   * Finalize attendance session. Automatically marks unmarked students as ABSENT if requested.
   */
  public static async finalizeAttendance(
    actorId: string,
    actorRoles: UserRole[],
    classSessionId: string,
    dto: FinalizeAttendanceDto,
  ): Promise<IAttendanceRosterResponse> {
    if (!mongoose.Types.ObjectId.isValid(classSessionId)) {
      throw new BadRequestError('Invalid classSessionId');
    }

    const classSession = await ClassSession.findById(classSessionId);
    if (!classSession) {
      throw new NotFoundError('Class session not found');
    }

    await this.verifyTeacherOrAdmin(actorId, actorRoles, classSession);

    let attendanceSession = await AttendanceSession.findOne({ classSessionId });
    if (!attendanceSession) {
      attendanceSession = await AttendanceSession.create({
        classSessionId: classSession._id,
        courseId: classSession.courseId,
        batchId: classSession.batchId,
        status: AttendanceSessionStatus.OPEN,
        openedBy: actorId,
        openedAt: new Date(),
      });
    }

    if (attendanceSession.status === AttendanceSessionStatus.FINALIZED) {
      return this.getClassRoster(actorId, actorRoles, classSessionId);
    }

    // If autoMarkAbsentForUnmarked (default true), find all unmarked active students and mark them ABSENT
    const shouldMarkAbsent = dto.autoMarkAbsentForUnmarked !== false;
    if (shouldMarkAbsent) {
      const activeEnrollments = await Enrollment.find({
        batchId: classSession.batchId,
        status: EnrollmentStatus.ACTIVE,
      }).select('studentId').lean();

      const existingRecords = await AttendanceRecord.find({ classSessionId }).select('studentId').lean();
      const recordedStudentIds = new Set(existingRecords.map((r) => r.studentId.toString()));

      const unmarkedEnrollments = activeEnrollments.filter(
        (e) => !recordedStudentIds.has(e.studentId.toString()),
      );

      if (unmarkedEnrollments.length > 0) {
        const absentOps = unmarkedEnrollments.map((e) => ({
          updateOne: {
            filter: { classSessionId: classSession._id, studentId: e.studentId },
            update: {
              $set: {
                classSessionId: classSession._id,
                attendanceSessionId: attendanceSession._id,
                courseId: classSession.courseId,
                batchId: classSession.batchId,
                studentId: e.studentId,
                status: AttendanceStatus.ABSENT,
                markedBy: new mongoose.Types.ObjectId(actorId),
                markedAt: new Date(),
                note: 'Automatically marked absent on finalization',
              },
            },
            upsert: true,
          },
        }));

        await AttendanceRecord.bulkWrite(absentOps);
      }
    }

    // Finalize session
    attendanceSession.status = AttendanceSessionStatus.FINALIZED;
    attendanceSession.finalizedBy = new mongoose.Types.ObjectId(actorId);
    attendanceSession.finalizedAt = new Date();
    if (dto.notes) {
      attendanceSession.notes = dto.notes;
    }
    await attendanceSession.save();

    // Side-effect: query finalized records and dispatch student/guardian attendance notifications
    AttendanceRecord.find({ classSessionId })
      .select('studentId status')
      .lean()
      .then((records) => {
        NotificationDispatcher.dispatchAttendanceFinalized(
          classSession.batchId.toString(),
          records.map((r) => ({ studentId: r.studentId.toString(), status: r.status })),
        ).catch((err) => {
          console.error('[AttendanceService] Notification dispatch failed:', err?.message || err);
        });
      })
      .catch((err) => {
        console.error('[AttendanceService] Failed to query records for notification:', err?.message || err);
      });

    await AuditService.record({
      actor: {
        id: actorId,
        role: actorRoles[0],
        type: AuditActorType.USER,
      },
      action: AuditAction.ATTENDANCE_FINALIZED,
      category: AuditCategory.ATTENDANCE,
      resourceType: 'AttendanceSession',
      resourceId: attendanceSession._id.toString(),
      scope: {
        courseId: classSession.courseId?.toString(),
        batchId: classSession.batchId?.toString(),
      },
      newValue: {
        status: AttendanceSessionStatus.FINALIZED,
        classSessionId,
        notes: dto.notes,
      },
      severity: AuditSeverity.MEDIUM,
      result: AuditResult.SUCCESS,
    });

    return this.getClassRoster(actorId, actorRoles, classSessionId);
  }

  /**
   * Correct an attendance record after finalization with full audit trail.
   */
  public static async correctAttendanceRecord(
    actorId: string,
    actorRoles: UserRole[],
    recordId: string,
    dto: CorrectAttendanceDto,
  ): Promise<IAttendanceRecord> {
    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      throw new BadRequestError('Invalid recordId');
    }

    const record = await AttendanceRecord.findById(recordId);
    if (!record) {
      throw new NotFoundError('Attendance record not found');
    }

    const classSession = await ClassSession.findById(record.classSessionId);
    if (!classSession) {
      throw new NotFoundError('Class session not found');
    }

    await this.verifyTeacherOrAdmin(actorId, actorRoles, classSession);

    const previousStatus = record.status;
    record.corrections.push({
      previousStatus,
      newStatus: dto.status,
      changedBy: new mongoose.Types.ObjectId(actorId),
      changedAt: new Date(),
      reason: dto.reason,
    });

    record.status = dto.status;
    record.markedBy = new mongoose.Types.ObjectId(actorId);
    record.markedAt = new Date();
    await record.save();

    await AuditService.record({
      actor: {
        id: actorId,
        role: actorRoles[0],
        type: AuditActorType.USER,
      },
      action: AuditAction.ATTENDANCE_CORRECTED,
      category: AuditCategory.ATTENDANCE,
      resourceType: 'AttendanceRecord',
      resourceId: record._id.toString(),
      scope: {
        studentId: record.studentId?.toString(),
        courseId: record.courseId?.toString(),
        batchId: record.batchId?.toString(),
      },
      previousValue: {
        status: previousStatus,
      },
      newValue: {
        status: record.status,
      },
      reason: dto.reason,
      severity: AuditSeverity.HIGH,
      result: AuditResult.SUCCESS,
    });

    return toIAttendanceRecord(record);
  }

  /**
   * Student attendance history and calculated summary statistics.
   */
  public static async getStudentAttendance(
    actorId: string,
    actorRoles: UserRole[],
    targetStudentId?: string,
    filter?: { courseId?: string; batchId?: string },
  ): Promise<{
    records: IAttendanceRecord[];
    summary: IAttendanceSummary;
  }> {
    const studentId = await this.verifyStudentAccess(actorId, actorRoles, targetStudentId);

    const query: Record<string, any> = {
      studentId: new mongoose.Types.ObjectId(studentId),
    };

    if (filter?.courseId && mongoose.Types.ObjectId.isValid(filter.courseId)) {
      query.courseId = new mongoose.Types.ObjectId(filter.courseId);
    }
    if (filter?.batchId && mongoose.Types.ObjectId.isValid(filter.batchId)) {
      query.batchId = new mongoose.Types.ObjectId(filter.batchId);
    }

    const records = await AttendanceRecord.find(query)
      .populate('classSessionId', 'title scheduledStart scheduledEnd status')
      .populate('batchId', 'batchName batchCode')
      .populate('courseId', 'title code')
      .sort({ createdAt: -1 })
      .lean();

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    let leaveCount = 0;

    const mappedRecords: IAttendanceRecord[] = records.map((r: any) => {
      switch (r.status) {
        case AttendanceStatus.PRESENT:
          presentCount++;
          break;
        case AttendanceStatus.ABSENT:
          absentCount++;
          break;
        case AttendanceStatus.LATE:
          lateCount++;
          break;
        case AttendanceStatus.EXCUSED:
          excusedCount++;
          break;
        case AttendanceStatus.LEAVE:
          leaveCount++;
          break;
      }

      return toIAttendanceRecord(r, {
        classTitle: r.classSessionId?.title,
        batchName: r.batchId?.batchName,
        courseTitle: r.courseId?.title,
      });
    });

    const totalClasses = mappedRecords.length;
    // Calculation formula: (present + late) / totalClasses * 100
    const attendancePercentage =
      totalClasses > 0 ? Math.round(((presentCount + lateCount) / totalClasses) * 100) : 100;

    const summary: IAttendanceSummary = {
      totalClasses,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      leaveCount,
      attendancePercentage,
    };

    return {
      records: mappedRecords,
      summary,
    };
  }

  /**
   * List sessions with attendance summaries for teacher / admin overview.
   */
  public static async listSessionsWithAttendance(
    actorId: string,
    actorRoles: UserRole[],
    filter?: { courseId?: string; batchId?: string },
  ): Promise<any[]> {
    const query: Record<string, any> = {};

    if (filter?.courseId && mongoose.Types.ObjectId.isValid(filter.courseId)) {
      query.courseId = new mongoose.Types.ObjectId(filter.courseId);
    }
    if (filter?.batchId && mongoose.Types.ObjectId.isValid(filter.batchId)) {
      query.batchId = new mongoose.Types.ObjectId(filter.batchId);
    }

    // If teacher, only include sessions they teach or where they are assigned to batch/course
    if (
      !actorRoles.includes(UserRole.ADMIN) &&
      !actorRoles.includes(UserRole.SUPER_ADMIN) &&
      actorRoles.includes(UserRole.TEACHER)
    ) {
      const assignedBatches = await Batch.find({ teacherIds: actorId }).select('_id').lean();
      const assignedCourses = await Course.find({ teacherIds: actorId }).select('_id').lean();
      const batchIds = assignedBatches.map((b) => b._id);
      const courseIds = assignedCourses.map((c) => c._id);

      query.$or = [
        { teacherId: actorId },
        { batchId: { $in: batchIds } },
        { courseId: { $in: courseIds } },
      ];
    }

    const classSessions = await ClassSession.find(query)
      .populate('courseId', 'title code')
      .populate('batchId', 'batchName batchCode')
      .populate('teacherId', 'name email')
      .sort({ scheduledStart: -1 })
      .limit(100)
      .lean();

    const sessionIds = classSessions.map((cs) => cs._id);
    const attendanceSessions = await AttendanceSession.find({
      classSessionId: { $in: sessionIds },
    }).lean();
    const attendanceSessionMap = new Map<string, any>();
    for (const as of attendanceSessions) {
      attendanceSessionMap.set(as.classSessionId.toString(), as);
    }

    // Count marked records per class session
    const recordCounts = await AttendanceRecord.aggregate([
      { $match: { classSessionId: { $in: sessionIds } } },
      {
        $group: {
          _id: '$classSessionId',
          totalMarked: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $eq: ['$status', AttendanceStatus.PRESENT] }, 1, 0] },
          },
          absent: {
            $sum: { $cond: [{ $eq: ['$status', AttendanceStatus.ABSENT] }, 1, 0] },
          },
          late: {
            $sum: { $cond: [{ $eq: ['$status', AttendanceStatus.LATE] }, 1, 0] },
          },
        },
      },
    ]);

    const recordCountMap = new Map<string, any>();
    for (const rc of recordCounts) {
      recordCountMap.set(rc._id.toString(), rc);
    }

    return classSessions.map((cs: any) => {
      const csId = cs._id.toString();
      const attSession = attendanceSessionMap.get(csId);
      const counts = recordCountMap.get(csId) || {
        totalMarked: 0,
        present: 0,
        absent: 0,
        late: 0,
      };

      return {
        _id: csId,
        title: cs.title,
        scheduledStart: cs.scheduledStart,
        scheduledEnd: cs.scheduledEnd,
        status: cs.status,
        courseTitle: cs.courseId?.title,
        batchName: cs.batchId?.batchName,
        teacherName: cs.teacherId?.name,
        attendanceStatus: attSession?.status || AttendanceSessionStatus.NOT_STARTED,
        attendanceSessionId: attSession?._id?.toString() || null,
        finalizedAt: attSession?.finalizedAt || null,
        stats: counts,
      };
    });
  }
}
