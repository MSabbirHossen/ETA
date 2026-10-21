import type { MetadataRoute } from 'next';

/**
 * Production robots.txt configuration — PRD §103, §104
 * Allows indexing of public informational, admission, and course pages.
 * Disallows indexing of private dashboards, administrative surfaces, search results, and API routes.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://eta-web-omega.vercel.app').replace(/\/+$/, '');

  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/courses',
        '/blog',
        '/resources',
        '/announcements',
        '/calendar',
        '/admissions/apply',
        '/certificate/verify',
        '/verify/',
      ],
      disallow: [
        '/admin/',
        '/student/',
        '/teacher/',
        '/guardian/',
        '/messages/',
        '/notifications/',
        '/search',
        '/profile',
        '/api/',
        '/offline',
        '/unauthorized',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
