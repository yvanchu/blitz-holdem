/**
 * Reconnection E2E Tests
 *
 * Tests browser refresh and reconnection scenarios.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('Reconnection', () => {
  let player1Context: BrowserContext;
  let player2Context: BrowserContext;
  let player1Page: Page;
  let player2Page: Page;

  test.beforeEach(async ({ browser }) => {
    player1Context = await browser.newContext();
    player2Context = await browser.newContext();
    player1Page = await player1Context.newPage();
    player2Page = await player2Context.newPage();
  });

  test.afterEach(async () => {
    await player1Context.close();
    await player2Context.close();
  });

  test('should restore game state after page refresh', async () => {
    // Create and start a game
    await player1Page.goto(BASE_URL);
    await player1Page.locator('[data-testid="alias-input"]').fill('Host');
    await player1Page.locator('[data-testid="create-table-button"]').click();
    await player1Page.waitForURL(/\/table\/.+/);
    const roomUrl = player1Page.url();

    await player2Page.goto(roomUrl);
    await player2Page.locator('[data-testid="poker-table"]').waitFor();
    await player2Page.locator('[data-testid="ready-button"]').click();

    await player1Page.locator('[data-testid="start-game-button"]').waitFor();
    await player1Page.locator('[data-testid="start-game-button"]').click();

    // Wait for cards to be dealt (scoped to player's own seat)
    await expect(
      player1Page.locator('[data-testid="seat-bottom"] [data-testid="hole-cards"] [data-testid="card"]')
    ).toHaveCount(2, { timeout: 5000 });

    // Get current pot value
    const potBefore = await player1Page.locator('[data-testid="pot-value"]').textContent();

    // Player 1 refreshes
    await player1Page.reload();

    // Wait for reconnection
    await expect(player1Page.locator('[data-testid="poker-table"]')).toBeVisible({
      timeout: 10000,
    });

    // Cards should be visible again (scoped to player's own seat)
    await expect(
      player1Page.locator('[data-testid="seat-bottom"] [data-testid="hole-cards"] [data-testid="card"]')
    ).toHaveCount(2, { timeout: 5000 });

    // Pot should be preserved
    const potAfter = await player1Page.locator('[data-testid="pot-value"]').textContent();
    expect(potAfter).toBe(potBefore);
  });

  test('should show disconnection indicator to opponent', async () => {
    // Create and start a game
    await player1Page.goto(BASE_URL);
    await player1Page.locator('[data-testid="alias-input"]').fill('Host');
    await player1Page.locator('[data-testid="create-table-button"]').click();
    await player1Page.waitForURL(/\/table\/.+/);
    const roomUrl = player1Page.url();

    await player2Page.goto(roomUrl);
    await player2Page.locator('[data-testid="poker-table"]').waitFor();
    await player2Page.locator('[data-testid="ready-button"]').click();

    await player1Page.locator('[data-testid="start-game-button"]').waitFor();
    await player1Page.locator('[data-testid="start-game-button"]').click();

    await expect(
      player1Page.locator('[data-testid="seat-bottom"] [data-testid="hole-cards"] [data-testid="card"]')
    ).toHaveCount(2, { timeout: 5000 });

    // Close player 2's connection (simulate disconnect)
    await player2Page.close();

    // Player 1 should see "AWAY" indicator on opponent seat
    await expect(player1Page.locator('[data-testid="seat-top"] >> text=AWAY')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should allow game to continue after reconnection', async () => {
    // Create and start a game
    await player1Page.goto(BASE_URL);
    await player1Page.locator('[data-testid="alias-input"]').fill('Host');
    await player1Page.locator('[data-testid="create-table-button"]').click();
    await player1Page.waitForURL(/\/table\/.+/);
    const roomUrl = player1Page.url();

    await player2Page.goto(roomUrl);
    await player2Page.locator('[data-testid="poker-table"]').waitFor();
    await player2Page.locator('[data-testid="ready-button"]').click();

    await player1Page.locator('[data-testid="start-game-button"]').waitFor();
    await player1Page.locator('[data-testid="start-game-button"]').click();

    await expect(
      player1Page.locator('[data-testid="seat-bottom"] [data-testid="hole-cards"] [data-testid="card"]')
    ).toHaveCount(2, { timeout: 5000 });

    // Determine who has action
    const p1FoldEnabled = await player1Page.locator('[data-testid="fold-button"]').isEnabled();
    const activePlayer = p1FoldEnabled ? player1Page : player2Page;
    const waitingPlayer = p1FoldEnabled ? player2Page : player1Page;

    // Take first action
    await activePlayer.locator('[data-testid="call-button"]').click();

    // Waiting player refreshes
    await waitingPlayer.reload();

    // Wait for reconnection
    await expect(waitingPlayer.locator('[data-testid="poker-table"]')).toBeVisible({
      timeout: 10000,
    });

    // Waiting player should now have action (BB to check)
    await expect(waitingPlayer.locator('[data-testid="check-button"]')).toBeEnabled({
      timeout: 5000,
    });

    // Can complete the action
    await waitingPlayer.locator('[data-testid="check-button"]').click();

    // Flop should appear
    await expect(
      player1Page.locator('[data-testid="community-cards"] [data-testid="card"]')
    ).toHaveCount(3, { timeout: 5000 });
  });

  test('should preserve community cards after refresh', async () => {
    // Create and start a game
    await player1Page.goto(BASE_URL);
    await player1Page.locator('[data-testid="alias-input"]').fill('Host');
    await player1Page.locator('[data-testid="create-table-button"]').click();
    await player1Page.waitForURL(/\/table\/.+/);
    const roomUrl = player1Page.url();

    await player2Page.goto(roomUrl);
    await player2Page.locator('[data-testid="poker-table"]').waitFor();
    await player2Page.locator('[data-testid="ready-button"]').click();

    await player1Page.locator('[data-testid="start-game-button"]').waitFor();
    await player1Page.locator('[data-testid="start-game-button"]').click();

    await expect(
      player1Page.locator('[data-testid="seat-bottom"] [data-testid="hole-cards"] [data-testid="card"]')
    ).toHaveCount(2, { timeout: 5000 });

    // Play to flop
    const p1FoldEnabled = await player1Page.locator('[data-testid="fold-button"]').isEnabled();
    const dealer = p1FoldEnabled ? player1Page : player2Page;
    const bb = p1FoldEnabled ? player2Page : player1Page;

    await dealer.locator('[data-testid="call-button"]').click();
    await bb.locator('[data-testid="check-button"]').click();

    // Wait for flop
    await expect(
      player1Page.locator('[data-testid="community-cards"] [data-testid="card"]')
    ).toHaveCount(3, { timeout: 5000 });

    // Get the flop cards' data attributes
    const getCardData = async (page: Page) => {
      const cards = page.locator('[data-testid="community-cards"] [data-testid="card"]');
      const cardData: string[] = [];
      for (let i = 0; i < 3; i++) {
        const card = cards.nth(i);
        const rank = await card.getAttribute('data-card-rank');
        const suit = await card.getAttribute('data-card-suit');
        cardData.push(`${rank}${suit}`);
      }
      return cardData;
    };

    const flopBefore = await getCardData(player1Page);

    // Refresh
    await player1Page.reload();
    await expect(player1Page.locator('[data-testid="poker-table"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(
      player1Page.locator('[data-testid="community-cards"] [data-testid="card"]')
    ).toHaveCount(3, { timeout: 5000 });

    const flopAfter = await getCardData(player1Page);

    // Flop cards should be the same
    expect(flopAfter).toEqual(flopBefore);
  });
});
