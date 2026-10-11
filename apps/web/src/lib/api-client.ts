import { auth } from './firebase';
import type { ApiSuccessResponse, ApiErrorResponse } from '@eta/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly errors?: Array<{ field?: string; message: string }>;

  constructor(
    message: string,
    statusCode: number,
    code = 'API_ERROR',
    errors?: Array<{ field?: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

/**
 * Centralized authenticated API client — PRD §16, §66
 *
 * Automatically injects the latest Firebase ID token into request headers.
 * Unwraps standard PRD §66 response envelopes and throws structured errors.
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { headers = {}, ...restOptions } = options;
  delete (restOptions as { requiresAuth?: boolean }).requiresAuth;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  // Obtain ID token from current Firebase session if not explicitly provided
  if (!requestHeaders['Authorization'] && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // Failed to get token; request will proceed and backend will respond with 401 if needed
    }
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
    });
  } catch (err: unknown) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Network error';
    throw new ApiClientError(
      `Unable to connect to ETA API server at ${url} (${message}). Check that the API server is running on port 5000.`,
      0,
      'NETWORK_ERROR',
    );
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorData = data as ApiErrorResponse | null;
    throw new ApiClientError(
      errorData?.message || `Request failed with status ${response.status}`,
      response.status,
      errorData?.code || 'HTTP_ERROR',
      errorData?.errors,
    );
  }

  const successData = data as ApiSuccessResponse<T>;
  return successData.data;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
