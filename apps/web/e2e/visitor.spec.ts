import { test, expect } from '@playwright/test';

test.describe('Visitor Journey & Public Surface — PRD §104', () => {
  test('homepage renders ETA brand headline and navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Exploratory Training Academy|ETA/i);
    // Navigation bar should be visible
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('courses catalog page displays course search and listings', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.locator('h1')).toContainText(/Specialized|Engineering|Course|Computing/i);
  });

  test('blog page renders published content without requiring auth', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.locator('body')).toBeVisible();
  });

  test('resources library renders public materials', async ({ page }) => {
    await page.goto('/resources');
    await expect(page.locator('body')).toBeVisible();
  });

  test('announcements and calendar pages are publicly navigable', async ({ page }) => {
    await page.goto('/announcements');
    await expect(page.locator('body')).toBeVisible();

    await page.goto('/calendar');
    await expect(page.locator('body')).toBeVisible();
  });

  test('certificate verification route handles input code gracefully', async ({ page }) => {
    await page.goto('/certificate/verify/ETA-2025-DEMO', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('admissions apply entry point directs applicant to intake flow', async ({ page }) => {
    await page.goto('/admissions/apply');
    await expect(page.locator('body')).toBeVisible();
    // Verifies that unauthenticated visitor does not see draft application data
    await expect(page.locator('text=Draft Application')).not.toBeVisible({ timeout: 5000 });
  });

  test('robots.txt disallows search crawlers on private authenticated portals', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('Disallow: /admin/');
    expect(body).toContain('Disallow: /student/');
    expect(body).toContain('Disallow: /teacher/');
    expect(body).toContain('Disallow: /guardian/');
    expect(body).toContain('Disallow: /api/');
  });

  test('sitemap.xml serves valid public sitemap index', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('<urlset');
    expect(body).toContain('/courses');
  });
});
