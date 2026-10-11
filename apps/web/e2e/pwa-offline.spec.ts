import { test, expect } from '@playwright/test';

test.describe('PWA & Offline Fallback — PRD §96, §104', () => {
  test('manifest.json serves valid Web App Manifest', async ({ request }) => {
    const res = await request.get('/manifest.json');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.name).toMatch(/Exploratory Training Academy|ETA/i);
    expect(data.display).toBe('standalone');
    expect(data.icons).toBeDefined();
    expect(data.icons.length).toBeGreaterThan(0);
  });

  test('offline fallback page renders clean offline notification banner', async ({ page }) => {
    await page.goto('/offline');
    await expect(page.locator('body')).toContainText(/Offline|Connection|Network/i);
  });
});
