import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Blitz Hold'em E2E tests.
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
  timeout: 30000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
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
      command: 'pnpm --filter @blitz-holdem/server dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      cwd: '../..',
    },
    {
      command: 'pnpm --filter @blitz-holdem/client dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      cwd: '../..',
    },
  ],
});
