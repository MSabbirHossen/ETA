import {
  SearchResultType,
  AssignmentStatus,
  UserRole,
  type ISearchResult,
  type ActorSearchScope,
} from '@eta/types';
import { escapeRegex } from '@eta/validation';
import { Assignment } from '../../assignment/assignment.model.js';
import { calculateRelevanceScore } from '../search.scoring.js';
import type { SearchAdapter, AdapterSearchOptions } from './search.adapter.interface.js';

export class AssignmentSearchAdapter implements SearchAdapter {
  readonly type = SearchResultType.ASSIGNMENT;

  isAuthorized(scope: ActorSearchScope): boolean {
    if (scope.isPublic) return false;
    if (scope.isAdmin || scope.isStaff) return true;
    return (
      scope.roles.includes(UserRole.TEACHER) ||
      scope.enrolledBatchIds.length > 0 ||
      scope.teacherBatchIds.length > 0
    );
  }

  async search(query: string, scope: ActorSearchScope, options: AdapterSearchOptions): Promise<ISearchResult[]> {
    if (!this.isAuthorized(scope)) return [];

    const escaped = escapeRegex(query);
    const regex = new RegExp(escaped, 'i');

    const filter: Record<string, any> = {
      $or: [{ title: regex }, { description: regex }],
    };

    if (options.courseId) filter.courseId = options.courseId;
    if (options.batchId) filter.batchId = options.batchId;

    if (!scope.isAdmin && !scope.isStaff) {
      if (scope.roles.includes(UserRole.TEACHER)) {
        filter.$and = [
          {
            $or: [
              { teacherId: scope.userId },
              { batchId: { $in: scope.teacherBatchIds } },
              { courseId: { $in: scope.teacherCourseIds } },
            ],
          },
        ];
      } else {
        // Student / Guardian: only published assignments in enrolled batches
        filter.batchId = { $in: scope.enrolledBatchIds };
        filter.status = AssignmentStatus.PUBLISHED;
      }
    }

    const docs = await Assignment.find(filter)
      .select('_id title description courseId batchId dueDate totalMarks status updatedAt')
      .limit(options.limit)
      .lean();

    return docs.map((doc) => {
      const id = doc._id.toString();
      const courseId = doc.courseId ? doc.courseId.toString() : '';
      const batchId = doc.batchId ? doc.batchId.toString() : '';

      let actionUrl = `/student/assignments`;
      if (scope.activeRole === UserRole.TEACHER) {
        actionUrl = `/teacher/assignments`;
      } else if (scope.isAdmin || scope.isStaff) {
        actionUrl = `/admin/assignments`;
      }

      const score = calculateRelevanceScore(query, {
        title: doc.title,
        subtitle: `Assignment • Total Marks: ${doc.totalMarks}`,
        snippet: doc.description || undefined,
        updatedAt: doc.updatedAt,
      });

      return {
        id: `assignment_${id}`,
        type: SearchResultType.ASSIGNMENT,
        sourceId: id,
        title: doc.title,
        subtitle: `Assignment • Due: ${new Date(doc.dueDate).toLocaleDateString()} • Marks: ${doc.totalMarks}`,
        snippet: doc.description ? doc.description.slice(0, 160) : undefined,
        actionUrl,
        score,
        courseId,
        batchId,
        matchedFields: ['title', 'description'],
        metadata: {
          totalMarks: doc.totalMarks,
          status: doc.status,
        },
      };
    });
  }
}
