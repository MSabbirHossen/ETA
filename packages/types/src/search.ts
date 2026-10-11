import { UserRole } from './roles';

/**
 * Searchable entity types across the ETA platform (PRD §53).
 */
export enum SearchResultType {
  COURSE = 'COURSE',
  LESSON = 'LESSON',
  MATERIAL = 'MATERIAL',
  ASSIGNMENT = 'ASSIGNMENT',
  QUESTION = 'QUESTION',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  USER = 'USER',
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  BATCH = 'BATCH',
  PAYMENT = 'PAYMENT',
  CERTIFICATE = 'CERTIFICATE',
  APPLICATION = 'APPLICATION',
  BLOG_POST = 'BLOG_POST',
  RESOURCE = 'RESOURCE',
}

/**
 * Safe, normalized search result DTO.
 * Exposes only authorized public/role-permitted fields (PRD §53).
 */
export interface ISearchResult {
  id: string;
  type: SearchResultType;
  sourceId: string;
  title: string;
  subtitle?: string;
  snippet?: string;
  actionUrl: string;
  score?: number;
  matchedFields?: string[];
  courseId?: string;
  batchId?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

/**
 * Global search response envelope with pagination and authorization-safe facets.
 */
export interface ISearchResponse {
  query: string;
  total: number;
  page: number;
  limit: number;
  pages: number;
  results: ISearchResult[];
  facets: Partial<Record<SearchResultType, number>>;
}

/**
 * Search query parameters DTO.
 */
export interface SearchQueryDto {
  q: string;
  type?: SearchResultType;
  types?: SearchResultType[];
  courseId?: string;
  batchId?: string;
  page?: number;
  limit?: number;
}

/**
 * Central actor search scope derived server-side.
 * Controls data access before database queries are constructed.
 */
export interface ActorSearchScope {
  userId?: string;
  roles: UserRole[];
  activeRole?: UserRole;
  enrolledCourseIds: string[];
  enrolledBatchIds: string[];
  teacherCourseIds: string[];
  teacherBatchIds: string[];
  linkedStudentIds: string[];
  isAdmin: boolean;
  isStaff: boolean;
  isPublic: boolean;
}
