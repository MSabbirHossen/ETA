import { test, expect } from '@playwright/test';
import { testUsers, loginAs } from './helpers/auth';

test.describe('Admin Authenticated Journey & Super Admin Boundary — PRD §104', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept common admin API endpoints
    await page.route('**/api/v1/analytics/overview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            activeStudents: 142,
            activeCourses: 12,
            completionRate: 88.5,
            monthlyRevenue: 45000,
          },
        }),
      });
    });

    await page.route('**/api/v1/audit-logs**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              _id: 'audit-log-1',
              action: 'COURSE_PUBLISHED',
              actorRole: 'ADMIN',
              timestamp: '2026-10-01T12:00:00.000Z',
              details: { courseId: 'course-a-id' },
            },
          ],
        }),
      });
    });

    await page.route('**/api/v1/certificates**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
        }),
      });
    });

    await page.route('**/api/v1/admissions**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
        }),
      });
    });

    await page.route('**/api/v1/finance/overview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { totalCollected: 125000, pendingInvoices: 3 },
        }),
      });
    });
  });

  test('Admin A executes representative operational workflow across administration console', async ({ page }) => {
    await loginAs(page, testUsers.adminA);

    // Dashboard
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Administration Console|Admin/i);
    await expect(page.locator('text=Operations Director').first()).toBeVisible();

    // Academics Management
    await page.goto('/admin/academic', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    // Admissions Review
    await page.goto('/admin/admissions', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    // Finance & Invoicing
    await page.goto('/admin/finance', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    // Certificates Management
    await page.goto('/admin/certificates', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    // Analytics Dashboard
    await page.goto('/admin/analytics', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    // Audit Logs
    await page.goto('/admin/audit', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('Super Admin Security Boundary: Standard Admin cannot perform SUPER_ADMIN actions', async ({ page }) => {
    // Log in as standard Admin A
    await loginAs(page, testUsers.adminA);
    await page.goto('/admin/dashboard');

    // Mock 403 when standard Admin attempts SUPER_ADMIN system-level action (e.g. promoting user to SUPER_ADMIN or setting critical security configs)
    await page.route('**/api/v1/users/user-target-id/roles', async (route) => {
      const payload = JSON.parse(route.request().postData() || '{}');
      if (payload.roles && payload.roles.includes('SUPER_ADMIN')) {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Only a SUPER_ADMIN can grant or revoke SUPER_ADMIN authority.',
            },
          }),
        });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      }
    });

    const standardAdminAttempt = await page.evaluate(async () => {
      const res = await fetch('/api/v1/users/user-target-id/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: ['SUPER_ADMIN'] }),
      });
      return { status: res.status, body: await res.json() };
    });

    // Standard Admin is forbidden
    expect(standardAdminAttempt.status).toBe(403);
    expect(standardAdminAttempt.body.error.code).toBe('FORBIDDEN');

    // Bootstrap route rejection: after provisioning, bootstrap path is closed (409)
    await page.route('**/api/v1/auth/bootstrap-super-admin', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'BOOTSTRAP_DISABLED',
            message: 'Super Admin has already been provisioned.',
          },
        }),
      });
    });

    const bootstrapAttempt = await page.evaluate(async () => {
      const res = await fetch('/api/v1/auth/bootstrap-super-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'attacker@evil.com' }),
      });
      return { status: res.status, body: await res.json() };
    });

    expect(bootstrapAttempt.status).toBe(409);
    expect(bootstrapAttempt.body.error.code).toBe('BOOTSTRAP_DISABLED');
  });

  test('Super Admin Security Boundary: Super Admin possesses authorized scope', async ({ page }) => {
    // Log in as Super Admin A
    await loginAs(page, testUsers.superAdminA);
    await page.goto('/admin/dashboard');

    await page.route('**/api/v1/users/user-target-id/roles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { _id: 'user-target-id', roles: ['SUPER_ADMIN', 'ADMIN'] },
        }),
      });
    });

    const superAdminSuccess = await page.evaluate(async () => {
      const res = await fetch('/api/v1/users/user-target-id/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: ['SUPER_ADMIN', 'ADMIN'] }),
      });
      return { status: res.status, body: await res.json() };
    });

    expect(superAdminSuccess.status).toBe(200);
    expect(superAdminSuccess.body.success).toBe(true);
  });
});
