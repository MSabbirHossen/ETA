import {
  SearchResultType,
  UserRole,
  UserStatus,
  type ISearchResult,
  type ActorSearchScope,
} from '@eta/types';
import { escapeRegex } from '@eta/validation';
import { User } from '../../users/user.model.js';
import { Enrollment } from '../../academic/enrollment.model.js';
import { calculateRelevanceScore } from '../search.scoring.js';
import type { SearchAdapter, AdapterSearchOptions } from './search.adapter.interface.js';

export class UserSearchAdapter implements SearchAdapter {
  readonly type = SearchResultType.USER;

  isAuthorized(scope: ActorSearchScope): boolean {
    // Only teachers and admins/staff can search users (PRD §53)
    if (scope.isPublic) return false;
    if (scope.isAdmin || scope.isStaff) return true;
    return scope.roles.includes(UserRole.TEACHER);
  }

  async search(query: string, scope: ActorSearchScope, options: AdapterSearchOptions): Promise<ISearchResult[]> {
    if (!this.isAuthorized(scope)) return [];

    const escaped = escapeRegex(query);
    const regex = new RegExp(escaped, 'i');

    const filter: Record<string, any> = {
      $or: [{ name: regex }, { email: regex }],
    };

    // Role-based directory access boundaries
    if (!scope.isAdmin && !scope.isStaff) {
      // Teachers may only search students enrolled in their assigned courses/batches (PRD §53, §23)
      if (scope.roles.includes(UserRole.TEACHER)) {
        filter.roles = UserRole.STUDENT;
        filter.status = UserStatus.ACTIVE;

        if (scope.teacherBatchIds.length > 0 || scope.teacherCourseIds.length > 0) {
          const enrollments = await Enrollment.find({
            $or: [
              { batchId: { $in: scope.teacherBatchIds } },
              { courseId: { $in: scope.teacherCourseIds } },
            ],
          })
            .select('studentId')
            .lean();

          const studentObjectIds = enrollments.map((e) => e.studentId);
          filter._id = { $in: studentObjectIds };
        } else {
          return [];
        }
      } else {
        return [];
      }
    }

    const docs = await User.find(filter)
      .select('_id name email roles activeRole avatarUrl status updatedAt')
      .limit(options.limit)
      .lean();

    return docs.map((doc) => {
      const id = doc._id.toString();
      const isTeacher = (doc.roles || []).includes(UserRole.TEACHER);
      const isStudent = (doc.roles || []).includes(UserRole.STUDENT);

      let resultType = SearchResultType.USER;
      if (isStudent && !isTeacher) resultType = SearchResultType.STUDENT;
      else if (isTeacher) resultType = SearchResultType.TEACHER;

      // Safe action URL & presentation
      const actionUrl = scope.isAdmin || scope.isStaff ? `/admin/users` : `/teacher/dashboard`;

      // Email only exposed to administrators, NEVER to other peers or generic teachers
      const subtitle = scope.isAdmin || scope.isStaff
        ? `${doc.email} • Role: ${doc.activeRole || doc.roles?.[0]}`
        : `Student • Status: ${doc.status}`;

      const score = calculateRelevanceScore(query, {
        title: doc.name,
        subtitle: doc.email,
        updatedAt: doc.updatedAt,
      });

      return {
        id: `user_${id}`,
        type: resultType,
        sourceId: id,
        title: doc.name,
        subtitle,
        actionUrl,
        score,
        matchedFields: scope.isAdmin || scope.isStaff ? ['name', 'email'] : ['name'],
        metadata: {
          role: doc.activeRole || doc.roles?.[0],
          status: doc.status,
          avatarUrl: doc.avatarUrl,
        },
      };
    });
  }
}
