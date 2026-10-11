import type { UserRole, UserStatus } from './roles';

/**
 * User document shape — matches PRD §9.4
 */
export interface IUser {
  _id: string;
  firebaseUid: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  roles: UserRole[];
  activeRole: UserRole;
  status: UserStatus;
  preferredLanguage: SupportedLanguage;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Supported locales enum — PRD §57
 */
export enum SupportedLocale {
  EN = 'en',
  BN = 'bn',
  AR = 'ar',
}

/**
 * Supported languages — PRD §57
 */
export type SupportedLanguage = 'en' | 'bn' | 'ar';

/**
 * Layout text direction — PRD §57
 */
export type LocaleDirection = 'ltr' | 'rtl';

/**
 * Standard API success response — PRD §66
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

/**
 * Standard API error response — PRD §66
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Pagination meta — PRD §67
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * Standard pagination query parameters — PRD §67
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
}
