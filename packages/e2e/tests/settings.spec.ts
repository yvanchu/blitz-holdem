/**
 * Settings E2E Tests
 *
 * Tests the settings modal functionality.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('Settings Modal', () => {
  let player1Context: BrowserContext;
  let player1Page: Page;

  test.beforeEach(async ({ browser }) => {
    player1Context = await browser.newContext();
    player1Page = await player1Context.newPage();

    // Create a room
    await player1Page.goto(BASE_URL);
    await player1Page.locator('[data-testid="alias-input"]').fill('Host');
    await player1Page.locator('[data-testid="create-table-button"]').click();
    await player1Page.waitForURL(/\/table\/.+/);
    await player1Page.locator('[data-testid="poker-table"]').waitFor();
  });

  test.afterEach(async () => {
    await player1Context.close();
  });

  test('should open settings modal when clicking settings button', async () => {
    await player1Page.locator('[data-testid="settings-button"]').click();
    await expect(player1Page.locator('[data-testid="settings-modal"]')).toBeVisible();
  });

  test('should close settings modal when clicking cancel', async () => {
    await player1Page.locator('[data-testid="settings-button"]').click();
    await expect(player1Page.locator('[data-testid="settings-modal"]')).toBeVisible();

    // Click Cancel button
    await player1Page.locator('button:has-text("Cancel")').click();

    await expect(player1Page.locator('[data-testid="settings-modal"]')).not.toBeVisible();
  });

  test('should close settings modal when clicking backdrop', async () => {
    await player1Page.locator('[data-testid="settings-button"]').click();
    await expect(player1Page.locator('[data-testid="settings-modal"]')).toBeVisible();

    // Click outside the modal (on the backdrop)
    await player1Page.locator('.fixed.inset-0').click({ position: { x: 10, y: 10 } });

    await expect(player1Page.locator('[data-testid="settings-modal"]')).not.toBeVisible();
  });

  test('should have default values in settings inputs', async () => {
    await player1Page.locator('[data-testid="settings-button"]').click();

    // Check default values (SB=1, BB=2, TimeBank=300)
    const smallBlindInput = player1Page.locator('[data-testid="settings-modal"] input').first();
    const bigBlindInput = player1Page.locator('[data-testid="settings-modal"] input').nth(1);
    const timeBankInput = player1Page.locator('[data-testid="settings-modal"] input').nth(2);

    await expect(smallBlindInput).toHaveValue('1');
    await expect(bigBlindInput).toHaveValue('2');
    await expect(timeBankInput).toHaveValue('300');
  });

  test('should save new settings', async ({ browser }) => {
    // Open settings
    await player1Page.locator('[data-testid="settings-button"]').click();

    // Change values
    const smallBlindInput = player1Page.locator('[data-testid="settings-modal"] input').first();
    const bigBlindInput = player1Page.locator('[data-testid="settings-modal"] input').nth(1);

    await smallBlindInput.fill('5');
    await bigBlindInput.fill('10');

    // Save
    await player1Page.locator('[data-testid="settings-save-button"]').click();

    // Modal should close
    await expect(player1Page.locator('[data-testid="settings-modal"]')).not.toBeVisible();

    // Create player 2 to join and verify settings
    const player2Context = await browser.newContext();
    const player2Page = await player2Context.newPage();

    await player2Page.goto(player1Page.url());
    await player2Page.locator('[data-testid="poker-table"]').waitFor();
    await player2Page.locator('[data-testid="ready-button"]').click();

    // Start game
    await player1Page.locator('[data-testid="start-game-button"]').waitFor();
    await player1Page.locator('[data-testid="start-game-button"]').click();

    // Pot should reflect new blinds (5 + 10 = 15)
    await expect(player1Page.locator('[data-testid="pot-value"]')).toContainText('15s', {
      timeout: 5000,
    });

    await player2Context.close();
  });

  test('should enforce minimum values', async () => {
    await player1Page.locator('[data-testid="settings-button"]').click();

    const smallBlindInput = player1Page.locator('[data-testid="settings-modal"] input').first();

    // Try to set SB to 0
    await smallBlindInput.fill('0');
    await player1Page.locator('[data-testid="settings-save-button"]').click();

    // Reopen to check the value was clamped
    await player1Page.locator('[data-testid="settings-button"]').click();
    await expect(smallBlindInput).toHaveValue('1');
  });

  test('should auto-adjust big blind when small blind increases', async () => {
    await player1Page.locator('[data-testid="settings-button"]').click();

    const smallBlindInput = player1Page.locator('[data-testid="settings-modal"] input').first();
    const bigBlindInput = player1Page.locator('[data-testid="settings-modal"] input').nth(1);

    // Set SB to 10 (higher than current BB of 2)
    await smallBlindInput.fill('10');

    // BB should auto-adjust to at least 10
    await expect(bigBlindInput).toHaveValue('20');
  });
});

test.describe('Settings Persistence', () => {
  test('should persist settings across page reload', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Create room
    await page.goto(BASE_URL);
    await page.locator('[data-testid="alias-input"]').fill('Host');
    await page.locator('[data-testid="create-table-button"]').click();
    await page.waitForURL(/\/table\/.+/);

    // Change settings
    await page.locator('[data-testid="settings-button"]').click();
    const smallBlindInput = page.locator('[data-testid="settings-modal"] input').first();
    const bigBlindInput = page.locator('[data-testid="settings-modal"] input').nth(1);
    await smallBlindInput.fill('3');
    await bigBlindInput.fill('6');
    await page.locator('[data-testid="settings-save-button"]').click();

    // Reload page
    await page.reload();
    await page.locator('[data-testid="poker-table"]').waitFor();

    // Check settings are preserved
    await page.locator('[data-testid="settings-button"]').click();
    await expect(smallBlindInput).toHaveValue('3');
    await expect(bigBlindInput).toHaveValue('6');

    await context.close();
  });
});
