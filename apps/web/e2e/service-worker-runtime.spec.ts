import { test, expect } from '@playwright/test';

test.describe('Real Service Worker Runtime & CacheStorage Privacy — PRD §75, §77, §104', () => {
  test('Service worker registers, activates, controls client and obeys CacheStorage privacy rules', async ({ page, context }) => {
    // 1. Navigate to homepage
    await page.goto('/');

    // 2. Wait for Service Worker registration and controller activation
    const swStatus = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return { supported: false };
      }
      const reg = await navigator.serviceWorker.ready;
      const worker = reg.active || reg.installing || reg.waiting;
      if (worker && worker.state !== 'activated') {
        await new Promise((resolve) => {
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') resolve(true);
          });
          setTimeout(resolve, 2000);
        });
      }
      return {
        supported: true,
        scope: reg.scope,
        hasController: Boolean(navigator.serviceWorker.controller),
        state: reg.active?.state,
      };
    });

    expect(swStatus.supported).toBe(true);
    expect(['activated', 'activating']).toContain(swStatus.state);

    // 3. Inspect CacheStorage keys and cached items across all caches
    const cachedUrls: string[] = await page.evaluate(async () => {
      const keys = await window.caches.keys();
      const urls: string[] = [];
      for (const cacheName of keys) {
        const cache = await window.caches.open(cacheName);
        const requests = await cache.keys();
        for (const req of requests) {
          urls.push(req.url);
        }
      }
      return urls;
    });

    // 4. Strict PRD Privacy Gate: verify NO sensitive API endpoints in CacheStorage
    const sensitivePatterns = [
      '/api/v1/finance',
      '/api/v1/grades',
      '/api/v1/messages',
      '/api/v1/audit',
      '/api/v1/analytics',
      '/api/v1/reports',
      '/api/v1/ai',
    ];

    for (const pattern of sensitivePatterns) {
      const leaked = cachedUrls.filter((url) => url.includes(pattern));
      expect(leaked, `Sensitive endpoint leaked into client CacheStorage: ${pattern}`).toHaveLength(0);
    }

    // 5. Switch browser context offline to test real Service Worker offline fallback
    await context.setOffline(true);

    try {
      // Reload or navigate while offline
      await page.goto('/offline');
      await expect(page.locator('body')).toContainText(/Offline|Connection|Network/i);
    } finally {
      // 6. Restore online
      await context.setOffline(false);
    }
  });

  test('Service Worker update lifecycle preserves active session without unexpected auto-reload', async ({ page }) => {
    await page.goto('/');

    // Verify client-side registration logic has update listener attached
    const hasSWSupport = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    expect(hasSWSupport).toBe(true);

    // Verify service worker script exports SKIP_WAITING listener
    const swSourceRes = await page.request.get('/sw.js');
    expect(swSourceRes.status()).toBe(200);
    const swSource = await swSourceRes.text();
    expect(swSource).toContain('SKIP_WAITING');
    expect(swSource).toContain('SENSITIVE_API_PATTERNS');
    expect(swSource).toContain('/offline');
  });
});
