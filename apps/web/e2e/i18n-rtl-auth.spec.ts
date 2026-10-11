import { test, expect } from '@playwright/test';
import { testUsers, loginAs } from './helpers/auth';

test.describe('Authenticated Internationalization & RTL Behavior — PRD §104', () => {
  test('Authenticated Student switches EN -> BN -> AR with persistence and RTL direction', async ({ page }) => {
    // Intercept student API
    await page.route('**/api/v1/enrollments/my-enrollments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await loginAs(page, testUsers.studentA);
    await page.goto('/student/dashboard');

    // 1. Initial English state
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // 2. Switch to Bengali (BN)
    const langBtn = page.locator('button[aria-label*="Select language"]').first();
    await langBtn.click();
    await page.locator('button:has-text("বাংলা")').click();

    // Verify lang attribute changed to bn, still LTR, and route remains authenticated
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('text=Tariq Al-Mansoor').first()).toBeVisible();

    // 3. Switch to Arabic (AR)
    await langBtn.click();
    await page.locator('button:has-text("العربية")').click();

    // Verify lang attribute is ar, direction is RTL, and session remains authenticated
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('text=Tariq Al-Mansoor').first()).toBeVisible();

    // 4. Reload page to verify language preference persistence
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('text=Tariq Al-Mansoor').first()).toBeVisible();
  });

  test('Authenticated Admin switches language to Arabic and maintains administrative session in RTL', async ({ page }) => {
    await page.route('**/api/v1/analytics/overview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} }),
      });
    });

    await loginAs(page, testUsers.adminA);
    await page.goto('/admin/dashboard');

    const langBtn = page.locator('button[aria-label*="Select language"]').first();
    await langBtn.click();
    await page.locator('button:has-text("العربية")').click();

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('text=Operations Director').first()).toBeVisible();
  });
});
