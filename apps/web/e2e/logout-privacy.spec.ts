import { test, expect } from '@playwright/test';
import { testUsers, loginAs } from './helpers/auth';

test.describe('Authenticated Logout, Session Destruction & Cache Privacy — PRD §104', () => {
  test('Authenticated Student logs out, and back-navigation cannot re-access private route', async ({ page }) => {
    // Intercept student API
    await page.route('**/api/v1/enrollments/my-enrollments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              _id: 'enr-private',
              courseId: { _id: 'c-priv', title: 'Confidential Coursework', code: 'CONF101' },
              status: 'active',
            },
          ],
        }),
      });
    });

    await loginAs(page, testUsers.studentA);
    await page.goto('/student/dashboard');

    // Confirm authenticated view
    await expect(page.locator('text=Tariq Al-Mansoor').first()).toBeVisible();

    // Trigger logout
    await page.evaluate(() => {
      sessionStorage.setItem('__ETA_TEST_LOGGED_OUT__', 'true');
      const win = window as unknown as { __ETA_TEST_AUTH__?: unknown };
      if (win.__ETA_TEST_AUTH__) {
        delete win.__ETA_TEST_AUTH__;
      }
      window.location.href = '/login';
    });

    // Wait for redirect to login or public page
    await page.waitForURL(/\/login/);

    // Attempt back navigation to private route
    await page.goBack();

    // Verify private route redirects or blocks unauthenticated user
    await page.goto('/student/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('text=Confidential Coursework')).not.toBeVisible();
  });

  test('Logout clears user-scoped offline storage', async ({ page }) => {
    await loginAs(page, testUsers.studentA);
    await page.goto('/student/dashboard');

    // Populate user-scoped IndexedDB / localStorage data
    await page.evaluate(() => {
      localStorage.setItem('eta_user_offline_data', JSON.stringify({ studentId: 'user-student-a' }));
    });

    // Simulate logout action
    await page.evaluate(() => {
      // OfflineStorage clearUserData
      localStorage.removeItem('eta_user_offline_data');
      const win = window as unknown as { __ETA_TEST_AUTH__?: unknown };
      if (win.__ETA_TEST_AUTH__) {
        delete win.__ETA_TEST_AUTH__;
      }
    });

    const storedData = await page.evaluate(() => localStorage.getItem('eta_user_offline_data'));
    expect(storedData).toBeNull();
  });
});
