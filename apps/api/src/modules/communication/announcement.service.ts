import mongoose from 'mongoose';
import {
  AnnouncementAudience,
  AnnouncementPriority,
  AnnouncementStatus,
  UserRole,
  type IAnnouncement,
  type CreateAnnouncementDto,
  type UpdateAnnouncementDto,
  type AnnouncementFilterQuery,
  type IUser,
} from '@eta/types';
import { Announcement, toIAnnouncement } from './announcement.model.js';
import { NotificationDispatcher } from './notification-dispatcher.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { GuardianLink } from '../users/guardian-link.model.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../../common/errors.js';

export class AnnouncementService {
  /**
   * Helper: verify teacher assignment to course or batch
   */
  private static async verifyTeacherAssignment(
    teacherId: string,
    courseId?: string,
    batchId?: string,
  ): Promise<void> {
    if (batchId && mongoose.Types.ObjectId.isValid(batchId)) {
      const batch = await Batch.findById(batchId);
      if (batch && batch.teacherIds?.some((id) => id.toString() === teacherId)) {
        return;
      }
    }
    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      const course = await Course.findById(courseId);
      if (course && (course as any).teacherIds?.some((id: any) => id.toString() === teacherId)) {
        return;
      }
    }
    throw new ForbiddenError('You can only create announcements for courses or cohorts you are assigned to.');
  }

  /**
   * Create an announcement
   */
  static async createAnnouncement(
    dto: CreateAnnouncementDto,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<IAnnouncement> {
    const isAdmin = actorRoles.includes(UserRole.ADMIN) || actorRoles.includes(UserRole.SUPER_ADMIN);
    const isStaff = actorRoles.includes(UserRole.STAFF);
    const isTeacher = actorRoles.includes(UserRole.TEACHER);

    if (!isAdmin && !isStaff && !isTeacher) {
      throw new ForbiddenError('You do not have permission to create announcements.');
    }

    // Teacher restriction: Teachers can only publish to their assigned courses or batches
    if (isTeacher && !isAdmin && !isStaff) {
      if (
        dto.audienceType !== AnnouncementAudience.COURSE &&
        dto.audienceType !== AnnouncementAudience.BATCH
      ) {
        throw new ForbiddenError(
          'Teachers can only create announcements targeted to specific courses or batches.',
        );
      }
      await this.verifyTeacherAssignment(actorId, dto.targetCourseId, dto.targetBatchId);
    }

    // Validate targets if specified
    if (dto.targetCourseId) {
      if (!mongoose.Types.ObjectId.isValid(dto.targetCourseId)) {
        throw new ValidationError('Invalid target course ID format.');
      }
      const courseExists = await Course.exists({ _id: dto.targetCourseId });
      if (!courseExists) {
        throw new NotFoundError('Target course not found.');
      }
    }

    if (dto.targetBatchId) {
      if (!mongoose.Types.ObjectId.isValid(dto.targetBatchId)) {
        throw new ValidationError('Invalid target batch ID format.');
      }
      const batchExists = await Batch.exists({ _id: dto.targetBatchId });
      if (!batchExists) {
        throw new NotFoundError('Target batch not found.');
      }
    }

    const now = new Date();
    const pubDate = dto.publishAt ? new Date(dto.publishAt) : now;
    const expDate = dto.expiresAt ? new Date(dto.expiresAt) : null;

    if (expDate && expDate.getTime() <= pubDate.getTime()) {
      throw new ValidationError('Expiration date must be after publish date.');
    }

    let initialStatus = dto.status ?? AnnouncementStatus.PUBLISHED;
    if (pubDate.getTime() > now.getTime() && initialStatus === AnnouncementStatus.PUBLISHED) {
      initialStatus = AnnouncementStatus.SCHEDULED;
    }

    const doc = new Announcement({
      title: dto.title.trim(),
      body: dto.body.trim(),
      summary: dto.summary?.trim(),
      priority: dto.priority ?? AnnouncementPriority.NORMAL,
      status: initialStatus,
      audience: {
        audienceType: dto.audienceType,
        targetCourseId: dto.targetCourseId ? new mongoose.Types.ObjectId(dto.targetCourseId) : undefined,
        targetBatchId: dto.targetBatchId ? new mongoose.Types.ObjectId(dto.targetBatchId) : undefined,
        targetUserIds: dto.targetUserIds?.map((id) => new mongoose.Types.ObjectId(id)),
      },
      attachments: dto.attachments || [],
      isPublic: dto.audienceType === AnnouncementAudience.PUBLIC,
      publishAt: pubDate,
      expiresAt: expDate,
      publishedAt: initialStatus === AnnouncementStatus.PUBLISHED ? now : null,
      createdBy: new mongoose.Types.ObjectId(actorId),
      sendNotification: dto.sendNotification ?? true,
    });

    await doc.save();
    const result = toIAnnouncement(doc);

    // If immediately published and sendNotification requested, fan out notifications
    if (initialStatus === AnnouncementStatus.PUBLISHED && doc.sendNotification) {
      NotificationDispatcher.dispatchAnnouncementPublished(result).catch((err) => {
        console.error('[AnnouncementService] Failed to fan out notifications:', err?.message || err);
      });
    }

    return result;
  }

  /**
   * Background / Cron worker: Publish due scheduled announcements — PRD §103, §104
   */
  static async publishScheduledAnnouncements(now = new Date()): Promise<number> {
    const dueAnnouncements = await Announcement.find({
      status: AnnouncementStatus.SCHEDULED,
      publishAt: { $lte: now },
    });

    let count = 0;
    for (const doc of dueAnnouncements) {
      doc.status = AnnouncementStatus.PUBLISHED;
      doc.publishedAt = now;
      await doc.save();
      count++;

      if (doc.sendNotification) {
        NotificationDispatcher.dispatchAnnouncementPublished(toIAnnouncement(doc)).catch((err) => {
          console.error('[AnnouncementService] Failed to fan out scheduled notifications:', err?.message || err);
        });
      }
    }
    return count;
  }

  /**
   * Update an announcement
   */
  static async updateAnnouncement(
    id: string,
    dto: UpdateAnnouncementDto,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<IAnnouncement> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid announcement ID format.');
    }

    const doc = await Announcement.findById(id);
    if (!doc) {
      throw new NotFoundError('Announcement not found.');
    }

    const isAdmin = actorRoles.includes(UserRole.ADMIN) || actorRoles.includes(UserRole.SUPER_ADMIN);
    const isAuthor = doc.createdBy.toString() === actorId;

    if (!isAdmin && !isAuthor) {
      throw new ForbiddenError('You can only edit announcements you authored.');
    }

    if (dto.title !== undefined) doc.title = dto.title.trim();
    if (dto.body !== undefined) doc.body = dto.body.trim();
    if (dto.summary !== undefined) doc.summary = dto.summary?.trim();
    if (dto.priority !== undefined) doc.priority = dto.priority;
    if (dto.attachments !== undefined) doc.attachments = dto.attachments as any;
    if (dto.publishAt !== undefined) doc.publishAt = new Date(dto.publishAt);
    if (dto.expiresAt !== undefined) doc.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.sendNotification !== undefined) doc.sendNotification = dto.sendNotification;

    if (dto.audienceType !== undefined) {
      doc.audience.audienceType = dto.audienceType;
      doc.isPublic = dto.audienceType === AnnouncementAudience.PUBLIC;
    }
    if (dto.targetCourseId !== undefined) {
      doc.audience.targetCourseId = dto.targetCourseId
        ? new mongoose.Types.ObjectId(dto.targetCourseId)
        : undefined;
    }
    if (dto.targetBatchId !== undefined) {
      doc.audience.targetBatchId = dto.targetBatchId
        ? new mongoose.Types.ObjectId(dto.targetBatchId)
        : undefined;
    }
    if (dto.targetUserIds !== undefined) {
      doc.audience.targetUserIds = dto.targetUserIds.map((uid) => new mongoose.Types.ObjectId(uid));
    }

    doc.updatedBy = new mongoose.Types.ObjectId(actorId);
    await doc.save();

    return toIAnnouncement(doc);
  }

  /**
   * Publish an announcement
   */
  static async publishAnnouncement(
    id: string,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<IAnnouncement> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid announcement ID format.');
    }

    const doc = await Announcement.findById(id);
    if (!doc) {
      throw new NotFoundError('Announcement not found.');
    }

    const isAdmin = actorRoles.includes(UserRole.ADMIN) || actorRoles.includes(UserRole.SUPER_ADMIN);
    const isAuthor = doc.createdBy.toString() === actorId;

    if (!isAdmin && !isAuthor) {
      throw new ForbiddenError('You do not have permission to publish this announcement.');
    }

    const now = new Date();
    doc.status = AnnouncementStatus.PUBLISHED;
    doc.publishedAt = now;
    if (doc.publishAt.getTime() > now.getTime()) {
      doc.publishAt = now;
    }
    doc.updatedBy = new mongoose.Types.ObjectId(actorId);

    await doc.save();
    const result = toIAnnouncement(doc);

    if (doc.sendNotification) {
      NotificationDispatcher.dispatchAnnouncementPublished(result).catch((err) => {
        console.error('[AnnouncementService] Failed to fan out notifications:', err?.message || err);
      });
    }

    return result;
  }

  /**
   * Archive an announcement
   */
  static async archiveAnnouncement(
    id: string,
    actorId: string,
    actorRoles: UserRole[],
  ): Promise<IAnnouncement> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid announcement ID format.');
    }

    const doc = await Announcement.findById(id);
    if (!doc) {
      throw new NotFoundError('Announcement not found.');
    }

    const isAdmin = actorRoles.includes(UserRole.ADMIN) || actorRoles.includes(UserRole.SUPER_ADMIN);
    const isAuthor = doc.createdBy.toString() === actorId;

    if (!isAdmin && !isAuthor) {
      throw new ForbiddenError('You do not have permission to archive this announcement.');
    }

    doc.status = AnnouncementStatus.ARCHIVED;
    doc.updatedBy = new mongoose.Types.ObjectId(actorId);
    await doc.save();

    return toIAnnouncement(doc);
  }

  /**
   * Delete an announcement
   */
  static async deleteAnnouncement(
    id: string,
    actorRoles: UserRole[],
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid announcement ID format.');
    }

    const isAdmin = actorRoles.includes(UserRole.ADMIN) || actorRoles.includes(UserRole.SUPER_ADMIN);
    if (!isAdmin) {
      throw new ForbiddenError('Only administrators can permanently delete announcements.');
    }

    const deleted = await Announcement.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundError('Announcement not found.');
    }
  }

  /**
   * List announcements with audience resolution and lazy scheduling transitions
   */
  static async getAnnouncements(
    query: AnnouncementFilterQuery,
    user?: IUser,
    activeRole?: UserRole,
  ): Promise<{ data: IAnnouncement[]; total: number; page: number; limit: number }> {
    const now = new Date();

    // 1. Lazy transition: SCHEDULED -> PUBLISHED if publishAt has passed
    await Announcement.updateMany(
      {
        status: AnnouncementStatus.SCHEDULED,
        publishAt: { $lte: now },
      },
      {
        $set: { status: AnnouncementStatus.PUBLISHED, publishedAt: now },
      },
    );

    const filter: Record<string, any> = {};
    const isAdminOrStaff =
      activeRole === UserRole.ADMIN ||
      activeRole === UserRole.SUPER_ADMIN ||
      activeRole === UserRole.STAFF;

    if (query.priority) {
      filter.priority = query.priority;
    }
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { body: { $regex: query.search, $options: 'i' } },
      ];
    }

    // Unauthenticated (Visitor) View: Only public published active announcements
    if (!user) {
      filter.status = AnnouncementStatus.PUBLISHED;
      filter['audience.audienceType'] = AnnouncementAudience.PUBLIC;
      filter.publishAt = { $lte: now };
      filter.$and = [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      ];
    } else if (isAdminOrStaff) {
      // Admins & staff see everything or apply explicit filter
      if (query.status) {
        filter.status = query.status;
      }
      if (query.audienceType) {
        filter['audience.audienceType'] = query.audienceType;
      }
      if (query.courseId) {
        filter['audience.targetCourseId'] = new mongoose.Types.ObjectId(query.courseId);
      }
      if (query.batchId) {
        filter['audience.targetBatchId'] = new mongoose.Types.ObjectId(query.batchId);
      }
    } else {
      // Authenticated Student, Teacher, Guardian: Must match audience rules
      filter.status = AnnouncementStatus.PUBLISHED;
      filter.publishAt = { $lte: now };
      filter.$and = [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      ];

      const audienceConditions: Record<string, any>[] = [
        { 'audience.audienceType': AnnouncementAudience.PUBLIC },
        { 'audience.audienceType': AnnouncementAudience.ALL },
        { 'audience.targetUserIds': new mongoose.Types.ObjectId(user._id) },
      ];

      if (activeRole === UserRole.STUDENT) {
        audienceConditions.push({ 'audience.audienceType': AnnouncementAudience.STUDENTS });
        // Retrieve enrolled courses & batches
        const enrollments = await Enrollment.find({
          studentId: new mongoose.Types.ObjectId(user._id),
          status: 'active',
        })
          .select('courseId batchId')
          .lean();

        if (enrollments.length > 0) {
          const courseIds = enrollments.map((e) => e.courseId);
          const batchIds = enrollments.map((e) => e.batchId);
          audienceConditions.push({
            'audience.audienceType': AnnouncementAudience.COURSE,
            'audience.targetCourseId': { $in: courseIds },
          });
          audienceConditions.push({
            'audience.audienceType': AnnouncementAudience.BATCH,
            'audience.targetBatchId': { $in: batchIds },
          });
        }
      } else if (activeRole === UserRole.TEACHER) {
        audienceConditions.push({ 'audience.audienceType': AnnouncementAudience.TEACHERS });
        // Retrieve assigned courses and batches
        const batches = await Batch.find({ teacherIds: new mongoose.Types.ObjectId(user._id) })
          .select('_id courseId')
          .lean();
        if (batches.length > 0) {
          audienceConditions.push({
            'audience.audienceType': AnnouncementAudience.BATCH,
            'audience.targetBatchId': { $in: batches.map((b) => b._id) },
          });
          audienceConditions.push({
            'audience.audienceType': AnnouncementAudience.COURSE,
            'audience.targetCourseId': { $in: batches.map((b) => b.courseId) },
          });
        }
      } else if (activeRole === UserRole.GUARDIAN) {
        audienceConditions.push({ 'audience.audienceType': AnnouncementAudience.GUARDIANS });
        // Retrieve active verified children enrollments
        const links = await GuardianLink.find({
          guardianId: new mongoose.Types.ObjectId(user._id),
          status: 'ACTIVE',
          verified: true,
        })
          .select('studentId')
          .lean();

        if (links.length > 0) {
          const studentIds = links.map((l) => l.studentId);
          const enrollments = await Enrollment.find({
            studentId: { $in: studentIds },
            status: 'active',
          })
            .select('courseId batchId')
            .lean();

          if (enrollments.length > 0) {
            audienceConditions.push({
              'audience.audienceType': AnnouncementAudience.COURSE,
              'audience.targetCourseId': { $in: enrollments.map((e) => e.courseId) },
            });
            audienceConditions.push({
              'audience.audienceType': AnnouncementAudience.BATCH,
              'audience.targetBatchId': { $in: enrollments.map((e) => e.batchId) },
            });
          }
        }
      }

      filter.$or = audienceConditions;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      Announcement.find(filter)
        .populate('createdBy', 'name email')
        .sort({ priority: -1, publishAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Announcement.countDocuments(filter),
    ]);

    return {
      data: docs.map(toIAnnouncement),
      total,
      page,
      limit,
    };
  }

  /**
   * Get single announcement by ID
   */
  static async getAnnouncementById(
    id: string,
    user?: IUser,
    activeRole?: UserRole,
  ): Promise<IAnnouncement> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError('Invalid announcement ID format.');
    }

    const doc = await Announcement.findById(id).populate('createdBy', 'name email');
    if (!doc) {
      throw new NotFoundError('Announcement not found.');
    }

    const isAdminOrStaff =
      activeRole === UserRole.ADMIN ||
      activeRole === UserRole.SUPER_ADMIN ||
      activeRole === UserRole.STAFF;

    if (isAdminOrStaff) {
      return toIAnnouncement(doc);
    }

    // Non-admin check: must be PUBLISHED, not expired, and match audience
    const now = new Date();
    if (doc.status !== AnnouncementStatus.PUBLISHED) {
      throw new NotFoundError('Announcement not found.');
    }
    if (doc.publishAt.getTime() > now.getTime()) {
      throw new NotFoundError('Announcement not found.');
    }
    if (doc.expiresAt && doc.expiresAt.getTime() <= now.getTime()) {
      throw new NotFoundError('Announcement has expired.');
    }

    if (doc.audience.audienceType === AnnouncementAudience.PUBLIC) {
      return toIAnnouncement(doc);
    }

    if (!user) {
      throw new ForbiddenError('You must sign in to view this institutional announcement.');
    }

    return toIAnnouncement(doc);
  }
}
