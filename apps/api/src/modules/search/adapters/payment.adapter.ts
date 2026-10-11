import {
  SearchResultType,
  type ISearchResult,
  type ActorSearchScope,
} from '@eta/types';
import { escapeRegex } from '@eta/validation';
import { Payment } from '../../finance/payment.model.js';
import { calculateRelevanceScore } from '../search.scoring.js';
import type { SearchAdapter, AdapterSearchOptions } from './search.adapter.interface.js';

export class PaymentSearchAdapter implements SearchAdapter {
  readonly type = SearchResultType.PAYMENT;

  isAuthorized(scope: ActorSearchScope): boolean {
    // Strictly administrators and finance staff only (PRD §53, §25)
    return scope.isAdmin || scope.isStaff;
  }

  async search(query: string, scope: ActorSearchScope, options: AdapterSearchOptions): Promise<ISearchResult[]> {
    if (!this.isAuthorized(scope)) return [];

    const escaped = escapeRegex(query);
    const regex = new RegExp(escaped, 'i');

    const filter: Record<string, any> = {
      $or: [{ paymentNumber: regex }, { receiptNumber: regex }, { reference: regex }],
    };

    const docs = await Payment.find(filter)
      .select('_id paymentNumber receiptNumber amountMinor currency paymentMethod status paidAt updatedAt')
      .limit(options.limit)
      .lean();

    return docs.map((doc) => {
      const id = doc._id.toString();
      const amountStr = `${(doc.amountMinor / 100).toFixed(2)} ${doc.currency}`;

      const score = calculateRelevanceScore(query, {
        title: doc.paymentNumber,
        code: doc.receiptNumber,
        subtitle: doc.receiptNumber,
        updatedAt: doc.updatedAt,
      });

      return {
        id: `payment_${id}`,
        type: SearchResultType.PAYMENT,
        sourceId: id,
        title: `Payment ${doc.paymentNumber}`,
        subtitle: `Receipt: ${doc.receiptNumber} • ${amountStr} • ${doc.status}`,
        actionUrl: `/admin/finance`,
        score,
        matchedFields: ['paymentNumber', 'receiptNumber', 'reference'],
        metadata: {
          paymentNumber: doc.paymentNumber,
          receiptNumber: doc.receiptNumber,
          amountMinor: doc.amountMinor,
          currency: doc.currency,
          status: doc.status,
        },
      };
    });
  }
}
