import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for ETA Platform — PRD §104
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
        channel: 'chrome',
      },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
    env: {
      NEXT_PUBLIC_ENABLE_E2E_AUTH: 'true',
    },
  },
});
