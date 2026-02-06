/**
 * All-In E2E Tests
 *
 * Tests all-in scenarios and runout card dealing.
 */

import { test, expect } from '../fixtures/game.fixture';

test.describe('All-In Scenarios', () => {
  test('should show all 5 community cards after both players all-in', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.ready();
    await player1.startButton.waitFor();
    await player1.startGame();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who acts first
    const p1HasAction = await player1.isMyTurn();
    const firstPlayer = p1HasAction ? player1 : player2;
    const secondPlayer = p1HasAction ? player2 : player1;

    // First player goes all-in
    await firstPlayer.allIn();

    // Second player calls (which will be all-in call)
    await secondPlayer.waitForTurn();
    await secondPlayer.call();

    // Should see all 5 community cards dealt (runout)
    await expect(player1.communityCards).toHaveCount(5, { timeout: 10000 });
    await expect(player2.communityCards).toHaveCount(5, { timeout: 5000 });

    // Winner should see pot award indicator (e.g., "+Xs")
    await expect(player1.page.locator('text=/\\+\\d+s/')).toBeVisible({ timeout: 10000 });
  });

  test('should display all-in badge on player seat', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.ready();
    await player1.startButton.waitFor();
    await player1.startGame();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who acts first
    const p1HasAction = await player1.isMyTurn();
    const firstPlayer = p1HasAction ? player1 : player2;

    // First player goes all-in
    await firstPlayer.allIn();

    // Should see ALL IN badge on the player's seat
    await expect(firstPlayer.page.locator('text=ALL IN')).toBeVisible({ timeout: 5000 });
  });

  test('should end hand correctly when all-in is called', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.ready();
    await player1.startButton.waitFor();
    await player1.startGame();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who acts first
    const p1HasAction = await player1.isMyTurn();
    const firstPlayer = p1HasAction ? player1 : player2;
    const secondPlayer = p1HasAction ? player2 : player1;

    // First player goes all-in
    await firstPlayer.allIn();

    // Second player calls
    await secondPlayer.waitForTurn();
    await secondPlayer.call();

    // All 5 community cards should be dealt
    await expect(player1.communityCards).toHaveCount(5, { timeout: 15000 });

    // Winner should see pot award indicator (e.g., "+Xs")
    await expect(player1.page.locator('text=/\\+\\d+s/')).toBeVisible({ timeout: 5000 });
  });

  test('should handle partial all-in correctly', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.ready();
    await player1.startButton.waitFor();
    await player1.startGame();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Get to flop first with call-check
    const p1HasAction = await player1.isMyTurn();
    const dealer = p1HasAction ? player1 : player2;
    const bb = p1HasAction ? player2 : player1;

    await dealer.call();
    await bb.waitForTurn();
    await bb.check();

    // Wait for flop
    await expect(player1.communityCards).toHaveCount(3, { timeout: 5000 });

    // Now one player goes all-in on the flop
    const flopFirstToAct = (await player1.isMyTurn()) ? player1 : player2;
    const flopSecondToAct = (await player1.isMyTurn()) ? player2 : player1;

    await flopFirstToAct.allIn();

    // Other player calls
    await flopSecondToAct.waitForTurn();
    await flopSecondToAct.call();

    // Should deal remaining cards (turn and river)
    await expect(player1.communityCards).toHaveCount(5, { timeout: 10000 });
  });
});
