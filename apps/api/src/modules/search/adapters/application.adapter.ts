import {
  SearchResultType,
  type ISearchResult,
  type ActorSearchScope,
} from '@eta/types';
import { escapeRegex } from '@eta/validation';
import { AdmissionApplication } from '../../admission/admission-application.model.js';
import { calculateRelevanceScore } from '../search.scoring.js';
import type { SearchAdapter, AdapterSearchOptions } from './search.adapter.interface.js';

export class ApplicationSearchAdapter implements SearchAdapter {
  readonly type = SearchResultType.APPLICATION;

  isAuthorized(scope: ActorSearchScope): boolean {
    // Admin and admissions staff operational search (PRD §53)
    return scope.isAdmin || scope.isStaff;
  }

  async search(query: string, scope: ActorSearchScope, options: AdapterSearchOptions): Promise<ISearchResult[]> {
    if (!this.isAuthorized(scope)) return [];

    const escaped = escapeRegex(query);
    const regex = new RegExp(escaped, 'i');

    const filter: Record<string, any> = {
      $or: [
        { applicantName: regex },
        { applicantEmail: regex },
        { applicationNumber: regex },
      ],
    };

    const docs = await AdmissionApplication.find(filter)
      .select('_id applicationNumber applicantName applicantEmail courseId status updatedAt')
      .limit(options.limit)
      .lean();

    return docs.map((doc: any) => {
      const id = doc._id.toString();
      const courseId = doc.courseId ? doc.courseId.toString() : '';

      const score = calculateRelevanceScore(query, {
        title: doc.applicantName || 'Applicant',
        code: doc.applicationNumber,
        subtitle: doc.applicationNumber,
        updatedAt: doc.updatedAt,
      });

      return {
        id: `app_${id}`,
        type: SearchResultType.APPLICATION,
        sourceId: id,
        title: `Application: ${doc.applicantName || 'Applicant'}`,
        subtitle: `Ref #${doc.applicationNumber || id.slice(-6)} • ${doc.applicantEmail} • Status: ${doc.status}`,
        actionUrl: `/admin/admissions`,
        score,
        courseId,
        matchedFields: ['applicantName', 'applicantEmail', 'applicationNumber'],
        metadata: {
          applicationNumber: doc.applicationNumber,
          status: doc.status,
        },
      };
    });
  }
}
