import type { Request, Response, NextFunction } from 'express';

/**
 * Cache Control Middleware — PRD §77, Phase 17
 *
 * Implements strict security-first caching policies:
 * - Mutations (POST, PUT, PATCH, DELETE) -> no-store, private
 * - Sensitive domains -> no-store, private
 * - Public content GET endpoints -> bounded public caching with stale-while-revalidate
 * - Certificate verification -> short-lived public caching with must-revalidate
 */
export function cacheControlMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 1. Any HTTP mutation must NEVER be cached
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    return next();
  }

  // 2. Sensitive domains must NEVER be stored in shared caches
  const path = req.path;

  // Private certificate endpoints (me, eligibility, download, issue, revoke) are sensitive
  const isPrivateCertificate =
    path.includes('/certificates') &&
    !path.includes('/certificates/verify') &&
    !path.includes('/certificates/artifact');

  const isSensitive =
    path.includes('/finance') ||
    path.includes('/gradebook') ||
    path.includes('/attendance') ||
    path.includes('/assessment') ||
    path.includes('/assignment') ||
    path.includes('/admission') ||
    path.includes('/guardian') ||
    path.includes('/analytics') ||
    path.includes('/reports') ||
    path.includes('/audit') ||
    path.includes('/audit-logs') ||
    path.includes('/messages') ||
    path.includes('/notifications') ||
    path.includes('/auth') ||
    path.includes('/users') ||
    path.includes('/ai') ||
    isPrivateCertificate;

  if (isSensitive || req.headers.authorization) {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    return next();
  }

  // 3. Certificate verification must be fresh (10s max age to reflect revocations)
  if (path.includes('/certificates/verify')) {
    res.setHeader('Cache-Control', 'public, max-age=10, must-revalidate');
    return next();
  }

  // 4. Public content endpoints (CMS, blog, public courses, resources)
  const isPublicContent =
    path.includes('/cms/public') ||
    path.includes('/blog') ||
    path.includes('/resources') ||
    path.includes('/announcements/public') ||
    path.includes('/courses');

  if (isPublicContent) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return next();
  }

  // Default fallback: conservative private caching
  res.setHeader('Cache-Control', 'private, no-cache');
  next();
}
