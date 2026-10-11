import {
  SearchResultType,
  type ISearchResult,
  type ActorSearchScope,
} from '@eta/types';
import { escapeRegex } from '@eta/validation';
import { CertificateModel } from '../../certificates/certificate.model.js';
import { calculateRelevanceScore } from '../search.scoring.js';
import type { SearchAdapter, AdapterSearchOptions } from './search.adapter.interface.js';

export class CertificateSearchAdapter implements SearchAdapter {
  readonly type = SearchResultType.CERTIFICATE;

  isAuthorized(scope: ActorSearchScope): boolean {
    // Admin / Staff operational credential search (PRD §53, §26)
    return scope.isAdmin || scope.isStaff;
  }

  async search(query: string, scope: ActorSearchScope, options: AdapterSearchOptions): Promise<ISearchResult[]> {
    if (!this.isAuthorized(scope)) return [];

    const escaped = escapeRegex(query);
    const regex = new RegExp(escaped, 'i');

    const filter: Record<string, any> = {
      $or: [{ certificateNumber: regex }, { title: regex }],
    };

    const docs = await CertificateModel.find(filter)
      .select('_id certificateNumber title status certificateType issuedAt updatedAt')
      .limit(options.limit)
      .lean();

    return docs.map((doc) => {
      const id = doc._id.toString();

      const score = calculateRelevanceScore(query, {
        title: doc.title,
        code: doc.certificateNumber,
        subtitle: doc.certificateNumber,
        updatedAt: doc.updatedAt,
      });

      return {
        id: `certificate_${id}`,
        type: SearchResultType.CERTIFICATE,
        sourceId: id,
        title: doc.title,
        subtitle: `Certificate #${doc.certificateNumber} • Type: ${doc.certificateType} • Status: ${doc.status}`,
        actionUrl: `/admin/certificates`,
        score,
        matchedFields: ['title', 'certificateNumber'],
        metadata: {
          certificateNumber: doc.certificateNumber,
          certificateType: doc.certificateType,
          status: doc.status,
          issuedAt: doc.issuedAt ? new Date(doc.issuedAt).toISOString() : undefined,
        },
      };
    });
  }
}
