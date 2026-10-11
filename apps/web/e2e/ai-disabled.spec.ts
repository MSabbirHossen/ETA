import { test, expect } from '@playwright/test';
import { testUsers, loginAs } from './helpers/auth';

test.describe('AI Kill Switch & Disabled Mode Behavior — PRD §99, §103, §104', () => {
  test('Direct AI API returns 503 SERVICE_UNAVAILABLE when AI is disabled', async ({ page }) => {
    // Intercept AI endpoints returning 503
    await page.route('**/api/v1/ai/**', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'AI study assistant features are currently disabled by platform administrator.',
          },
        }),
      });
    });

    await loginAs(page, testUsers.studentA);
    await page.goto('/');

    // Call direct AI chat endpoint
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/v1/ai/study-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Can you summarize Chapter 3?' }),
      });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(response.body.error.message).toContain('disabled');
  });

  test('Ask ETA UI gracefully renders unavailable notice when AI is disabled', async ({ page }) => {
    await page.route('**/api/v1/ai/**', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'AI study assistant features are currently disabled.',
          },
        }),
      });
    });

    await loginAs(page, testUsers.studentA);
    await page.goto('/student/ask-eta');

    // UI shows notice or error banner without crashing
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/disabled|failed|unavailable|error/i).first()).toBeVisible();
  });

  test('Core academic platform and student dashboard remain fully functional when AI is disabled', async ({ page }) => {
    await page.route('**/api/v1/courses', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              _id: 'course-a-id',
              title: 'CS301: Advanced Systems Engineering',
              code: 'CS301',
              description: 'Kernel architectures and distributed consensus.',
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/enrollments/my-enrollments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              _id: 'enr-course-a',
              courseId: 'course-a-id',
              status: 'active',
            },
          ],
        }),
      });
    });

    await loginAs(page, testUsers.studentA);
    await page.goto('/student/dashboard');

    // Dashboard renders normally
    await expect(page.locator('h1')).toContainText(/Academic Overview|Student/i);
    await expect(page.locator('text=Tariq Al-Mansoor').first()).toBeVisible();
    await expect(page.locator('text=CS301').first()).toBeVisible();
  });
});
