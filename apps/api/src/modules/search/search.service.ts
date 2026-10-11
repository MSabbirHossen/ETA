import {
  SearchResultType,
  type ISearchResult,
  type ISearchResponse,
  type SearchQueryDto,
  type ActorSearchScope,
} from '@eta/types';
import type { UserDocument } from '../users/user.model.js';
import { resolveActorScope } from './search.scope.js';
import type { SearchAdapter } from './adapters/search.adapter.interface.js';
import { CourseSearchAdapter } from './adapters/course.adapter.js';
import { LessonSearchAdapter } from './adapters/lesson.adapter.js';
import { MaterialSearchAdapter } from './adapters/material.adapter.js';
import { AssignmentSearchAdapter } from './adapters/assignment.adapter.js';
import { QuestionSearchAdapter } from './adapters/question.adapter.js';
import { AnnouncementSearchAdapter } from './adapters/announcement.adapter.js';
import { UserSearchAdapter } from './adapters/user.adapter.js';
import { BatchSearchAdapter } from './adapters/batch.adapter.js';
import { PaymentSearchAdapter } from './adapters/payment.adapter.js';
import { CertificateSearchAdapter } from './adapters/certificate.adapter.js';
import { ApplicationSearchAdapter } from './adapters/application.adapter.js';
import { BlogSearchAdapter } from './adapters/blog.adapter.js';
import { ResourceSearchAdapter } from './adapters/resource.adapter.js';

export class SearchService {
  private static adapters: SearchAdapter[] = [
    new CourseSearchAdapter(),
    new LessonSearchAdapter(),
    new MaterialSearchAdapter(),
    new AssignmentSearchAdapter(),
    new QuestionSearchAdapter(),
    new AnnouncementSearchAdapter(),
    new UserSearchAdapter(),
    new BatchSearchAdapter(),
    new PaymentSearchAdapter(),
    new CertificateSearchAdapter(),
    new ApplicationSearchAdapter(),
    new BlogSearchAdapter(),
    new ResourceSearchAdapter(),
  ];

  /**
   * Executes unified global search across all authorized ETA platform domains (PRD §53).
   */
  public static async search(
    queryDto: SearchQueryDto,
    user?: UserDocument
  ): Promise<ISearchResponse> {
    const q = queryDto.q.trim();
    const page = queryDto.page && queryDto.page > 0 ? queryDto.page : 1;
    const limit = queryDto.limit && queryDto.limit > 0 ? Math.min(queryDto.limit, 50) : 20;

    // 1. Resolve Actor Authorized Search Scope Server-Side
    const scope: ActorSearchScope = await resolveActorScope(user);

    // 2. Filter requested types (if any)
    let requestedTypes: SearchResultType[] = [];
    if (queryDto.types && queryDto.types.length > 0) {
      requestedTypes = queryDto.types;
    } else if (queryDto.type) {
      requestedTypes = [queryDto.type];
    }

    // 3. Determine active authorized adapters
    const activeAdapters = this.adapters.filter((adapter) => {
      // Must pass authorization check for actor
      if (!adapter.isAuthorized(scope)) {
        return false;
      }
      // If user filtered by specific types, adapter must match
      if (requestedTypes.length > 0) {
        // Special case: UserSearchAdapter handles USER, STUDENT, and TEACHER
        if (adapter.type === SearchResultType.USER) {
          return (
            requestedTypes.includes(SearchResultType.USER) ||
            requestedTypes.includes(SearchResultType.STUDENT) ||
            requestedTypes.includes(SearchResultType.TEACHER)
          );
        }
        return requestedTypes.includes(adapter.type);
      }
      return true;
    });

    // 4. Oversampling limit per adapter
    const candidateLimit = Math.min(Math.max(limit * 2, 20), 50);

    // 5. Execute domain searches in parallel with failure isolation
    const searchTasks = activeAdapters.map((adapter) =>
      adapter
        .search(q, scope, {
          courseId: queryDto.courseId,
          batchId: queryDto.batchId,
          limit: candidateLimit,
        })
        .catch((err) => {
          console.error(`[SearchService] Adapter ${adapter.type} failed:`, err);
          return [] as ISearchResult[];
        })
    );

    const adapterResults = await Promise.all(searchTasks);

    // 6. Merge candidate results
    let mergedResults: ISearchResult[] = [];
    for (const results of adapterResults) {
      mergedResults.push(...results);
    }

    // Filter by requested types if specific sub-type requested (e.g. STUDENT vs USER)
    if (requestedTypes.length > 0) {
      mergedResults = mergedResults.filter((r) => requestedTypes.includes(r.type));
    }

    // 7. Calculate authorization-safe facets
    const facets: Partial<Record<SearchResultType, number>> = {};
    for (const item of mergedResults) {
      facets[item.type] = (facets[item.type] || 0) + 1;
    }

    // 8. Global Rank & Normalization Sort
    mergedResults.sort((a, b) => {
      const scoreA = a.score ?? 0;
      const scoreB = b.score ?? 0;
      if (scoreB !== scoreA) {
        return scoreB - scoreA; // Highest relevance first
      }
      return a.title.localeCompare(b.title); // Stable tie-breaking
    });

    const total = mergedResults.length;
    const pages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedResults = mergedResults.slice(startIndex, startIndex + limit);

    return {
      query: q,
      total,
      page,
      limit,
      pages,
      results: paginatedResults,
      facets,
    };
  }
}
