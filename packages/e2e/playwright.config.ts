import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Bullet Poker E2E tests.
 *
 * Tests run against a local dev server with both client and server running.
 * The stack runs on dedicated ports (server 3401, client 5273) rather than the
 * normal dev ports (3001/5173) so the e2e run never collides with — or silently
 * reuses — an unrelated server a developer happens to have running locally.
 */
const SERVER_PORT = process.env.E2E_SERVER_PORT || '3401';
const CLIENT_PORT = process.env.E2E_CLIENT_PORT || '5273';
const BASE_URL = `http://localhost:${CLIENT_PORT}`;

// Publish the resolved base URL so the spec files (and any worker processes that
// inherit this environment) navigate to the same client port the webServer starts.
process.env.E2E_BASE_URL = process.env.E2E_BASE_URL || BASE_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Poker tests need sequential execution
  forbidOnly: !!process.env.CI,
  // This suite drives a real-time, timer-based game over WebSockets, so a test can
  // occasionally lose a setup race (e.g. asserting before Hand #1 has started). CI
  // already retried (2); give local runs a retry too so the pre-push hook self-heals
  // known timing flakes while a genuinely broken test still fails every attempt.
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for deterministic test execution
  reporter: 'html',
  timeout: 30000, // 30s per test

  use: {
    baseURL: BASE_URL,
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
      port: Number(SERVER_PORT),
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: '../..',
      env: { PORT: SERVER_PORT },
    },
    {
      command: 'pnpm --filter @bullet-poker/client dev',
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: '../..',
      env: {
        VITE_PORT: CLIENT_PORT,
        VITE_WS_URL: `ws://localhost:${SERVER_PORT}/ws`,
        VITE_PROXY_TARGET: `http://localhost:${SERVER_PORT}`,
      },
    },
  ],
});
