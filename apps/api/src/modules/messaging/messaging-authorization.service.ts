import mongoose from 'mongoose';
import { UserRole, type IUser, ConversationType } from '@eta/types';
import { ForbiddenError, NotFoundError, BadRequestError } from '../../common/errors';
import { User } from '../users/user.model';
import { Batch } from '../academic/batch.model';
import { Course } from '../academic/course.model';
import { Enrollment } from '../academic/enrollment.model';
import { GuardianLink } from '../users/guardian-link.model';

export interface ValidatedRelationshipResult {
  recipientUser: any;
  conversationType: ConversationType;
  participantKey: string;
  courseId?: mongoose.Types.ObjectId | null;
  batchId?: mongoose.Types.ObjectId | null;
  studentId?: mongoose.Types.ObjectId | null;
}

export class MessagingAuthorizationService {
  /**
   * Validate that the authenticated actor is permitted to initiate or participate in
   * a conversation with the target recipient according to PRD §47 authorization rules.
   */
  static async validateRelationship(
    actor: IUser,
    activeRole: UserRole,
    recipientId: string,
    requestedStudentId?: string,
    requestedCourseId?: string,
    requestedBatchId?: string,
  ): Promise<ValidatedRelationshipResult> {
    const actorId = (actor as any).userId || (actor as any)._id?.toString();

    if (actorId === recipientId) {
      throw new BadRequestError('Cannot start a conversation with yourself');
    }

    // 1. Fetch recipient user
    const recipient = await User.findById(recipientId).lean();
    if (!recipient) {
      throw new NotFoundError('Recipient user');
    }

    if (recipient.status !== 'active') {
      throw new ForbiddenError('Cannot message an inactive or suspended user');
    }

    const recipientRole = (recipient.activeRole || recipient.roles[0]) as UserRole;

    // 2. Determine allowed communication flow
    const isActorAdminOrStaff = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF].includes(activeRole);
    const isRecipientAdminOrStaff = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF].includes(recipientRole);

    // Flow: Admin / Staff ↔ Any User (or Any User ↔ Admin / Staff for support)
    if (isActorAdminOrStaff || isRecipientAdminOrStaff) {
      const sortedIds = [actorId, recipientId].sort();
      return {
        recipientUser: recipient,
        conversationType: ConversationType.SUPPORT,
        participantKey: `support:${sortedIds[0]}:${sortedIds[1]}`,
        courseId: requestedCourseId ? new mongoose.Types.ObjectId(requestedCourseId) : null,
        batchId: requestedBatchId ? new mongoose.Types.ObjectId(requestedBatchId) : null,
        studentId: requestedStudentId ? new mongoose.Types.ObjectId(requestedStudentId) : null,
      };
    }

    // Flow: Teacher ↔ Teacher
    if (activeRole === UserRole.TEACHER && recipientRole === UserRole.TEACHER) {
      const sortedIds = [actorId, recipientId].sort();
      return {
        recipientUser: recipient,
        conversationType: ConversationType.DIRECT,
        participantKey: `faculty:${sortedIds[0]}:${sortedIds[1]}`,
      };
    }

    // Flow: Student ↔ Teacher or Teacher ↔ Student
    if (
      (activeRole === UserRole.STUDENT && recipientRole === UserRole.TEACHER) ||
      (activeRole === UserRole.TEACHER && recipientRole === UserRole.STUDENT)
    ) {
      const studentId = activeRole === UserRole.STUDENT ? actorId : recipientId;
      const teacherId = activeRole === UserRole.TEACHER ? actorId : recipientId;

      // Verify student is enrolled in a course or batch assigned to this teacher
      const isAuthorized = await this.verifyStudentTeacherAcademicLink(studentId, teacherId);
      if (!isAuthorized) {
        throw new ForbiddenError(
          'Students and teachers may only message each other when sharing an active enrolled course or cohort.'
        );
      }

      const sortedIds = [actorId, recipientId].sort();
      return {
        recipientUser: recipient,
        conversationType: ConversationType.ACADEMIC,
        participantKey: `academic:${sortedIds[0]}:${sortedIds[1]}`,
        courseId: requestedCourseId ? new mongoose.Types.ObjectId(requestedCourseId) : null,
        batchId: requestedBatchId ? new mongoose.Types.ObjectId(requestedBatchId) : null,
      };
    }

    // Flow: Guardian ↔ Teacher (or Teacher ↔ Guardian)
    if (
      (activeRole === UserRole.GUARDIAN && recipientRole === UserRole.TEACHER) ||
      (activeRole === UserRole.TEACHER && recipientRole === UserRole.GUARDIAN)
    ) {
      const guardianId = activeRole === UserRole.GUARDIAN ? actorId : recipientId;
      const teacherId = activeRole === UserRole.TEACHER ? actorId : recipientId;

      // Guardian must have verified active link to a student taught by this teacher
      const resolvedStudentId = await this.verifyGuardianTeacherLink(
        guardianId,
        teacherId,
        requestedStudentId
      );

      if (!resolvedStudentId) {
        throw new ForbiddenError(
          'Guardians may only message teachers who currently instruct their verified linked child.'
        );
      }

      return {
        recipientUser: recipient,
        conversationType: ConversationType.GUARDIAN_TEACHER,
        participantKey: `guardian:${guardianId}:${teacherId}:${resolvedStudentId}`,
        studentId: new mongoose.Types.ObjectId(resolvedStudentId),
        courseId: requestedCourseId ? new mongoose.Types.ObjectId(requestedCourseId) : null,
        batchId: requestedBatchId ? new mongoose.Types.ObjectId(requestedBatchId) : null,
      };
    }

    // All other peer-to-peer combinations (e.g. Student ↔ Student) are disbarred per PRD §47
    throw new ForbiddenError(
      `Direct messaging between ${activeRole} and ${recipientRole} is not permitted under academy policy.`
    );
  }

  /**
   * Helper: Check if student and teacher share any active enrolled course or batch
   */
  private static async verifyStudentTeacherAcademicLink(
    studentId: string,
    teacherId: string
  ): Promise<boolean> {
    const studentObjId = new mongoose.Types.ObjectId(studentId);
    const teacherObjId = new mongoose.Types.ObjectId(teacherId);

    // Find active enrollments of student
    const activeEnrollments = await Enrollment.find({
      studentId: studentObjId,
      status: 'active',
    })
      .select('courseId batchId')
      .lean();

    if (activeEnrollments.length === 0) {
      return false;
    }

    const courseIds = activeEnrollments.map((e) => e.courseId);
    const batchIds = activeEnrollments.map((e) => e.batchId);

    // Check if teacher is assigned to any of these batches or courses
    const [matchingBatch, matchingCourse] = await Promise.all([
      Batch.findOne({
        _id: { $in: batchIds },
        teacherIds: teacherObjId,
      }).select('_id').lean(),
      Course.findOne({
        _id: { $in: courseIds },
        teacherIds: teacherObjId,
      }).select('_id').lean(),
    ]);

    return !!(matchingBatch || matchingCourse);
  }

  /**
   * Helper: Check if guardian has active verified link to student taught by teacher
   */
  private static async verifyGuardianTeacherLink(
    guardianId: string,
    teacherId: string,
    requestedStudentId?: string
  ): Promise<string | null> {
    const query: Record<string, any> = {
      guardianId: new mongoose.Types.ObjectId(guardianId),
      status: 'ACTIVE',
      verified: true,
    };

    if (requestedStudentId) {
      query.studentId = new mongoose.Types.ObjectId(requestedStudentId);
    }

    const activeLinks = await GuardianLink.find(query).select('studentId').lean();
    if (activeLinks.length === 0) {
      return null;
    }

    // Check each linked student to find if any is taught by this teacher
    for (const link of activeLinks) {
      const studentIdStr = link.studentId.toString();
      const isTaught = await this.verifyStudentTeacherAcademicLink(studentIdStr, teacherId);
      if (isTaught) {
        return studentIdStr;
      }
    }

    return null;
  }
}
