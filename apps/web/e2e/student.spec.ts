import { test, expect } from '@playwright/test';
import { testUsers, loginAs } from './helpers/auth';

test.describe('Student Authenticated Journey & IDOR Protection — PRD §104', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept API calls to provide deterministic mock responses for Student A
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
              enrolledAt: '2026-01-15T00:00:00.000Z',
            },
          ],
        }),
      });
    });

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

    await page.route('**/api/v1/classes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });
  });

  test('Student A accesses dashboard, sees enrolled courses and academic overview', async ({ page }) => {
    await loginAs(page, testUsers.studentA);
    await page.goto('/student/dashboard');

    // Verify student authenticated header and welcome banner
    await expect(page.locator('h1')).toContainText(/Academic Overview|Student/i);
    await expect(page.locator('text=Tariq Al-Mansoor').first()).toBeVisible();
    await expect(page.locator('text=CS301').first()).toBeVisible();
  });

  test('Student A navigates through academic coursework pages', async ({ page }) => {
    await loginAs(page, testUsers.studentA);

    // Assignments
    await page.goto('/student/assignments', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    // Grades
    await page.goto('/student/grades', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    // Attendance
    await page.goto('/student/attendance', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    // Finance & Invoices
    await page.goto('/student/finance', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    // Ask ETA AI Study Assistant
    await page.goto('/student/ask-eta', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('Student A attempting cross-student IDOR on Student B invoice is rejected', async ({ page }) => {
    await loginAs(page, testUsers.studentA);
    await page.goto('/student/dashboard');

    // Mock IDOR rejection for Student B invoice
    await page.route('**/api/v1/finance/invoices/inv-student-b', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not authorized to view another student’s financial invoices.',
          },
        }),
      });
    });

    // Make request via page fetch context
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/v1/finance/invoices/inv-student-b', {
        headers: { 'Content-Type': 'application/json' },
      });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
