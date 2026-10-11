import {
  SearchResultType,
  MaterialVisibility,
  MaterialStatus,
  UserRole,
  type ISearchResult,
  type ActorSearchScope,
} from '@eta/types';
import { escapeRegex } from '@eta/validation';
import { LearningMaterial } from '../../learning/material.model.js';
import { calculateRelevanceScore } from '../search.scoring.js';
import type { SearchAdapter, AdapterSearchOptions } from './search.adapter.interface.js';

export class MaterialSearchAdapter implements SearchAdapter {
  readonly type = SearchResultType.MATERIAL;

  isAuthorized(_scope: ActorSearchScope): boolean {
    return true; // Enrolled students, teachers, admins, and public (for public materials)
  }

  async search(query: string, scope: ActorSearchScope, options: AdapterSearchOptions): Promise<ISearchResult[]> {
    const escaped = escapeRegex(query);
    const regex = new RegExp(escaped, 'i');

    const filter: Record<string, any> = {
      $or: [{ title: regex }, { description: regex }],
    };

    if (options.courseId) {
      filter.courseId = options.courseId;
    }

    if (!scope.isAdmin && !scope.isStaff) {
      const allowedOr: any[] = [
        { visibility: MaterialVisibility.PUBLIC, status: MaterialStatus.PUBLISHED },
      ];

      if (scope.enrolledCourseIds.length > 0) {
        allowedOr.push({
          courseId: { $in: scope.enrolledCourseIds },
          status: MaterialStatus.PUBLISHED,
        });
      }

      if (scope.teacherCourseIds.length > 0) {
        allowedOr.push({
          courseId: { $in: scope.teacherCourseIds },
        });
      }

      filter.$and = [{ $or: allowedOr }];
    }

    const docs = await LearningMaterial.find(filter)
      .select('_id title description courseId lessonId type downloadable status updatedAt')
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
        subtitle: doc.type,
        snippet: doc.description || undefined,
        updatedAt: doc.updatedAt,
      });

      return {
        id: `material_${id}`,
        type: SearchResultType.MATERIAL,
        sourceId: id,
        title: doc.title,
        subtitle: `Learning Material • Type: ${doc.type}`,
        snippet: doc.description ? doc.description.slice(0, 160) : undefined,
        actionUrl,
        score,
        courseId,
        matchedFields: ['title', 'description'],
        metadata: {
          materialType: doc.type,
          downloadable: doc.downloadable,
        },
      };
    });
  }
}
