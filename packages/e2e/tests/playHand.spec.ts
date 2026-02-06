/**
 * Play Hand E2E Tests
 *
 * Tests complete hand lifecycle from deal to showdown.
 */

import { test, expect } from '../fixtures/game.fixture';

test.describe('Play a Complete Hand', () => {
  test('should deal cards and show pot after game starts', async ({ game }) => {
    const { player1, player2 } = game;

    // Player 2 readies up
    await player2.readyButton.click();

    // Player 1 starts the game
    await player1.startButton.waitFor();
    await player1.startButton.click();

    // Both players should see their hole cards
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });
    await expect(player2.holeCards).toHaveCount(2, { timeout: 5000 });

    // Pot should show blinds (3s = SB + BB)
    await expect(player1.potValue).toContainText('3s');
    await expect(player2.potValue).toContainText('3s');
  });

  test('should allow preflop betting actions', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.readyButton.click();
    await player1.startButton.waitFor();
    await player1.startButton.click();

    // Wait for cards to be dealt
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // One player should have action (dealer acts first preflop in heads-up)
    // Try player1 first, then player2
    const p1HasAction = await player1.isMyTurn();
    const activePlayer = p1HasAction ? player1 : player2;
    const waitingPlayer = p1HasAction ? player2 : player1;

    // Call button should be enabled for the active player (preflop SB needs to call BB)
    await expect(activePlayer.callButton).toBeEnabled();

    // Waiting player's buttons should be disabled
    await expect(waitingPlayer.callButton).toBeDisabled();
  });

  test('should advance to flop after preflop completes', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.readyButton.click();
    await player1.startButton.waitFor();
    await player1.startButton.click();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who acts first
    const p1HasAction = await player1.isMyTurn();
    const firstToAct = p1HasAction ? player1 : player2;
    const secondToAct = p1HasAction ? player2 : player1;

    // Dealer calls
    await firstToAct.call();

    // BB checks
    await secondToAct.waitForTurn();
    await secondToAct.check();

    // Flop should appear (3 community cards)
    await expect(player1.communityCards).toHaveCount(3, { timeout: 5000 });
  });

  test('should complete a full hand through showdown', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.readyButton.click();
    await player1.startButton.waitFor();
    await player1.startButton.click();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Helper to play a street by check-check
    async function playStreetCheckCheck() {
      // Determine who has action
      const p1HasAction = await player1.isMyTurn();
      const first = p1HasAction ? player1 : player2;
      const second = p1HasAction ? player2 : player1;

      await first.check();
      await second.waitForTurn();
      await second.check();
    }

    // Preflop: call-check
    const p1HasAction = await player1.isMyTurn();
    const dealer = p1HasAction ? player1 : player2;
    const bb = p1HasAction ? player2 : player1;

    await dealer.call();
    await bb.waitForTurn();
    await bb.check();

    // Wait for flop
    await expect(player1.communityCards).toHaveCount(3, { timeout: 5000 });

    // Flop: check-check
    await playStreetCheckCheck();

    // Wait for turn
    await expect(player1.communityCards).toHaveCount(4, { timeout: 5000 });

    // Turn: check-check
    await playStreetCheckCheck();

    // Wait for river
    await expect(player1.communityCards).toHaveCount(5, { timeout: 5000 });

    // River: check-check
    await playStreetCheckCheck();

    // Should see result overlay (showdown)
    await expect(player1.resultOverlay).toBeVisible({ timeout: 5000 });
    await expect(player2.resultOverlay).toBeVisible({ timeout: 5000 });
  });

  test('should process raise action correctly', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.readyButton.click();
    await player1.startButton.waitFor();
    await player1.startButton.click();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who acts first
    const p1HasAction = await player1.isMyTurn();
    const activePlayer = p1HasAction ? player1 : player2;

    // Initial pot should be 3 (blinds)
    await expect(activePlayer.potValue).toContainText('3s');

    // Click raise to open the raise panel
    await activePlayer.raiseButton.click();

    // The raise panel should show bet input
    await expect(activePlayer.betInput).toBeVisible();

    // Confirm the raise (default minimum raise)
    await activePlayer.confirmRaiseButton.click();

    // Pot should increase
    // After minimum raise, pot should be higher than 3
    await expect(async () => {
      const potText = await activePlayer.potValue.textContent();
      const potValue = parseInt(potText?.replace('s', '') ?? '0');
      expect(potValue).toBeGreaterThan(3);
    }).toPass({ timeout: 5000 });
  });

  test('should update pot correctly after betting', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.readyButton.click();
    await player1.startButton.waitFor();
    await player1.startButton.click();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who acts first
    const p1HasAction = await player1.isMyTurn();
    const dealer = p1HasAction ? player1 : player2;
    const bb = p1HasAction ? player2 : player1;

    // Initial pot is 3 (1 SB + 2 BB)
    await expect(dealer.potValue).toContainText('3s');

    // Dealer calls (adds 1 to match BB)
    await dealer.call();

    // Pot should now be 4 (2 + 2)
    await expect(dealer.potValue).toContainText('4s', { timeout: 3000 });

    // BB checks
    await bb.waitForTurn();
    await bb.check();

    // After flop, pot remains 4
    await expect(player1.communityCards).toHaveCount(3, { timeout: 5000 });
    await expect(dealer.potValue).toContainText('4s');
  });
});
