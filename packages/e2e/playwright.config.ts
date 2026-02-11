import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Bullet Poker E2E tests.
 *
 * Tests run against a local dev server with both client and server running.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Poker tests need sequential execution
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for deterministic test execution
  reporter: 'html',
  timeout: 30000, // 30s per test

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    // Reduce action timeout for faster failure detection
    actionTimeout: 5000,
    // Navigation timeout
    navigationTimeout: 10000,
  },

  // Fail early on first test failure in CI
  expect: {
    timeout: 5000, // Reduce default expect timeout from 5s
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run local dev server before starting tests */
  webServer: [
    {
      command: 'pnpm --filter @bullet-poker/server dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: '../..',
    },
    {
      command: 'pnpm --filter @bullet-poker/client dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: '../..',
    },
  ],
});
