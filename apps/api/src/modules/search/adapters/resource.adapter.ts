import {
  SearchResultType,
  ContentPublicationStatus,
  ResourceAccessType,
  type ISearchResult,
  type ActorSearchScope,
} from '@eta/types';
import { escapeRegex } from '@eta/validation';
import { ResourceModel } from '../../resources/resource.model.js';
import { calculateRelevanceScore } from '../search.scoring.js';
import type { SearchAdapter, AdapterSearchOptions } from './search.adapter.interface.js';

export class ResourceSearchAdapter implements SearchAdapter {
  readonly type = SearchResultType.RESOURCE;

  isAuthorized(_scope: ActorSearchScope): boolean {
    return true; // Resources are searchable (access tiers enforced in detail)
  }

  async search(query: string, scope: ActorSearchScope, options: AdapterSearchOptions): Promise<ISearchResult[]> {
    const escaped = escapeRegex(query);
    const regex = new RegExp(escaped, 'i');

    const filter: Record<string, any> = {
      $or: [{ title: regex }, { description: regex }, { category: regex }, { tags: regex }],
    };

    if (!scope.isAdmin && !scope.isStaff) {
      filter.status = ContentPublicationStatus.PUBLISHED;
      filter.publishedAt = { $lte: new Date() };

      if (scope.isPublic) {
        filter.accessType = ResourceAccessType.PUBLIC;
      }
    }

    const docs = await ResourceModel.find(filter)
      .select('_id title slug description resourceType accessType category featured updatedAt')
      .limit(options.limit)
      .lean();

    return docs.map((doc: any) => {
      const id = doc._id.toString();

      const score = calculateRelevanceScore(query, {
        title: doc.title,
        subtitle: `Resource (${doc.resourceType}) • ${doc.category || 'General'}`,
        snippet: doc.description || undefined,
        isFeatured: doc.featured,
        updatedAt: doc.updatedAt,
      });

      return {
        id: `resource_${id}`,
        type: SearchResultType.RESOURCE,
        sourceId: id,
        title: doc.title,
        subtitle: `Public Resource • ${doc.resourceType} • ${doc.accessType === ResourceAccessType.MEMBERS_ONLY ? 'Members Only' : 'Open Access'}`,
        snippet: doc.description ? doc.description.slice(0, 160) : undefined,
        actionUrl: `/resources/${doc.slug}`,
        score,
        matchedFields: ['title', 'description', 'category'],
        metadata: {
          slug: doc.slug,
          resourceType: doc.resourceType,
          accessType: doc.accessType,
          category: doc.category,
        },
      };
    });
  }
}
