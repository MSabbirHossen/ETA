import {
  SearchResultType,
  CourseVisibility,
  CourseStatus,
  UserRole,
  type ISearchResult,
  type ActorSearchScope,
} from '@eta/types';
import { escapeRegex } from '@eta/validation';
import { Course } from '../../academic/course.model.js';
import { calculateRelevanceScore } from '../search.scoring.js';
import type { SearchAdapter, AdapterSearchOptions } from './search.adapter.interface.js';

export class CourseSearchAdapter implements SearchAdapter {
  readonly type = SearchResultType.COURSE;

  isAuthorized(_scope: ActorSearchScope): boolean {
    // Courses are searchable by all roles including public (PRD §53, §6)
    return true;
  }

  async search(query: string, scope: ActorSearchScope, options: AdapterSearchOptions): Promise<ISearchResult[]> {
    const escaped = escapeRegex(query);
    const regex = new RegExp(escaped, 'i');

    const filter: Record<string, any> = {
      $or: [{ title: regex }, { code: regex }, { description: regex }, { slug: regex }],
    };

    if (options.courseId) {
      filter._id = options.courseId;
    }

    // Role-based visibility enforcement
    if (!scope.isAdmin && !scope.isStaff) {
      const allowedOr: any[] = [
        { visibility: CourseVisibility.PUBLIC, status: CourseStatus.ACTIVE },
      ];

      if (scope.enrolledCourseIds.length > 0) {
        allowedOr.push({ _id: { $in: scope.enrolledCourseIds } });
      }

      if (scope.teacherCourseIds.length > 0) {
        allowedOr.push({ _id: { $in: scope.teacherCourseIds } });
      }

      filter.$and = [{ $or: allowedOr }];
    }

    const docs = await Course.find(filter)
      .select('_id title code slug description level duration status createdAt updatedAt')
      .limit(options.limit)
      .lean();

    return docs.map((doc) => {
      const id = doc._id.toString();
      let actionUrl = `/courses`;
      if (scope.activeRole === UserRole.STUDENT) {
        actionUrl = `/student/courses/${id}`;
      } else if (scope.activeRole === UserRole.TEACHER) {
        actionUrl = `/teacher/courses/${id}`;
      } else if (scope.isAdmin || scope.isStaff) {
        actionUrl = `/admin/academic`;
      }

      const score = calculateRelevanceScore(query, {
        title: doc.title,
        code: doc.code,
        subtitle: doc.code,
        snippet: doc.description,
        updatedAt: doc.updatedAt,
      });

      return {
        id: `course_${id}`,
        type: SearchResultType.COURSE,
        sourceId: id,
        title: doc.title,
        subtitle: `Course Code: ${doc.code} • Level: ${doc.level}`,
        snippet: doc.description ? doc.description.slice(0, 160) : undefined,
        actionUrl,
        score,
        matchedFields: ['title', 'code', 'description'],
        metadata: {
          code: doc.code,
          level: doc.level,
          status: doc.status,
        },
      };
    });
  }
}
