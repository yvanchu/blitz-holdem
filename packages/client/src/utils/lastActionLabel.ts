import type { ActionType } from '@bullet-poker/common';

/**
 * The most recent action taken in the current hand, used to render a live
 * "last action" indicator (e.g. "Opponent raised to 12s"). This is a
 * player-action indicator only — it never announces a street transition.
 */
export interface LastAction {
  seatIndex: 0 | 1;
  action: ActionType;
  /** The actor's total wager on the current street after the action (seconds). */
  totalBet: number;
  isAllIn: boolean;
}

/**
 * Build a short, human-readable label for the most recent action, from the
 * perspective of the viewer. Actions taken by the viewer read as "You …";
 * the opponent's actions use their alias (falling back to "Opponent").
 *
 * Returns null when there is nothing to show.
 */
export function formatLastAction(
  lastAction: LastAction | null,
  viewerSeatIndex: 0 | 1 | null,
  opponentAlias?: string | null
): string | null {
  if (!lastAction) return null;

  const isYou = viewerSeatIndex !== null && lastAction.seatIndex === viewerSeatIndex;
  const subject = isYou ? 'You' : opponentAlias?.trim() || 'Opponent';

  // An all-in is the maximal betting action; surface it as such regardless of
  // whether it arrived as a bet, raise, call, or a timeout ("all-in for zero").
  if (lastAction.isAllIn || lastAction.action === 'all-in') {
    return `${subject} went all-in`;
  }

  switch (lastAction.action) {
    case 'fold':
      return `${subject} folded`;
    case 'check':
      return `${subject} checked`;
    case 'call':
      return `${subject} called`;
    case 'bet':
      return `${subject} bet ${lastAction.totalBet}s`;
    case 'raise':
      return `${subject} raised to ${lastAction.totalBet}s`;
    default:
      return null;
  }
}
