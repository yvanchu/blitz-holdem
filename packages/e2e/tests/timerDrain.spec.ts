/**
 * Timer Drain E2E Tests
 *
 * Tests that the time bank drains correctly during active turns.
 */

import { test, expect } from '../fixtures/game.fixture';

test.describe('Timer Drain', () => {
  test('should show timer decreasing during active turn', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.readyButton.click();
    await player1.startButton.waitFor();
    await player1.startButton.click();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who has action
    const p1HasAction = await player1.isMyTurn();
    const activePlayer = p1HasAction ? player1 : player2;

    // Get initial time bank value
    const getTimerValue = async (): Promise<number> => {
      const text = await activePlayer.activeTimer.textContent();
      return parseInt(text?.replace('s', '') ?? '0');
    };

    const initialTime = await getTimerValue();
    expect(initialTime).toBeGreaterThan(0);

    // Wait 2 seconds
    await activePlayer.page.waitForTimeout(2000);

    // Time should have decreased
    const newTime = await getTimerValue();
    expect(newTime).toBeLessThan(initialTime);
    expect(initialTime - newTime).toBeGreaterThanOrEqual(1); // At least 1 second drained
  });

  test('should show active timer highlight', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.readyButton.click();
    await player1.startButton.waitFor();
    await player1.startButton.click();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who has action
    const p1HasAction = await player1.isMyTurn();
    const activePlayer = p1HasAction ? player1 : player2;

    // Active timer should have the active data attribute
    await expect(activePlayer.activeTimer).toBeVisible();
  });

  test('should stop draining when action is taken', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.readyButton.click();
    await player1.startButton.waitFor();
    await player1.startButton.click();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who has action
    const p1HasAction = await player1.isMyTurn();
    const activePlayer = p1HasAction ? player1 : player2;
    const waitingPlayer = p1HasAction ? player2 : player1;

    // Wait a moment
    await activePlayer.page.waitForTimeout(500);

    // Take action (call)
    await activePlayer.call();

    // Now the other player should have the active timer
    await waitingPlayer.waitForTurn();

    // The original active player's timer should no longer be active
    await expect(
      activePlayer.page.locator(
        '[data-testid="seat-bottom"] [data-testid="timer"][data-timer-active="true"]'
      )
    ).not.toBeVisible();
  });

  test('should show timer for both players', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.readyButton.click();
    await player1.startButton.waitFor();
    await player1.startButton.click();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Both players should see timers
    await expect(player1.timer.first()).toBeVisible();
    await expect(player2.timer.first()).toBeVisible();

    // Timer values should be around starting time (300s - blinds)
    const p1TimerText = await player1.page
      .locator('[data-testid="seat-bottom"] [data-testid="timer"]')
      .textContent();
    const p1Time = parseInt(p1TimerText?.replace('s', '') ?? '0');

    // Should be close to starting value minus any blinds posted
    expect(p1Time).toBeGreaterThan(290); // Started with 300, minus 1-2 for blinds
    expect(p1Time).toBeLessThanOrEqual(300);
  });

  test('should drain time at approximately 1 second per second', async ({ game }) => {
    const { player1, player2 } = game;

    // Start game
    await player2.readyButton.click();
    await player1.startButton.waitFor();
    await player1.startButton.click();
    await expect(player1.holeCards).toHaveCount(2, { timeout: 5000 });

    // Determine who has action
    const p1HasAction = await player1.isMyTurn();
    const activePlayer = p1HasAction ? player1 : player2;

    // Get timer element
    const getTimerValue = async (): Promise<number> => {
      const text = await activePlayer.activeTimer.textContent();
      return parseInt(text?.replace('s', '') ?? '0');
    };

    const startTime = await getTimerValue();
    const startRealTime = Date.now();

    // Wait 3 seconds
    await activePlayer.page.waitForTimeout(3000);

    const endTime = await getTimerValue();
    const elapsedRealTime = (Date.now() - startRealTime) / 1000;

    const drained = startTime - endTime;

    // Should have drained roughly the same as real time (with some tolerance)
    expect(drained).toBeGreaterThanOrEqual(elapsedRealTime - 1);
    expect(drained).toBeLessThanOrEqual(elapsedRealTime + 1);
  });
});
