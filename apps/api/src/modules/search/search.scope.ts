import mongoose from 'mongoose';
import { UserRole, EnrollmentStatus, type ActorSearchScope } from '@eta/types';
import type { UserDocument } from '../users/user.model.js';
import { Course } from '../academic/course.model.js';
import { Batch } from '../academic/batch.model.js';
import { Enrollment } from '../academic/enrollment.model.js';
import { GuardianLink } from '../users/guardian-link.model.js';

/**
 * Resolves the authenticated actor's authorized search scope.
 * Executes batched relationship lookups to establish exact access boundaries.
 */
export async function resolveActorScope(user?: UserDocument): Promise<ActorSearchScope> {
  if (!user) {
    return {
      userId: undefined,
      roles: [],
      activeRole: undefined,
      enrolledCourseIds: [],
      enrolledBatchIds: [],
      teacherCourseIds: [],
      teacherBatchIds: [],
      linkedStudentIds: [],
      isAdmin: false,
      isStaff: false,
      isPublic: true,
    };
  }

  const userId = user._id.toString();
  const roles = user.roles || [];
  const activeRole = user.activeRole || roles[0];

  const isAdmin = roles.some((r) => [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(r));
  const isStaff = roles.includes(UserRole.STAFF);

  // If Admin or Super Admin, they have institutional scope
  if (isAdmin) {
    return {
      userId,
      roles,
      activeRole,
      enrolledCourseIds: [],
      enrolledBatchIds: [],
      teacherCourseIds: [],
      teacherBatchIds: [],
      linkedStudentIds: [],
      isAdmin: true,
      isStaff: true,
      isPublic: false,
    };
  }

  const userObjectId = user._id;
  const enrolledCourseIds: string[] = [];
  const enrolledBatchIds: string[] = [];
  const teacherCourseIds: string[] = [];
  const teacherBatchIds: string[] = [];
  const linkedStudentIds: string[] = [];

  const promises: Promise<void>[] = [];

  // 1. Student Enrollment Resolution
  if (roles.includes(UserRole.STUDENT)) {
    promises.push(
      (async () => {
        const enrollments = await Enrollment.find({
          studentId: userObjectId,
          status: EnrollmentStatus.ACTIVE,
        })
          .select('courseId batchId')
          .lean();

        for (const e of enrollments) {
          if (e.courseId) enrolledCourseIds.push(e.courseId.toString());
          if (e.batchId) enrolledBatchIds.push(e.batchId.toString());
        }
      })()
    );
  }

  // 2. Teacher Assignment Resolution
  if (roles.includes(UserRole.TEACHER)) {
    promises.push(
      (async () => {
        const [assignedCourses, assignedBatches] = await Promise.all([
          Course.find({ teacherIds: userObjectId }).select('_id').lean(),
          Batch.find({ teacherIds: userObjectId }).select('_id courseId').lean(),
        ]);

        for (const c of assignedCourses) {
          teacherCourseIds.push(c._id.toString());
        }
        for (const b of assignedBatches) {
          teacherBatchIds.push(b._id.toString());
          if (b.courseId && !teacherCourseIds.includes(b.courseId.toString())) {
            teacherCourseIds.push(b.courseId.toString());
          }
        }
      })()
    );
  }

  // 3. Guardian Linked Students Resolution
  if (roles.includes(UserRole.GUARDIAN)) {
    promises.push(
      (async () => {
        const links = await GuardianLink.find({
          guardianId: userObjectId,
          status: 'ACTIVE',
          verified: true,
        })
          .select('studentId')
          .lean();

        const sIds = links.map((l) => l.studentId);
        for (const s of sIds) {
          if (s) linkedStudentIds.push(s.toString());
        }

        if (sIds.length > 0) {
          const childEnrollments = await Enrollment.find({
            studentId: { $in: sIds },
            status: EnrollmentStatus.ACTIVE,
          })
            .select('courseId batchId')
            .lean();

          for (const ce of childEnrollments) {
            if (ce.courseId && !enrolledCourseIds.includes(ce.courseId.toString())) {
              enrolledCourseIds.push(ce.courseId.toString());
            }
            if (ce.batchId && !enrolledBatchIds.includes(ce.batchId.toString())) {
              enrolledBatchIds.push(ce.batchId.toString());
            }
          }
        }
      })()
    );
  }

  await Promise.all(promises);

  return {
    userId,
    roles,
    activeRole,
    enrolledCourseIds: Array.from(new Set(enrolledCourseIds)),
    enrolledBatchIds: Array.from(new Set(enrolledBatchIds)),
    teacherCourseIds: Array.from(new Set(teacherCourseIds)),
    teacherBatchIds: Array.from(new Set(teacherBatchIds)),
    linkedStudentIds: Array.from(new Set(linkedStudentIds)),
    isAdmin: false,
    isStaff,
    isPublic: false,
  };
}
