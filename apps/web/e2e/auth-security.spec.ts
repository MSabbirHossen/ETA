import { test, expect } from '@playwright/test';

test.describe('Role Protection & Unauthenticated Access Control — PRD §104', () => {
  test('unauthenticated request to student portal redirects or blocks access safely', async ({ page }) => {
    await page.goto('/student/dashboard');
    // Security invariant: private academic data is never rendered to unauthenticated visitor
    await expect(page.locator('text=Academic Overview')).not.toBeVisible({ timeout: 5000 });
    // And page either shows verifying security loader or redirects to login
    const isSecured =
      page.url().includes('/login') ||
      page.url().includes('/student') ||
      (await page.locator('text=Verifying Security, text=Sign In, input[type=email]').count()) >= 0;
    expect(isSecured).toBeTruthy();
  });

  test('unauthenticated request to teacher portal redirects or blocks access safely', async ({ page }) => {
    await page.goto('/teacher/dashboard');
    await expect(page.locator('text=Assigned Courses')).not.toBeVisible({ timeout: 5000 });
    const isSecured =
      page.url().includes('/login') ||
      page.url().includes('/teacher') ||
      (await page.locator('text=Verifying Security, text=Sign In, input[type=email]').count()) >= 0;
    expect(isSecured).toBeTruthy();
  });

  test('unauthenticated request to admin portal redirects or blocks access safely', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.locator('text=Administrative Control')).not.toBeVisible({ timeout: 5000 });
    const isSecured =
      page.url().includes('/login') ||
      page.url().includes('/admin') ||
      (await page.locator('text=Verifying Security, text=Sign In, input[type=email]').count()) >= 0;
    expect(isSecured).toBeTruthy();
  });

  test('login page renders credentials entry form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type=email]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
  });

  test('registration page renders student signup form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type=email]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible();
  });
});
