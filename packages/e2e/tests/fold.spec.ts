/**
 * Fold E2E Tests
 *
 * Tests folding and show cards functionality.
 */

import { test, expect } from '../fixtures/game.fixture';

test.describe('Fold and Show Cards', () => {
  test('should end hand when player folds', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.ready();
    await player1.startButton.waitFor();
    await player1.startGame();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who acts first
    const p1HasAction = await player1.isMyTurn();
    const foldingPlayer = p1HasAction ? player1 : player2;

    // Fold
    await foldingPlayer.fold();

    // Hand should end - "Show Cards" button appears for the folder
    await expect(foldingPlayer.showCardsButton).toBeVisible({ timeout: 5000 });
  });

  test('should show folded badge on player seat', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.ready();
    await player1.startButton.waitFor();
    await player1.startGame();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who acts first
    const p1HasAction = await player1.isMyTurn();
    const foldingPlayer = p1HasAction ? player1 : player2;
    const winningPlayer = p1HasAction ? player2 : player1;

    // Fold
    await foldingPlayer.fold();

    // FOLD badge should appear on the folded player's seat
    // (checking from winner's perspective to see opponent's fold)
    await expect(winningPlayer.page.locator('[data-testid="seat-top"] >> text=FOLD')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should show "Show Cards" button after folding', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.ready();
    await player1.startButton.waitFor();
    await player1.startGame();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who acts first
    const p1HasAction = await player1.isMyTurn();
    const foldingPlayer = p1HasAction ? player1 : player2;

    // Fold
    await foldingPlayer.fold();

    // The folded player should see "Show Cards" button
    await expect(foldingPlayer.showCardsButton).toBeVisible({ timeout: 5000 });
  });

  test('should reveal cards to opponent when clicking show cards', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.ready();
    await player1.startButton.waitFor();
    await player1.startGame();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who acts first
    const p1HasAction = await player1.isMyTurn();
    const foldingPlayer = p1HasAction ? player1 : player2;
    const winningPlayer = p1HasAction ? player2 : player1;

    // Fold
    await foldingPlayer.fold();

    // Wait for show cards button
    await foldingPlayer.showCardsButton.waitFor();

    // Click show cards
    await foldingPlayer.showCards();

    // Opponent should see the revealed cards (cards should have rank/suit data)
    // Check that the opponent's view of the folded player's cards are now visible
    await expect(async () => {
      // The opponent seat (top from winner's view) should show revealed cards
      const cards = winningPlayer.page.locator(
        '[data-testid="seat-top"] [data-testid="card"]:not([data-card-hidden="true"])'
      );
      await expect(cards).toHaveCount(2);
    }).toPass({ timeout: 5000 });
  });

  test('should award pot to non-folding player', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.ready();
    await player1.startButton.waitFor();
    await player1.startGame();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who acts first
    const p1HasAction = await player1.isMyTurn();
    const foldingPlayer = p1HasAction ? player1 : player2;
    const winningPlayer = p1HasAction ? player2 : player1;

    // Fold
    await foldingPlayer.fold();

    // Winner should see pot award indicator (e.g., "+3s")
    await expect(winningPlayer.page.locator('[data-testid="seat-bottom"]')).toContainText('+', {
      timeout: 5000,
    });
  });

  test('should allow fold after opponent raises', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.ready();
    await player1.startButton.waitFor();
    await player1.startGame();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who acts first
    const p1HasAction = await player1.isMyTurn();
    const raiser = p1HasAction ? player1 : player2;
    const folder = p1HasAction ? player2 : player1;

    // First player raises (using fixture method for desktop compatibility)
    await raiser.raise();

    // Second player folds
    await folder.waitForTurn();
    await folder.fold();

    // Hand should end - Show Cards button appears for folder
    await expect(folder.showCardsButton).toBeVisible({ timeout: 5000 });
  });
});
