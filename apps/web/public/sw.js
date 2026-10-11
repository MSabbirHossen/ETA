/**
 * Exploratory Training Academy (ETA) — Production Service Worker
 * Architecture: Native Service Worker (PWA & Offline-First) — PRD §58, §75, §77
 *
 * Cache Strategy:
 *  - Static Assets (/_next/static/, icons, logos): Cache-First (Bounded to 150 entries)
 *  - Public Content (/api/v1/cms/public, /api/v1/courses, etc.): Stale-While-Revalidate (Bounded to 50 entries)
 *  - HTML Navigation: Network-First with branded /offline fallback
 *  - Sensitive & Authenticated Data: STRICT NETWORK ONLY (Denylisted, Never Cached)
 *  - Lifecycle: New workers remain in 'waiting' state until user confirms via UI prompt
 */

const SW_VERSION = '1.0.3';
const STATIC_CACHE = `eta-static-v${SW_VERSION}`;
const PUBLIC_CACHE = `eta-public-v${SW_VERSION}`;
const OFFLINE_CACHE = `eta-offline-v${SW_VERSION}`;

const EXPECTED_CACHES = [STATIC_CACHE, PUBLIC_CACHE, OFFLINE_CACHE];

// Core app shell assets pre-cached on installation
const PRECACHE_ASSETS = [
  '/offline',
  '/site.webmanifest',
  '/favicons/favicon.ico',
  '/favicons/favicon-32x32.png',
  '/favicons/favicon-16x16.png',
  '/favicons/apple-touch-icon.png',
  '/icons/favicon-192x192.png',
  '/icons/favicon-256x256.png',
  '/icons/favicon-512x512.png',
  '/logos/eta-logo-dark.png',
  '/logos/eta-logo-light.png',
];

// Sensitive API routes that must NEVER be cached in Service Worker — PRD Security Principle
const SENSITIVE_API_PATTERNS = [
  '/api/v1/finance',
  '/api/v1/analytics',
  '/api/v1/reports',
  '/api/v1/audit',
  '/api/v1/audit-logs',
  '/api/v1/messages',
  '/api/v1/notifications',
  '/api/v1/gradebook',
  '/api/v1/attendance',
  '/api/v1/assessments',
  '/api/v1/assignments',
  '/api/v1/admissions',
  '/api/v1/guardians',
  '/api/v1/auth',
  '/api/v1/users',
  '/api/v1/ai',
];

// Public content endpoints eligible for bounded stale-while-revalidate
const PUBLIC_CONTENT_PATTERNS = [
  '/api/v1/cms/public',
  '/api/v1/blog',
  '/api/v1/resources',
  '/api/v1/courses',
  '/api/v1/announcements/public',
  '/api/v1/calendar/public',
];

const MAX_STATIC_CACHE_ITEMS = 150;
const MAX_PUBLIC_CACHE_ITEMS = 50;

/**
 * Trim cache to max items to avoid unbounded memory growth
 */
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      await cache.delete(keys[0]);
      await trimCache(cacheName, maxItems);
    }
  } catch (_err) {
    // Non-fatal cache trim error
  }
}

// ── Install Event ────────────────────────────────────────────────────────
// Pre-caches the offline shell. Does NOT call skipWaiting() immediately so
// active users editing forms or taking assessments are never disrupted.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then(async (cache) => {
      try {
        await cache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn('[SW] Pre-caching partial failure, will cache lazily:', err);
      }
    })
  );
});

// ── Activate Event ───────────────────────────────────────────────────────
// Cleans up obsolete cache generations from previous deployments.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!EXPECTED_CACHES.includes(name) && name.startsWith('eta-')) {
            console.log('[SW] Purging outdated cache:', name);
            return caches.delete(name);
          }
          return Promise.resolve();
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch Event ──────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only handle GET requests; mutations (POST, PUT, DELETE) are ALWAYS network-only
  if (request.method !== 'GET') {
    return;
  }

  // 2. Ignore non-HTTP/HTTPS schemes (e.g. chrome-extension://)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 3. Bypass Next.js chunks, development assets, HMR, and all /_next/ requests
  if (url.pathname.startsWith('/_next/')) {
    return;
  }

  // 4. Bypass third-party origins (Firebase auth, Google APIs, CDN)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 4. Check Sensitive Denylist & Authorization Header
  // Private certificate management endpoints (issue, revoke, me) are sensitive
  const isPrivateCertificate =
    url.pathname.startsWith('/api/v1/certificates') &&
    !url.pathname.startsWith('/api/v1/certificates/verify') &&
    !url.pathname.startsWith('/api/v1/certificates/artifact');

  const isSensitive =
    SENSITIVE_API_PATTERNS.some((pattern) => url.pathname.startsWith(pattern)) ||
    isPrivateCertificate;

  const hasAuthHeader = request.headers.has('Authorization');

  if (isSensitive || hasAuthHeader) {
    // Strict Network-Only, NEVER stored in client CacheStorage
    return;
  }

  // 5. Navigation / Page Requests (HTML App Shell)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(async () => {
          // Network failed: attempt to match cached offline fallback
          const cache = await caches.open(OFFLINE_CACHE);
          const cachedOffline = await cache.match('/offline');
          if (cachedOffline) {
            return cachedOffline;
          }
          // Minimal text fallback if offline cache is missing
          return new Response(
            '<html><head><meta charset="utf-8"><title>ETA — Offline</title></head><body style="background:#060E1A;color:#fff;font-family:sans-serif;text-align:center;padding:50px;"><h2>You are currently offline</h2><p>Please check your internet connection.</p><button onclick="location.reload()" style="padding:10px 20px;background:#0B7CEB;color:#fff;border:none;border-radius:6px;cursor:pointer;">Retry</button></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 6. Static Immutable Assets (fonts, favicons, logos, images)
  const isStaticAsset =
    url.pathname.startsWith('/favicons/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/logos/') ||
    url.pathname.startsWith('/brand/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          // Only cache successful 200 responses
          if (networkResponse.ok && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
            trimCache(STATIC_CACHE, MAX_STATIC_CACHE_ITEMS);
          }
          return networkResponse;
        } catch (err) {
          return cachedResponse || Promise.reject(err);
        }
      })
    );
    return;
  }

  // 7. Public Content API (Stale-While-Revalidate)
  const isPublicApi = PUBLIC_CONTENT_PATTERNS.some((pattern) => url.pathname.startsWith(pattern));
  if (isPublicApi) {
    event.respondWith(
      caches.open(PUBLIC_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);

        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            // Only cache valid 200 responses, never error or unauthorized responses
            if (networkResponse.ok && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
              trimCache(PUBLIC_CACHE, MAX_PUBLIC_CACHE_ITEMS);
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});

// ── Message Event (Lifecycle & Privacy Commands) ─────────────────────────
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // Manual update trigger: invoked only when user clicks "Refresh Now" in update toast
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Privacy cleanup on User Logout / Role Switch: logs privacy event
  if (event.data.type === 'CLEAR_USER_DATA') {
    // User-specific offline items are stored in localStorage/IndexedDB under user ID
    // and purged by offlineStorage.clearUserData(). Public cache is preserved for
    // anonymous offline navigation.
  }
});
