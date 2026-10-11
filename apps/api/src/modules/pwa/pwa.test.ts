import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { cacheControlMiddleware } from '../../middleware/cache-control';
import type { Request, Response } from 'express';

describe('Phase 17 — PWA, Offline-First Support, Caching & Performance (PRD §58, §75, §77)', () => {
  describe('PWA Web Manifest & Metadata Compliance', () => {
    const manifestPath = path.resolve(__dirname, '../../../../web/public/site.webmanifest');

    it('has a valid JSON site.webmanifest file', () => {
      expect(fs.existsSync(manifestPath)).toBe(true);
      const content = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(content);

      expect(manifest.name).toBe('Exploratory Training Academy');
      expect(manifest.short_name).toBe('ETA');
      expect(manifest.display).toBe('standalone');
      expect(manifest.start_url).toBe('/');
      expect(manifest.scope).toBe('/');
      expect(manifest.theme_color).toBe('#073C84');
      expect(manifest.background_color).toBe('#060E1A');
    });

    it('defines required 192x192, 256x256, and 512x512 icons with valid files', () => {
      const content = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(content);
      const icons = manifest.icons;

      expect(Array.isArray(icons)).toBe(true);
      expect(icons.length).toBeGreaterThanOrEqual(2);

      const has192 = icons.some((i: any) => i.sizes === '192x192');
      const has512 = icons.some((i: any) => i.sizes === '512x512');
      expect(has192).toBe(true);
      expect(has512).toBe(true);

      // Verify physical icon assets exist in web/public
      for (const icon of icons) {
        const iconPath = path.resolve(__dirname, '../../../../web/public', icon.src.replace(/^\//, ''));
        expect(fs.existsSync(iconPath)).toBe(true);
      }
    });
  });

  describe('Service Worker Architecture & Security Rules (sw.js)', () => {
    const swPath = path.resolve(__dirname, '../../../../web/public/sw.js');

    it('contains a production service worker script with cache versioning and bounds', () => {
      expect(fs.existsSync(swPath)).toBe(true);
      const swCode = fs.readFileSync(swPath, 'utf8');

      expect(swCode).toContain('SW_VERSION');
      expect(swCode).toContain('STATIC_CACHE');
      expect(swCode).toContain('PUBLIC_CACHE');
      expect(swCode).toContain('OFFLINE_CACHE');
      expect(swCode).toContain('MAX_STATIC_CACHE_ITEMS');
      expect(swCode).toContain('MAX_PUBLIC_CACHE_ITEMS');
    });

    it('does NOT call skipWaiting unconditionally on install, preserving unsaved form safety', () => {
      const swCode = fs.readFileSync(swPath, 'utf8');
      // sw.js install event must not chain skipWaiting directly
      const installBlock = swCode.slice(swCode.indexOf("addEventListener('install'"), swCode.indexOf("addEventListener('activate'"));
      expect(installBlock).not.toContain('skipWaiting()');
    });

    it('listens for SKIP_WAITING message for user-confirmed updates', () => {
      const swCode = fs.readFileSync(swPath, 'utf8');
      expect(swCode).toContain("event.data.type === 'SKIP_WAITING'");
      expect(swCode).toContain('self.skipWaiting()');
    });

    it('enforces sensitive endpoint denylist including reports, audit-logs, and assignments', () => {
      const swCode = fs.readFileSync(swPath, 'utf8');

      expect(swCode).toContain('/api/v1/finance');
      expect(swCode).toContain('/api/v1/analytics');
      expect(swCode).toContain('/api/v1/reports');
      expect(swCode).toContain('/api/v1/audit');
      expect(swCode).toContain('/api/v1/audit-logs');
      expect(swCode).toContain('/api/v1/messages');
      expect(swCode).toContain('/api/v1/notifications');
      expect(swCode).toContain('/api/v1/gradebook');
      expect(swCode).toContain('/api/v1/attendance');
      expect(swCode).toContain('/api/v1/assessments');
      expect(swCode).toContain('/api/v1/assignments');
      expect(swCode).toContain('/api/v1/auth');
      expect(swCode).toContain('/api/v1/certificates');
    });

    it('bypasses cache when Authorization header is present', () => {
      const swCode = fs.readFileSync(swPath, 'utf8');
      expect(swCode).toContain("request.headers.has('Authorization')");
    });

    it('only caches successful HTTP 200 responses for static and public content', () => {
      const swCode = fs.readFileSync(swPath, 'utf8');
      expect(swCode).toContain('networkResponse.status === 200');
    });

    it('implements offline navigation fallback to /offline', () => {
      const swCode = fs.readFileSync(swPath, 'utf8');
      expect(swCode).toContain("request.mode === 'navigate'");
      expect(swCode).toContain('/offline');
    });
  });

  describe('API Cache-Control Headers Middleware', () => {
    function createMockRes() {
      const headers: Record<string, string> = {};
      return {
        setHeader: (key: string, val: string) => {
          headers[key.toLowerCase()] = val;
        },
        getHeader: (key: string) => headers[key.toLowerCase()],
        headers,
      } as unknown as Response;
    }

    it('sets private no-store headers for HTTP mutations (POST, PUT, DELETE)', () => {
      const req = { method: 'POST', path: '/api/v1/courses', headers: {} } as Request;
      const res = createMockRes();
      let nextCalled = false;

      cacheControlMiddleware(req, res, () => {
        nextCalled = true;
      });

      expect((res as any).headers['cache-control']).toBe('private, no-cache, no-store, must-revalidate');
      expect(nextCalled).toBe(true);
    });

    it('sets private no-store headers for sensitive GET endpoints (including reports, audit-logs, private certs)', () => {
      const sensitivePaths = [
        '/api/v1/finance/invoices',
        '/api/v1/gradebook/terms',
        '/api/v1/attendance/records',
        '/api/v1/messages/threads',
        '/api/v1/analytics/overview',
        '/api/v1/reports',
        '/api/v1/reports/export',
        '/api/v1/audit/logs',
        '/api/v1/audit-logs',
        '/api/v1/assignments/submissions',
        '/api/v1/certificates/me',
        '/api/v1/certificates/eligibility',
      ];

      for (const p of sensitivePaths) {
        const req = { method: 'GET', path: p, headers: {} } as Request;
        const res = createMockRes();
        let nextCalled = false;

        cacheControlMiddleware(req, res, () => {
          nextCalled = true;
        });

        expect((res as any).headers['cache-control']).toBe('private, no-cache, no-store, must-revalidate');
        expect(nextCalled).toBe(true);
      }
    });

    it('sets private no-store headers when Authorization header is supplied, regardless of path', () => {
      const req = {
        method: 'GET',
        path: '/api/v1/cms/public',
        headers: { authorization: 'Bearer firebase-id-token' },
      } as Request;
      const res = createMockRes();
      let nextCalled = false;

      cacheControlMiddleware(req, res, () => {
        nextCalled = true;
      });

      expect((res as any).headers['cache-control']).toBe('private, no-cache, no-store, must-revalidate');
      expect(nextCalled).toBe(true);
    });

    it('sets public stale-while-revalidate headers for public content endpoints', () => {
      const publicPaths = ['/api/v1/cms/public', '/api/v1/blog', '/api/v1/resources', '/api/v1/courses'];

      for (const p of publicPaths) {
        const req = { method: 'GET', path: p, headers: {} } as Request;
        const res = createMockRes();
        let nextCalled = false;

        cacheControlMiddleware(req, res, () => {
          nextCalled = true;
        });

        expect((res as any).headers['cache-control']).toContain('public');
        expect((res as any).headers['cache-control']).toContain('stale-while-revalidate');
        expect(nextCalled).toBe(true);
      }
    });

    it('sets short-lived must-revalidate header for certificate verification only', () => {
      const req = { method: 'GET', path: '/api/v1/certificates/verify/ETA-CERT-1234', headers: {} } as Request;
      const res = createMockRes();
      let nextCalled = false;

      cacheControlMiddleware(req, res, () => {
        nextCalled = true;
      });

      expect((res as any).headers['cache-control']).toBe('public, max-age=10, must-revalidate');
      expect(nextCalled).toBe(true);
    });
  });
});
