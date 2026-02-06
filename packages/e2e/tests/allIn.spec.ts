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
    await player2.readyButton.click();
    await player1.startButton.waitFor();
    await player1.startButton.click();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who acts first
    const p1HasAction = await player1.isMyTurn();
    const firstPlayer = p1HasAction ? player1 : player2;
    const secondPlayer = p1HasAction ? player2 : player1;

    // First player goes all-in via raise
    await firstPlayer.raiseButton.click();
    
    // Set bet to max (all-in) using the All In preset button
    await firstPlayer.page.locator('button:has-text("All In")').click();
    await firstPlayer.confirmRaiseButton.click();

    // Second player calls (which will be all-in call)
    await secondPlayer.waitForTurn();
    await secondPlayer.callButton.click();

    // Should see all 5 community cards dealt (runout)
    await expect(player1.communityCards).toHaveCount(5, { timeout: 10000 });
    await expect(player2.communityCards).toHaveCount(5, { timeout: 5000 });

    // Result overlay should appear
    await expect(player1.resultOverlay).toBeVisible({ timeout: 10000 });
  });

  test('should display all-in badge on player seat', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.readyButton.click();
    await player1.startButton.waitFor();
    await player1.startButton.click();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who acts first
    const p1HasAction = await player1.isMyTurn();
    const firstPlayer = p1HasAction ? player1 : player2;

    // First player goes all-in
    await firstPlayer.raiseButton.click();
    await firstPlayer.page.locator('button:has-text("All In")').click();
    await firstPlayer.confirmRaiseButton.click();

    // Should see ALL IN badge on the player's seat
    await expect(firstPlayer.page.locator('text=ALL IN')).toBeVisible({ timeout: 5000 });
  });

  test('should end hand correctly when all-in is called', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.readyButton.click();
    await player1.startButton.waitFor();
    await player1.startButton.click();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who acts first
    const p1HasAction = await player1.isMyTurn();
    const firstPlayer = p1HasAction ? player1 : player2;
    const secondPlayer = p1HasAction ? player2 : player1;

    // First player goes all-in
    await firstPlayer.raiseButton.click();
    await firstPlayer.page.locator('button:has-text("All In")').click();
    await firstPlayer.confirmRaiseButton.click();

    // Second player calls
    await secondPlayer.waitForTurn();
    await secondPlayer.callButton.click();

    // Wait for result
    await expect(player1.resultOverlay).toBeVisible({ timeout: 15000 });

    // Result overlay should show winner announcement
    const resultText = await player1.resultOverlay.textContent();
    expect(resultText).toMatch(/Win|Lose/);
  });

  test('should handle partial all-in correctly', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.readyButton.click();
    await player1.startButton.waitFor();
    await player1.startButton.click();
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
    const flopFirstToAct = await player1.isMyTurn() ? player1 : player2;
    const flopSecondToAct = await player1.isMyTurn() ? player2 : player1;

    await flopFirstToAct.raiseButton.click();
    await flopFirstToAct.page.locator('button:has-text("All In")').click();
    await flopFirstToAct.confirmRaiseButton.click();

    // Other player calls
    await flopSecondToAct.waitForTurn();
    await flopSecondToAct.callButton.click();

    // Should deal remaining cards (turn and river)
    await expect(player1.communityCards).toHaveCount(5, { timeout: 10000 });
  });
});
