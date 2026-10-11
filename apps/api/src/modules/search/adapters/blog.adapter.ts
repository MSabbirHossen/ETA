import {
  SearchResultType,
  ContentPublicationStatus,
  type ISearchResult,
  type ActorSearchScope,
} from '@eta/types';
import { escapeRegex } from '@eta/validation';
import { BlogPostModel } from '../../blog/blog.model.js';
import { calculateRelevanceScore } from '../search.scoring.js';
import type { SearchAdapter, AdapterSearchOptions } from './search.adapter.interface.js';

export class BlogSearchAdapter implements SearchAdapter {
  readonly type = SearchResultType.BLOG_POST;

  isAuthorized(_scope: ActorSearchScope): boolean {
    return true; // Blog articles are public knowledge
  }

  async search(query: string, scope: ActorSearchScope, options: AdapterSearchOptions): Promise<ISearchResult[]> {
    const escaped = escapeRegex(query);
    const regex = new RegExp(escaped, 'i');

    const filter: Record<string, any> = {
      $or: [{ title: regex }, { excerpt: regex }, { tags: regex }],
    };

    if (!scope.isAdmin && !scope.isStaff) {
      filter.status = ContentPublicationStatus.PUBLISHED;
      filter.publishedAt = { $lte: new Date() };
    }

    const docs = await BlogPostModel.find(filter)
      .select('_id title slug excerpt readingTime featured publishedAt updatedAt')
      .limit(options.limit)
      .lean();

    return docs.map((doc: any) => {
      const id = doc._id.toString();

      const score = calculateRelevanceScore(query, {
        title: doc.title,
        subtitle: `Reading Time: ${doc.readingTime || 3} min`,
        snippet: doc.excerpt || undefined,
        isFeatured: doc.featured,
        updatedAt: doc.publishedAt || doc.updatedAt,
      });

      return {
        id: `blog_${id}`,
        type: SearchResultType.BLOG_POST,
        sourceId: id,
        title: doc.title,
        subtitle: `Editorial Article • ${doc.readingTime || 3} min read`,
        snippet: doc.excerpt ? doc.excerpt.slice(0, 160) : undefined,
        actionUrl: `/blog/${doc.slug}`,
        score,
        matchedFields: ['title', 'excerpt', 'tags'],
        metadata: {
          slug: doc.slug,
          readingTime: doc.readingTime,
          featured: doc.featured,
        },
      };
    });
  }
}
