import mongoose from 'mongoose';
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  EmailDeliveryStatus,
  AnnouncementAudience,
  AnnouncementPriority,
  UserRole,
  type IAnnouncement,
  type IAssignment,
  type IAssessment,
  type IClassSession,
  type IStudentGradeResult,
  type IAdmissionApplication,
  type IGuardianLink,
} from '@eta/types';
import { Notification } from './notification.model.js';
import { User } from '../users/user.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { GuardianLink } from '../users/guardian-link.model.js';
import { EmailService } from './email/email.service.js';

export interface DispatchNotificationOptions {
  recipientUserIds: string[];
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  priority?: NotificationPriority;
  sourceType?: string;
  sourceId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
}

export class NotificationDispatcher {
  /**
   * Internal bulk dispatcher that deduplicates recipients and creates idempotent notifications
   */
  static async dispatch(options: DispatchNotificationOptions): Promise<number> {
    const uniqueUserIds = Array.from(new Set(options.recipientUserIds.filter(Boolean)));
    if (uniqueUserIds.length === 0) {
      return 0;
    }

    const priority = options.priority ?? NotificationPriority.NORMAL;
    const now = new Date();

    const notificationsToInsert = uniqueUserIds.map((userId) => {
      const idempotencyKey = `${userId}:${options.type}:${options.sourceId || 'global'}`;
      return {
        userId: new mongoose.Types.ObjectId(userId),
        type: options.type,
        category: options.category,
        title: options.title,
        body: options.body,
        priority,
        sourceType: options.sourceType,
        sourceId: options.sourceId,
        actionUrl: options.actionUrl,
        metadata: options.metadata,
        deliveredAt: now,
        readAt: null,
        emailStatus: options.sendEmail ? EmailDeliveryStatus.PENDING : EmailDeliveryStatus.SKIPPED,
        idempotencyKey,
      };
    });

    try {
      // Bulk insert with ordered: false to gracefully ignore duplicate keys on re-dispatched events
      await Notification.insertMany(notificationsToInsert, { ordered: false });
    } catch (err: any) {
      // If error is duplicate key error (11000), ignore harmless duplicates
      if (err?.code !== 11000 && !err?.writeErrors) {
        console.error('[NotificationDispatcher] Error bulk inserting notifications:', err?.message || err);
      }
    }

    // Side-effect: optional email dispatch for important/urgent notifications
    if (options.sendEmail) {
      this.triggerEmailDeliveries(uniqueUserIds, options.title, options.body).catch((err) => {
        console.error('[NotificationDispatcher] Background email delivery failure:', err?.message || err);
      });
    }

    return uniqueUserIds.length;
  }

  private static async triggerEmailDeliveries(
    userIds: string[],
    subject: string,
    body: string,
  ): Promise<void> {
    const users = await User.find({ _id: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) } })
      .select('email name')
      .lean();

    for (const user of users) {
      if (!user.email) continue;
      const html = `<div style="font-family:sans-serif;padding:16px;">
        <h2>Exploratory Training Academy</h2>
        <h3>${subject}</h3>
        <p>${body}</p>
        <p style="margin-top:24px;font-size:12px;color:#666;">This is an automated notification from ETA.</p>
      </div>`;

      await EmailService.send({
        to: user.email,
        subject: `[ETA] ${subject}`,
        html,
        text: body,
      });
    }
  }

  // ----------------------------------------------------
  // Helper: Resolve Students Enrolled in Batch
  // ----------------------------------------------------
  private static async getStudentsInBatch(batchId: string): Promise<string[]> {
    if (!mongoose.Types.ObjectId.isValid(batchId)) return [];
    try {
      const query = Enrollment.find({
        batchId: new mongoose.Types.ObjectId(batchId),
        status: 'active',
      });
      const enrollments = typeof (query as any)?.select === 'function'
        ? typeof (query as any).select('studentId')?.lean === 'function'
          ? await (query as any).select('studentId').lean()
          : await (query as any).select('studentId')
        : await query;

      if (!Array.isArray(enrollments)) return [];
      return enrollments.map((e: any) => e.studentId?.toString()).filter(Boolean);
    } catch {
      return [];
    }
  }

  // ----------------------------------------------------
  // Helper: Resolve Verified Active Guardians for Students
  // ----------------------------------------------------
  private static async getVerifiedGuardiansForStudents(studentIds: string[]): Promise<string[]> {
    if (studentIds.length === 0) return [];
    const objectIds = studentIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const links = await GuardianLink.find({
      studentId: { $in: objectIds },
      status: 'ACTIVE',
      verified: true,
    })
      .select('guardianId')
      .lean();

    return links.map((l) => l.guardianId.toString());
  }

  // ====================================================
  // SPECIFIC DOMAIN EVENT HANDLERS
  // ====================================================

  /**
   * Assignment Published
   */
  static async dispatchAssignmentPublished(assignment: IAssignment, batchId: string): Promise<void> {
    const studentIds = await this.getStudentsInBatch(batchId);
    if (studentIds.length === 0) return;

    await this.dispatch({
      recipientUserIds: studentIds,
      type: NotificationType.ASSIGNMENT_PUBLISHED,
      category: NotificationCategory.ASSIGNMENT,
      title: `New Assignment: ${assignment.title}`,
      body: `A new assignment "${assignment.title}" has been published. Due on ${new Date(assignment.dueDate).toLocaleDateString()}.`,
      priority: NotificationPriority.NORMAL,
      sourceType: 'Assignment',
      sourceId: assignment._id,
      actionUrl: '/student/assignments',
      sendEmail: false,
    });
  }

  /**
   * Assessment Published
   */
  static async dispatchAssessmentPublished(assessment: IAssessment, batchId: string): Promise<void> {
    const studentIds = await this.getStudentsInBatch(batchId);
    if (studentIds.length === 0) return;

    await this.dispatch({
      recipientUserIds: studentIds,
      type: NotificationType.ASSESSMENT_PUBLISHED,
      category: NotificationCategory.ASSESSMENT,
      title: `Assessment Available: ${assessment.title}`,
      body: `A new assessment "${assessment.title}" is now open for your cohort.`,
      priority: NotificationPriority.NORMAL,
      sourceType: 'Assessment',
      sourceId: assessment.id,
      actionUrl: '/student/quizzes',
      sendEmail: false,
    });
  }

  /**
   * Class Scheduled
   */
  static async dispatchClassScheduled(classSession: IClassSession): Promise<void> {
    const studentIds = await this.getStudentsInBatch(classSession.batchId.toString());
    const recipients = [...studentIds];
    if (classSession.teacherId) {
      recipients.push(classSession.teacherId.toString());
    }

    await this.dispatch({
      recipientUserIds: recipients,
      type: NotificationType.CLASS_SCHEDULED,
      category: NotificationCategory.ACADEMIC,
      title: `Class Scheduled: ${classSession.title}`,
      body: `Class session "${classSession.title}" has been scheduled for ${new Date(classSession.scheduledStart).toLocaleString()}.`,
      priority: NotificationPriority.NORMAL,
      sourceType: 'ClassSession',
      sourceId: classSession._id,
      actionUrl: '/student/classes',
      sendEmail: false,
    });
  }

  /**
   * Class Cancelled
   */
  static async dispatchClassCancelled(classSession: IClassSession): Promise<void> {
    const studentIds = await this.getStudentsInBatch(classSession.batchId.toString());
    const recipients = [...studentIds];
    if (classSession.teacherId) {
      recipients.push(classSession.teacherId.toString());
    }

    await this.dispatch({
      recipientUserIds: recipients,
      type: NotificationType.CLASS_CANCELLED,
      category: NotificationCategory.ACADEMIC,
      title: `Class Cancelled: ${classSession.title}`,
      body: `The scheduled class session "${classSession.title}" has been cancelled.`,
      priority: NotificationPriority.IMPORTANT,
      sourceType: 'ClassSession',
      sourceId: classSession._id,
      actionUrl: '/student/classes',
      sendEmail: true,
    });
  }

  /**
   * Attendance Finalized
   */
  static async dispatchAttendanceFinalized(
    batchId: string,
    records: { studentId: string; status: string }[],
  ): Promise<void> {
    for (const rec of records) {
      if (!rec || !rec.studentId) continue;
      const studentId = rec.studentId.toString();
      const isAbsent = rec.status ? rec.status.toString().toLowerCase() === 'absent' : false;

      // Notify student
      await this.dispatch({
        recipientUserIds: [studentId],
        type: NotificationType.ATTENDANCE_MARKED,
        category: NotificationCategory.ATTENDANCE,
        title: `Attendance Recorded`,
        body: `Your attendance status was recorded as ${(rec.status || 'RECORDED').toUpperCase()}.`,
        priority: isAbsent ? NotificationPriority.IMPORTANT : NotificationPriority.NORMAL,
        sourceType: 'Attendance',
        sourceId: `${batchId}-${studentId}-${Date.now()}`,
        actionUrl: '/student/attendance',
        sendEmail: false,
      });

      // If absent, also notify verified active guardians
      if (isAbsent) {
        const guardians = await this.getVerifiedGuardiansForStudents([studentId]);
        if (guardians.length > 0) {
          await this.dispatch({
            recipientUserIds: guardians,
            type: NotificationType.ATTENDANCE_MARKED,
            category: NotificationCategory.ATTENDANCE,
            title: `Student Absence Alert`,
            body: `Your linked student was marked absent for today's session.`,
            priority: NotificationPriority.IMPORTANT,
            sourceType: 'Attendance',
            sourceId: `${batchId}-${studentId}-guardian-${Date.now()}`,
            actionUrl: '/guardian/dashboard',
            sendEmail: true,
          });
        }
      }
    }
  }

  /**
   * Grades Published
   */
  static async dispatchGradePublished(gradeResult: IStudentGradeResult): Promise<void> {
    if (!gradeResult || !gradeResult.studentId) return;
    const studentId = gradeResult.studentId.toString();
    const guardians = await this.getVerifiedGuardiansForStudents([studentId]);

    // Student notification
    await this.dispatch({
      recipientUserIds: [studentId],
      type: NotificationType.GRADE_PUBLISHED,
      category: NotificationCategory.GRADE,
      title: `Course Grades Published`,
      body: `Your official grades have been published: ${gradeResult.letterGrade} (${gradeResult.finalPercentage.toFixed(1)}%).`,
      priority: NotificationPriority.IMPORTANT,
      sourceType: 'GradeResult',
      sourceId: gradeResult._id,
      actionUrl: '/student/grades',
      sendEmail: true,
    });

    // Guardian notification
    if (guardians.length > 0) {
      await this.dispatch({
        recipientUserIds: guardians,
        type: NotificationType.GRADE_PUBLISHED,
        category: NotificationCategory.GRADE,
        title: `Child Grade Report Available`,
        body: `Final grades for your student have been published: ${gradeResult.letterGrade} (${gradeResult.finalPercentage.toFixed(1)}%).`,
        priority: NotificationPriority.IMPORTANT,
        sourceType: 'GradeResult',
        sourceId: gradeResult._id,
        actionUrl: '/guardian/dashboard',
        sendEmail: true,
      });
    }
  }

  /**
   * Admission Status Updated
   */
  static async dispatchAdmissionStatusUpdated(application: IAdmissionApplication): Promise<void> {
    if (!application || !application.applicantId) return;
    const applicantId = typeof application.applicantId === 'object' && '_id' in application.applicantId
      ? (application.applicantId as any)._id.toString()
      : application.applicantId.toString();

    await this.dispatch({
      recipientUserIds: [applicantId],
      type: NotificationType.ADMISSION_STATUS_UPDATED,
      category: NotificationCategory.ADMISSION,
      title: `Application Status: ${application.status}`,
      body: `Your admission application status has been updated to ${application.status}.`,
      priority: NotificationPriority.IMPORTANT,
      sourceType: 'AdmissionApplication',
      sourceId: application._id,
      actionUrl: '/admissions/my-applications',
      sendEmail: true,
    });
  }

  /**
   * Guardian Link Verified
   */
  static async dispatchGuardianLinkVerified(link: IGuardianLink): Promise<void> {
    if (!link || !link.guardianId || !link.studentId) return;
    const guardianId = link.guardianId.toString();
    const studentId = link.studentId.toString();

    await this.dispatch({
      recipientUserIds: [guardianId, studentId],
      type: NotificationType.GUARDIAN_LINK_VERIFIED,
      category: NotificationCategory.GUARDIAN,
      title: `Guardian Link Verified`,
      body: `The guardian relationship link has been verified and active access is granted.`,
      priority: NotificationPriority.NORMAL,
      sourceType: 'GuardianLink',
      sourceId: link._id,
      actionUrl: '/guardian/dashboard',
      sendEmail: false,
    });
  }

  /**
   * Announcement Published Fan-Out
   */
  static async dispatchAnnouncementPublished(announcement: IAnnouncement): Promise<void> {
    let recipientUserIds: string[] = [];

    switch (announcement.audience.audienceType) {
      case AnnouncementAudience.PUBLIC:
      case AnnouncementAudience.ALL: {
        const users = await User.find({ status: 'active' }).select('_id').lean();
        recipientUserIds = users.map((u) => u._id.toString());
        break;
      }
      case AnnouncementAudience.STUDENTS: {
        const users = await User.find({ roles: UserRole.STUDENT, status: 'active' }).select('_id').lean();
        recipientUserIds = users.map((u) => u._id.toString());
        break;
      }
      case AnnouncementAudience.TEACHERS: {
        const users = await User.find({ roles: UserRole.TEACHER, status: 'active' }).select('_id').lean();
        recipientUserIds = users.map((u) => u._id.toString());
        break;
      }
      case AnnouncementAudience.GUARDIANS: {
        const users = await User.find({ roles: UserRole.GUARDIAN, status: 'active' }).select('_id').lean();
        recipientUserIds = users.map((u) => u._id.toString());
        break;
      }
      case AnnouncementAudience.ADMINS: {
        const users = await User.find({
          roles: { $in: [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF] },
          status: 'active',
        })
          .select('_id')
          .lean();
        recipientUserIds = users.map((u) => u._id.toString());
        break;
      }
      case AnnouncementAudience.BATCH: {
        if (announcement.audience.targetBatchId) {
          recipientUserIds = await this.getStudentsInBatch(announcement.audience.targetBatchId);
        }
        break;
      }
      case AnnouncementAudience.COURSE: {
        if (announcement.audience.targetCourseId) {
          const enrollments = await Enrollment.find({
            courseId: new mongoose.Types.ObjectId(announcement.audience.targetCourseId),
            status: 'active',
          })
            .select('studentId')
            .lean();
          recipientUserIds = enrollments.map((e) => e.studentId.toString());
        }
        break;
      }
      case AnnouncementAudience.SELECTED_USERS: {
        recipientUserIds = announcement.audience.targetUserIds || [];
        break;
      }
    }

    if (recipientUserIds.length === 0) return;

    const isUrgent = announcement.priority === AnnouncementPriority.URGENT;
    const isImportant = announcement.priority === AnnouncementPriority.IMPORTANT;
    const priority = isUrgent
      ? NotificationPriority.URGENT
      : isImportant
      ? NotificationPriority.IMPORTANT
      : NotificationPriority.NORMAL;

    await this.dispatch({
      recipientUserIds,
      type: NotificationType.ANNOUNCEMENT_PUBLISHED,
      category: NotificationCategory.ANNOUNCEMENT,
      title: `Notice: ${announcement.title}`,
      body: announcement.summary || announcement.body.substring(0, 150),
      priority,
      sourceType: 'Announcement',
      sourceId: announcement._id,
      actionUrl: `/announcements`,
      sendEmail: isUrgent || isImportant,
    });
  }
}
