import mongoose from 'mongoose';
import {
  UserRole,
  type IUser,
  type ICalendarEvent,
  type CalendarRangeQuery,
  type CalendarRangeResponse,
  type CreateManualCalendarEventDto,
  type UpdateManualCalendarEventDto,
  CalendarEventType,
  CalendarSourceType,
  CalendarEventStatus,
  AnnouncementStatus,
  AssignmentStatus,
  AnnouncementAudience,
} from '@eta/types';
import { NotFoundError, ForbiddenError, ValidationError } from '../../common/errors';
import { ClassSession } from '../learning/class-session.model';
import { Assignment } from '../assignment/assignment.model';
import { AssessmentModel } from '../assessment/assessment.model';
import { Announcement } from '../communication/announcement.model';
import { Batch } from '../academic/batch.model';
import { Enrollment } from '../academic/enrollment.model';
import { GuardianLink } from '../users/guardian-link.model';
import { ManualCalendarEvent, toManualCalendarEventDTO } from './manual-event.model';
import { CalendarProjector } from './calendar-projector';

export class CalendarService {
  /**
   * Retrieve unified calendar events within a specified range
   */
  static async getEvents(
    query: CalendarRangeQuery,
    actor?: IUser,
    activeRole?: UserRole,
  ): Promise<CalendarRangeResponse> {
    const fromDate = new Date(query.from);
    const toDate = new Date(query.to);
    const timezone = query.timezone || actor?.timezone || 'UTC';

    // 1. Resolve Authorization Scope
    const scope = await this.resolveActorScope(actor, activeRole, query.studentId);

    // 2. Fetch parallel domain records within requested date bounds
    const [
      classSessions,
      assignments,
      assessments,
      announcements,
      batches,
      manualEvents,
    ] = await Promise.all([
      this.fetchClassSessions(fromDate, toDate, scope, query),
      this.fetchAssignments(fromDate, toDate, scope, query),
      this.fetchAssessments(fromDate, toDate, scope, query),
      this.fetchAnnouncements(fromDate, toDate, scope, actor, activeRole, query),
      this.fetchBatches(fromDate, toDate, scope, query),
      this.fetchManualEvents(fromDate, toDate, scope, query),
    ]);

    // 3. Project to normalized calendar DTOs
    const projectedEvents: ICalendarEvent[] = [];

    for (const cs of classSessions) {
      projectedEvents.push(CalendarProjector.projectClassSession(cs));
    }

    for (const a of assignments) {
      projectedEvents.push(CalendarProjector.projectAssignment(a));
    }

    for (const asm of assessments) {
      projectedEvents.push(CalendarProjector.projectAssessment(asm));
    }

    for (const ann of announcements) {
      projectedEvents.push(CalendarProjector.projectAnnouncement(ann));
    }

    for (const b of batches) {
      const milestones = CalendarProjector.projectBatchMilestones(b);
      for (const m of milestones) {
        const mTime = new Date(m.startAt).getTime();
        if (mTime >= fromDate.getTime() && mTime <= toDate.getTime()) {
          projectedEvents.push(m);
        }
      }
    }

    for (const me of manualEvents) {
      projectedEvents.push(toManualCalendarEventDTO(me));
    }

    // 4. Apply optional query filters (eventType, sourceType)
    let filtered = projectedEvents;
    if (query.eventType) {
      filtered = filtered.filter((e) => e.eventType === query.eventType);
    }
    if (query.sourceType) {
      filtered = filtered.filter((e) => e.sourceType === query.sourceType);
    }

    // 5. Sort chronologically by startAt
    filtered.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    return {
      events: filtered,
      range: {
        from: query.from,
        to: query.to,
        timezone,
      },
      total: filtered.length,
    };
  }

  /**
   * Create a custom/manual standalone calendar event (Admin/Staff/Teacher within scope)
   */
  static async createManualEvent(
    dto: CreateManualCalendarEventDto,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<ICalendarEvent> {
    const isStaffOrAdmin = actorRoles.some((r) =>
      [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF].includes(r)
    );
    const isTeacher = actorRoles.includes(UserRole.TEACHER);

    if (!isStaffOrAdmin && !isTeacher) {
      throw new ForbiddenError('You do not have permission to create calendar events.');
    }

    // If teacher, ensure they teach the target batch/course
    if (isTeacher && !isStaffOrAdmin) {
      if (!dto.batchId && !dto.courseId) {
        throw new ForbiddenError('Teachers may only create calendar events for their assigned batch or course.');
      }
      if (dto.batchId) {
        const b = await Batch.findOne({
          _id: new mongoose.Types.ObjectId(dto.batchId),
          teacherIds: new mongoose.Types.ObjectId(actorId),
        });
        if (!b) {
          throw new ForbiddenError('You are not assigned to this batch.');
        }
      }
    }

    const doc = new ManualCalendarEvent({
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      startAt: new Date(dto.startAt),
      endAt: dto.endAt ? new Date(dto.endAt) : null,
      allDay: dto.allDay ?? false,
      eventType: dto.eventType ?? CalendarEventType.EVENT,
      status: CalendarEventStatus.SCHEDULED,
      courseId: dto.courseId ? new mongoose.Types.ObjectId(dto.courseId) : null,
      batchId: dto.batchId ? new mongoose.Types.ObjectId(dto.batchId) : null,
      createdBy: new mongoose.Types.ObjectId(actorId),
      isPublic: isStaffOrAdmin ? (dto.isPublic ?? false) : false,
      targetRoles: dto.targetRoles || [],
      actionUrl: dto.actionUrl || null,
    });

    await doc.save();
    return toManualCalendarEventDTO(doc);
  }

  /**
   * Update a custom/manual calendar event
   */
  static async updateManualEvent(
    id: string,
    dto: UpdateManualCalendarEventDto,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<ICalendarEvent> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid calendar event ID.');
    }

    const doc = await ManualCalendarEvent.findById(id);
    if (!doc) {
      throw new NotFoundError('Calendar event not found.');
    }

    const isStaffOrAdmin = actorRoles.some((r) =>
      [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF].includes(r)
    );
    const isCreator = doc.createdBy.toString() === actorId;

    if (!isStaffOrAdmin && !isCreator) {
      throw new ForbiddenError('You do not have permission to edit this calendar event.');
    }

    if (dto.title) doc.title = dto.title.trim();
    if (dto.description !== undefined) doc.description = dto.description?.trim() || null;
    if (dto.startAt) doc.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) doc.endAt = dto.endAt ? new Date(dto.endAt) : null;
    if (dto.allDay !== undefined) doc.allDay = dto.allDay;
    if (dto.eventType) doc.eventType = dto.eventType;
    if (dto.actionUrl !== undefined) doc.actionUrl = dto.actionUrl || null;

    if (isStaffOrAdmin) {
      if (dto.isPublic !== undefined) doc.isPublic = dto.isPublic;
      if (dto.targetRoles !== undefined) doc.targetRoles = dto.targetRoles;
    }

    await doc.save();
    return toManualCalendarEventDTO(doc);
  }

  /**
   * Delete a custom/manual calendar event
   */
  static async deleteManualEvent(
    id: string,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid calendar event ID.');
    }

    const doc = await ManualCalendarEvent.findById(id);
    if (!doc) {
      throw new NotFoundError('Calendar event not found.');
    }

    const isStaffOrAdmin = actorRoles.some((r) =>
      [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF].includes(r)
    );
    const isCreator = doc.createdBy.toString() === actorId;

    if (!isStaffOrAdmin && !isCreator) {
      throw new ForbiddenError('You do not have permission to delete this calendar event.');
    }

    await ManualCalendarEvent.findByIdAndDelete(id);
  }

  // ====================================================
  // PRIVATE DOMAIN QUERY HELPERS
  // ====================================================

  private static async resolveActorScope(
    actor?: IUser,
    activeRole?: UserRole,
    requestedStudentId?: string,
  ): Promise<{
    isPublicOnly: boolean;
    isAdmin: boolean;
    batchIds: mongoose.Types.ObjectId[];
    courseIds: mongoose.Types.ObjectId[];
    teacherId?: mongoose.Types.ObjectId;
    studentId?: mongoose.Types.ObjectId;
  }> {
    // 1. Unauthenticated or Visitor
    if (!actor || activeRole === UserRole.VISITOR) {
      return {
        isPublicOnly: true,
        isAdmin: false,
        batchIds: [],
        courseIds: [],
      };
    }

    // 2. Admin / Super Admin / Staff
    if ([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF].includes(activeRole || UserRole.STUDENT)) {
      return {
        isPublicOnly: false,
        isAdmin: true,
        batchIds: [],
        courseIds: [],
      };
    }

    // 3. Student
    if (activeRole === UserRole.STUDENT) {
      const studentObjId = new mongoose.Types.ObjectId(actor._id);
      const enrollments = await Enrollment.find({
        studentId: studentObjId,
        status: 'active',
      })
        .select('batchId courseId')
        .lean();

      return {
        isPublicOnly: false,
        isAdmin: false,
        studentId: studentObjId,
        batchIds: enrollments.map((e) => new mongoose.Types.ObjectId(e.batchId.toString())),
        courseIds: enrollments.map((e) => new mongoose.Types.ObjectId(e.courseId.toString())),
      };
    }

    // 4. Teacher
    if (activeRole === UserRole.TEACHER) {
      const teacherObjId = new mongoose.Types.ObjectId(actor._id);
      const batches = await Batch.find({
        teacherIds: teacherObjId,
      })
        .select('_id courseId')
        .lean();

      return {
        isPublicOnly: false,
        isAdmin: false,
        teacherId: teacherObjId,
        batchIds: batches.map((b) => new mongoose.Types.ObjectId(b._id.toString())),
        courseIds: batches.map((b) => new mongoose.Types.ObjectId(b.courseId.toString())),
      };
    }

    // 5. Guardian
    if (activeRole === UserRole.GUARDIAN) {
      const guardianObjId = new mongoose.Types.ObjectId(actor._id);
      const linksQuery: Record<string, any> = {
        guardianId: guardianObjId,
        status: 'ACTIVE',
        verified: true,
      };

      if (requestedStudentId) {
        if (!mongoose.Types.ObjectId.isValid(requestedStudentId)) {
          throw new ValidationError('Invalid requested student ID format.');
        }
        linksQuery.studentId = new mongoose.Types.ObjectId(requestedStudentId);
      }

      const activeLinks = await GuardianLink.find(linksQuery)
        .select('studentId')
        .lean();

      if (activeLinks.length === 0) {
        return {
          isPublicOnly: false,
          isAdmin: false,
          batchIds: [],
          courseIds: [],
        };
      }

      const eligibleStudentIds = activeLinks.map((l) => new mongoose.Types.ObjectId(l.studentId.toString()));
      const enrollments = await Enrollment.find({
        studentId: { $in: eligibleStudentIds },
        status: 'active',
      })
        .select('batchId courseId')
        .lean();

      return {
        isPublicOnly: false,
        isAdmin: false,
        batchIds: enrollments.map((e) => new mongoose.Types.ObjectId(e.batchId.toString())),
        courseIds: enrollments.map((e) => new mongoose.Types.ObjectId(e.courseId.toString())),
      };
    }

    return {
      isPublicOnly: true,
      isAdmin: false,
      batchIds: [],
      courseIds: [],
    };
  }

  private static async fetchClassSessions(
    from: Date,
    to: Date,
    scope: any,
    query: CalendarRangeQuery,
  ) {
    if (scope.isPublicOnly) return [];

    const filter: Record<string, any> = {
      scheduledStart: { $lte: to },
      scheduledEnd: { $gte: from },
    };

    if (!scope.isAdmin) {
      const matchConditions: Record<string, any>[] = [];
      if (scope.batchIds.length > 0) {
        matchConditions.push({ batchId: { $in: scope.batchIds } });
      }
      if (scope.teacherId) {
        matchConditions.push({ teacherId: scope.teacherId });
      }
      if (matchConditions.length === 0) return [];
      filter.$or = matchConditions;
    }

    if (query.batchId) filter.batchId = new mongoose.Types.ObjectId(query.batchId);
    if (query.courseId) filter.courseId = new mongoose.Types.ObjectId(query.courseId);

    return ClassSession.find(filter).lean();
  }

  private static async fetchAssignments(
    from: Date,
    to: Date,
    scope: any,
    query: CalendarRangeQuery,
  ) {
    if (scope.isPublicOnly) return [];

    const filter: Record<string, any> = {
      dueDate: { $gte: from, $lte: to },
    };

    if (!scope.isAdmin) {
      if (scope.batchIds.length === 0) return [];
      filter.batchId = { $in: scope.batchIds };
      filter.status = AssignmentStatus.PUBLISHED;
    }

    if (query.batchId) filter.batchId = new mongoose.Types.ObjectId(query.batchId);
    if (query.courseId) filter.courseId = new mongoose.Types.ObjectId(query.courseId);

    return Assignment.find(filter).lean();
  }

  private static async fetchAssessments(
    from: Date,
    to: Date,
    scope: any,
    query: CalendarRangeQuery,
  ) {
    if (scope.isPublicOnly) return [];

    const filter: Record<string, any> = {
      opensAt: { $lte: to },
      dueAt: { $gte: from },
    };

    if (!scope.isAdmin) {
      if (scope.batchIds.length === 0) return [];
      filter.batchId = { $in: scope.batchIds };
      filter.status = { $in: ['PUBLISHED', 'LIVE', 'CLOSED'] };
    }

    if (query.batchId) filter.batchId = new mongoose.Types.ObjectId(query.batchId);
    if (query.courseId) filter.courseId = new mongoose.Types.ObjectId(query.courseId);

    return AssessmentModel.find(filter).lean();
  }

  private static async fetchAnnouncements(
    from: Date,
    to: Date,
    scope: any,
    actor?: IUser,
    activeRole?: UserRole,
    query?: CalendarRangeQuery,
  ) {
    const filter: Record<string, any> = {
      status: AnnouncementStatus.PUBLISHED,
      publishAt: { $lte: to },
      $or: [{ expiresAt: null }, { expiresAt: { $gte: from } }],
    };

    if (scope.isPublicOnly) {
      filter['audience.audienceType'] = AnnouncementAudience.PUBLIC;
    } else if (!scope.isAdmin && actor) {
      const audienceConditions: Record<string, any>[] = [
        { 'audience.audienceType': AnnouncementAudience.PUBLIC },
        { 'audience.audienceType': AnnouncementAudience.ALL },
        { 'audience.targetUserIds': new mongoose.Types.ObjectId(actor._id) },
      ];

      if (activeRole === UserRole.STUDENT) {
        audienceConditions.push({ 'audience.audienceType': AnnouncementAudience.STUDENTS });
      } else if (activeRole === UserRole.TEACHER) {
        audienceConditions.push({ 'audience.audienceType': AnnouncementAudience.TEACHERS });
      } else if (activeRole === UserRole.GUARDIAN) {
        audienceConditions.push({ 'audience.audienceType': AnnouncementAudience.GUARDIANS });
      }

      if (scope.courseIds.length > 0) {
        audienceConditions.push({
          'audience.audienceType': AnnouncementAudience.COURSE,
          'audience.targetCourseId': { $in: scope.courseIds },
        });
      }
      if (scope.batchIds.length > 0) {
        audienceConditions.push({
          'audience.audienceType': AnnouncementAudience.BATCH,
          'audience.targetBatchId': { $in: scope.batchIds },
        });
      }

      filter.$or = audienceConditions;
    }

    return Announcement.find(filter).lean();
  }

  private static async fetchBatches(
    from: Date,
    to: Date,
    scope: any,
    query: CalendarRangeQuery,
  ) {
    if (scope.isPublicOnly) return [];

    const filter: Record<string, any> = {
      $or: [
        { startDate: { $gte: from, $lte: to } },
        { endDate: { $gte: from, $lte: to } },
      ],
    };

    if (!scope.isAdmin) {
      if (scope.batchIds.length === 0) return [];
      filter._id = { $in: scope.batchIds };
    }

    if (query.batchId) filter._id = new mongoose.Types.ObjectId(query.batchId);
    if (query.courseId) filter.courseId = new mongoose.Types.ObjectId(query.courseId);

    return Batch.find(filter).lean();
  }

  private static async fetchManualEvents(
    from: Date,
    to: Date,
    scope: any,
    query: CalendarRangeQuery,
  ) {
    const filter: Record<string, any> = {
      startAt: { $lte: to },
      $or: [{ endAt: null }, { endAt: { $gte: from } }],
    };

    if (scope.isPublicOnly) {
      filter.isPublic = true;
    } else if (!scope.isAdmin) {
      const orConditions: Record<string, any>[] = [{ isPublic: true }];
      if (scope.batchIds.length > 0) {
        orConditions.push({ batchId: { $in: scope.batchIds } });
      }
      if (scope.courseIds.length > 0) {
        orConditions.push({ courseId: { $in: scope.courseIds } });
      }
      filter.$or = orConditions;
    }

    if (query.batchId) filter.batchId = new mongoose.Types.ObjectId(query.batchId);
    if (query.courseId) filter.courseId = new mongoose.Types.ObjectId(query.courseId);

    return ManualCalendarEvent.find(filter).lean();
  }
}
