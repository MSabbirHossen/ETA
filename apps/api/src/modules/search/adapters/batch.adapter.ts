import {
  SearchResultType,
  UserRole,
  type ISearchResult,
  type ActorSearchScope,
} from '@eta/types';
import { escapeRegex } from '@eta/validation';
import { Batch } from '../../academic/batch.model.js';
import { calculateRelevanceScore } from '../search.scoring.js';
import type { SearchAdapter, AdapterSearchOptions } from './search.adapter.interface.js';

export class BatchSearchAdapter implements SearchAdapter {
  readonly type = SearchResultType.BATCH;

  isAuthorized(scope: ActorSearchScope): boolean {
    if (scope.isPublic) return false;
    if (scope.isAdmin || scope.isStaff) return true;
    return scope.roles.includes(UserRole.TEACHER);
  }

  async search(query: string, scope: ActorSearchScope, options: AdapterSearchOptions): Promise<ISearchResult[]> {
    if (!this.isAuthorized(scope)) return [];

    const escaped = escapeRegex(query);
    const regex = new RegExp(escaped, 'i');

    const filter: Record<string, any> = {
      $or: [{ batchName: regex }, { batchCode: regex }],
    };

    if (options.courseId) filter.courseId = options.courseId;
    if (options.batchId) filter._id = options.batchId;

    if (!scope.isAdmin && !scope.isStaff) {
      filter.$or = [
        { teacherIds: scope.userId, batchName: regex },
        { teacherIds: scope.userId, batchCode: regex },
      ];
    }

    const docs = await Batch.find(filter)
      .select('_id batchName batchCode courseId status startDate endDate updatedAt')
      .limit(options.limit)
      .lean();

    return docs.map((doc) => {
      const id = doc._id.toString();
      const courseId = doc.courseId ? doc.courseId.toString() : '';

      const actionUrl = scope.isAdmin || scope.isStaff ? `/admin/classes` : `/teacher/classes`;

      const score = calculateRelevanceScore(query, {
        title: doc.batchName,
        code: doc.batchCode,
        subtitle: doc.batchCode,
        updatedAt: doc.updatedAt,
      });

      return {
        id: `batch_${id}`,
        type: SearchResultType.BATCH,
        sourceId: id,
        title: doc.batchName,
        subtitle: `Cohort Code: ${doc.batchCode} • Status: ${doc.status}`,
        actionUrl,
        score,
        courseId,
        batchId: id,
        matchedFields: ['batchName', 'batchCode'],
        metadata: {
          batchCode: doc.batchCode,
          status: doc.status,
        },
      };
    });
  }
}
