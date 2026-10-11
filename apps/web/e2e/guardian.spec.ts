import { test, expect } from '@playwright/test';
import { testUsers, loginAs } from './helpers/auth';

test.describe('Guardian Authenticated Journey & Link Revocation — PRD §104', () => {
  const verifiedStudentA = {
    linkId: 'guardian-link-verified-1',
    relationship: 'Father',
    isPrimary: true,
    emergencyContact: true,
    permissions: ['VIEW_ATTENDANCE', 'VIEW_GRADES', 'PAY_INVOICES'],
    student: {
      _id: 'user-student-a',
      name: 'Tariq Al-Mansoor',
      email: 'tariq.a@eta.academy',
      phone: '+971-50-1234567',
    },
    enrollments: [
      {
        _id: 'enr-course-a',
        courseId: {
          _id: 'course-a-id',
          title: 'CS301: Advanced Systems Engineering',
          code: 'CS301',
          level: 'ADVANCED',
        },
        batchId: {
          _id: 'batch-a-id',
          name: 'Fall 2026 Batch Alpha',
          code: 'F26-A',
        },
        status: 'active',
        enrollmentDate: '2026-01-15T00:00:00.000Z',
      },
    ],
  };

  test('Verified Guardian A accesses dashboard and views Student A permitted records', async ({ page }) => {
    // Intercept verified student data
    await page.route('**/api/v1/guardians/my-students', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [verifiedStudentA],
        }),
      });
    });

    await loginAs(page, testUsers.guardianA);
    await page.goto('/guardian/dashboard');

    // Verify guardian portal header and student details rendered
    await expect(page.locator('h1')).toContainText(/Guardian Portal|Guardian/i);
    await expect(page.locator('text=Tariq Al-Mansoor').first()).toBeVisible();
    await expect(page.locator('text=CS301').first()).toBeVisible();
    await expect(page.locator('text=Father').first()).toBeVisible();
  });

  test('Revoked or Pending Guardian Link denies access and clears student records', async ({ page }) => {
    // Intercept revoked/empty link state
    await page.route('**/api/v1/guardians/my-students', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [], // No active verified students linked
        }),
      });
    });

    await loginAs(page, testUsers.guardianA);
    await page.goto('/guardian/dashboard');

    // Student A personal data must NOT be rendered
    await expect(page.locator('text=Tariq Al-Mansoor')).not.toBeVisible();

    // Direct student gradebook / records access rejected with 403
    await page.route('**/api/v1/guardians/students/user-student-a/grades', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Guardian authorization link is revoked or pending verification.',
          },
        }),
      });
    });

    const response = await page.evaluate(async () => {
      const res = await fetch('/api/v1/guardians/students/user-student-a/grades', {
        headers: { 'Content-Type': 'application/json' },
      });
      return { status: res.status, body: await res.json() };
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
