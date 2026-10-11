import { SearchResultType, type ISearchResult, type ActorSearchScope } from '@eta/types';

export interface AdapterSearchOptions {
  courseId?: string;
  batchId?: string;
  limit: number;
}

export interface SearchAdapter {
  readonly type: SearchResultType;
  isAuthorized(scope: ActorSearchScope): boolean;
  search(query: string, scope: ActorSearchScope, options: AdapterSearchOptions): Promise<ISearchResult[]>;
}
