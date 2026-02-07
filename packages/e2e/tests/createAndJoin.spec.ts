/**
 * Create and Join Room E2E Tests
 *
 * Tests the complete flow of creating a room and having another player join.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('Create and Join Room', () => {
  let player1Context: BrowserContext;
  let player2Context: BrowserContext;
  let player1Page: Page;
  let player2Page: Page;

  test.beforeEach(async ({ browser }) => {
    // Create two separate browser contexts (simulating two different users)
    player1Context = await browser.newContext();
    player2Context = await browser.newContext();
    player1Page = await player1Context.newPage();
    player2Page = await player2Context.newPage();
  });

  test.afterEach(async () => {
    await player1Context.close();
    await player2Context.close();
  });

  test('should create a room from home page', async () => {
    await player1Page.goto(BASE_URL);

    // Fill in alias
    await player1Page.locator('[data-testid="alias-input"]').fill('TestPlayer1');

    // Click create table
    await player1Page.locator('[data-testid="create-table-button"]').click();

    // Should navigate to table page
    await player1Page.waitForURL(/\/table\/.+/);

    // Should see the poker table
    await expect(player1Page.locator('[data-testid="poker-table"]')).toBeVisible();

    // Should see the copy link button (waiting for opponent)
    await expect(player1Page.locator('[data-testid="copy-link-button"]')).toBeVisible();
  });

  test('should allow second player to join via room link', async () => {
    // Player 1 creates room
    await player1Page.goto(BASE_URL);
    await player1Page.locator('[data-testid="alias-input"]').fill('Host');
    await player1Page.locator('[data-testid="create-table-button"]').click();
    await player1Page.waitForURL(/\/table\/.+/);

    // Get the room URL
    const roomUrl = player1Page.url();

    // Player 2 joins using the same URL
    await player2Page.goto(roomUrl);

    // Player 2 should see the poker table
    await expect(player2Page.locator('[data-testid="poker-table"]')).toBeVisible();

    // Player 2 should see the ready button (in setup mode)
    await expect(player2Page.locator('[data-testid="ready-button"]')).toBeVisible();
  });

  test('should show opponent seat when second player clicks ready', async () => {
    // Setup: create room and join
    await player1Page.goto(BASE_URL);
    await player1Page.locator('[data-testid="alias-input"]').fill('Host');
    await player1Page.locator('[data-testid="create-table-button"]').click();
    await player1Page.waitForURL(/\/table\/.+/);
    const roomUrl = player1Page.url();

    await player2Page.goto(roomUrl);
    await player2Page.locator('[data-testid="poker-table"]').waitFor();

    // Player 2 clicks ready
    await player2Page.locator('[data-testid="ready-button"]').click();

    // Player 1 should now see the start game button
    // Use 10s timeout to account for WebSocket message propagation under load
    await expect(player1Page.locator('[data-testid="start-game-button"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should start game when host clicks start', async () => {
    // Setup: create room and join
    await player1Page.goto(BASE_URL);
    await player1Page.locator('[data-testid="alias-input"]').fill('Host');
    await player1Page.locator('[data-testid="create-table-button"]').click();
    await player1Page.waitForURL(/\/table\/.+/);
    const roomUrl = player1Page.url();

    await player2Page.goto(roomUrl);
    await player2Page.locator('[data-testid="poker-table"]').waitFor();

    // Player 2 clicks ready
    await player2Page.locator('[data-testid="ready-button"]').click();

    // Wait for start button to appear
    await player1Page.locator('[data-testid="start-game-button"]').waitFor();

    // Player 1 starts the game
    await player1Page.locator('[data-testid="start-game-button"]').click();

    // Both players should see hole cards (scoped to their own seat)
    await expect(
      player1Page.locator('[data-testid="seat-bottom"] [data-testid="hole-cards"] [data-testid="card"]')
    ).toHaveCount(2, {
      timeout: 5000,
    });
    await expect(
      player2Page.locator('[data-testid="seat-bottom"] [data-testid="hole-cards"] [data-testid="card"]')
    ).toHaveCount(2, {
      timeout: 5000,
    });

    // Community cards area should be visible (with placeholders)
    await expect(player1Page.locator('[data-testid="community-cards"]')).toBeVisible();

    // Pot should show initial blinds (3s = 1 SB + 2 BB)
    await expect(player1Page.locator('[data-testid="pot-value"]')).toContainText('3s');
  });

  test('should preserve player alias through game flow', async () => {
    // Player 1 with custom alias
    await player1Page.goto(BASE_URL);
    await player1Page.locator('[data-testid="alias-input"]').fill('PokerPro');
    await player1Page.locator('[data-testid="create-table-button"]').click();
    await player1Page.waitForURL(/\/table\/.+/);
    const roomUrl = player1Page.url();

    // Player 2 joins and enters alias in the seat input
    await player2Page.goto(roomUrl);
    await player2Page.locator('[data-testid="poker-table"]').waitFor();

    // The joiner enters their alias in the input field within the seat
    const aliasInput = player2Page.locator('input[placeholder="Player"]');
    await aliasInput.fill('RiverRat');
    await player2Page.locator('[data-testid="ready-button"]').click();

    // Start game
    await player1Page.locator('[data-testid="start-game-button"]').waitFor();
    await player1Page.locator('[data-testid="start-game-button"]').click();

    // Both players should see their own alias in their seat
    // Player info should contain the alias
    await expect(
      player1Page.locator('[data-testid="seat-bottom"] [data-testid="player-info"]')
    ).toContainText('PokerPro');
    await expect(
      player2Page.locator('[data-testid="seat-bottom"] [data-testid="player-info"]')
    ).toContainText('RiverRat');
  });

  test('should copy invite link to clipboard', async () => {
    await player1Page.goto(BASE_URL);
    await player1Page.locator('[data-testid="alias-input"]').fill('Host');
    await player1Page.locator('[data-testid="create-table-button"]').click();
    await player1Page.waitForURL(/\/table\/.+/);

    // Grant clipboard permission
    await player1Context.grantPermissions(['clipboard-write', 'clipboard-read']);

    // Click copy link button
    await player1Page.locator('[data-testid="copy-link-button"]').click();

    // Read from clipboard
    const clipboardContent = await player1Page.evaluate(() => navigator.clipboard.readText());

    // Should contain the room URL
    expect(clipboardContent).toContain('/table/');
    expect(clipboardContent).toBe(player1Page.url());
  });
});
