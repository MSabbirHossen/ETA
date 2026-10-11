import {
  SearchResultType,
  LessonStatus,
  UserRole,
  type ISearchResult,
  type ActorSearchScope,
} from '@eta/types';
import { escapeRegex } from '@eta/validation';
import { Lesson } from '../../learning/lesson.model.js';
import { calculateRelevanceScore } from '../search.scoring.js';
import type { SearchAdapter, AdapterSearchOptions } from './search.adapter.interface.js';

export class LessonSearchAdapter implements SearchAdapter {
  readonly type = SearchResultType.LESSON;

  isAuthorized(scope: ActorSearchScope): boolean {
    // Lessons are only searchable by enrolled students, assigned teachers, linked guardians, or admins (PRD §53)
    if (scope.isPublic) return false;
    if (scope.isAdmin || scope.isStaff) return true;
    return (
      scope.enrolledCourseIds.length > 0 ||
      scope.teacherCourseIds.length > 0
    );
  }

  async search(query: string, scope: ActorSearchScope, options: AdapterSearchOptions): Promise<ISearchResult[]> {
    if (!this.isAuthorized(scope)) return [];

    const escaped = escapeRegex(query);
    const regex = new RegExp(escaped, 'i');

    const filter: Record<string, any> = {
      $or: [{ title: regex }, { description: regex }, { slug: regex }],
    };

    if (options.courseId) {
      filter.courseId = options.courseId;
    }

    if (!scope.isAdmin && !scope.isStaff) {
      if (scope.roles.includes(UserRole.TEACHER)) {
        filter.courseId = { $in: scope.teacherCourseIds };
      } else {
        // Student or Guardian scope: only published lessons in enrolled courses
        filter.courseId = { $in: scope.enrolledCourseIds };
        filter.status = LessonStatus.PUBLISHED;
      }
    }

    const docs = await Lesson.find(filter)
      .select('_id title description courseId lessonType estimatedDurationMinutes status updatedAt')
      .limit(options.limit)
      .lean();

    return docs.map((doc) => {
      const id = doc._id.toString();
      const courseId = doc.courseId ? doc.courseId.toString() : '';

      let actionUrl = `/courses`;
      if (scope.activeRole === UserRole.STUDENT) {
        actionUrl = courseId ? `/student/courses/${courseId}` : `/student/dashboard`;
      } else if (scope.activeRole === UserRole.TEACHER) {
        actionUrl = courseId ? `/teacher/courses/${courseId}` : `/teacher/dashboard`;
      } else if (scope.isAdmin || scope.isStaff) {
        actionUrl = `/admin/classes`;
      }

      const score = calculateRelevanceScore(query, {
        title: doc.title,
        subtitle: doc.lessonType,
        snippet: doc.description || undefined,
        updatedAt: doc.updatedAt,
      });

      return {
        id: `lesson_${id}`,
        type: SearchResultType.LESSON,
        sourceId: id,
        title: doc.title,
        subtitle: `Lesson (${doc.lessonType}) • ${doc.estimatedDurationMinutes ? `${doc.estimatedDurationMinutes} mins` : 'Self-paced'}`,
        snippet: doc.description ? doc.description.slice(0, 160) : undefined,
        actionUrl,
        score,
        courseId,
        matchedFields: ['title', 'description'],
        metadata: {
          lessonType: doc.lessonType,
          status: doc.status,
        },
      };
    });
  }
}
