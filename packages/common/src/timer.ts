// ─────────────────────────────────────────────────────────────
// Timer Utilities
// ─────────────────────────────────────────────────────────────

import type { Player } from './types';

/**
 * Drain time from a player's bank.
 * @param player The player
 * @param elapsedMs Elapsed time in milliseconds
 * @returns Updated player with reduced time bank
 */
export function drainTime(player: Player, elapsedMs: number): Player {
  const elapsedSeconds = elapsedMs / 1000;
  // Round to avoid floating point precision issues
  const newTimeBank = Math.max(0, Math.round((player.timeBank - elapsedSeconds) * 100) / 100);
  return {
    ...player,
    timeBank: newTimeBank,
  };
}

/**
 * Check if a player has timed out (time bank <= 0).
 */
export function isTimeout(player: Player): boolean {
  return player.timeBank <= 0;
}

/**
 * Deduct seconds from a player's bank (for bets/calls).
 * @param player The player
 * @param seconds Seconds to commit
 * @returns Updated player
 */
export function commitSeconds(player: Player, seconds: number): Player {
  // Round values to avoid floating point issues
  const roundedSeconds = Math.round(seconds);
  if (roundedSeconds > Math.round(player.timeBank)) {
    throw new Error(`Insufficient time bank: ${player.timeBank}s < ${roundedSeconds}s`);
  }
  return {
    ...player,
    timeBank: Math.round(player.timeBank - roundedSeconds),
    currentBet: Math.round(player.currentBet + roundedSeconds),
  };
}

/**
 * Award pot seconds to a player.
 */
export function awardPot(player: Player, potSeconds: number): Player {
  return {
    ...player,
    timeBank: Math.round(player.timeBank + potSeconds),
  };
}

/**
 * Check if a player can afford a bet.
 */
export function canAfford(player: Player, seconds: number): boolean {
  return player.timeBank >= seconds;
}
