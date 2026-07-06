import type { ActionType } from '@bullet-poker/common';

/**
 * The last action taken by a seat, ready for display as an on-table indicator.
 * `label` is the human-readable summary (e.g. "Raised to 12s"); `seatIndex`
 * identifies which seat performed it.
 */
export interface LastAction {
  seatIndex: 0 | 1;
  label: string;
}

/**
 * Format a player's most recent action into a short status label for the
 * last-action indicator (UX §6 State Communication).
 *
 * @param action The action type that was taken.
 * @param currentBet The player's total committed bet on the current street
 *   (used to phrase bets/raises as an absolute "to Xs" amount).
 * @param isAllIn Whether the player is now all-in (takes precedence — an all-in
 *   raise still reads as "All-in").
 */
export function formatLastActionLabel(
  action: ActionType,
  currentBet: number,
  isAllIn: boolean
): string {
  if (isAllIn || action === 'all-in') return 'All-in';

  const amount = Math.round(currentBet);

  switch (action) {
    case 'fold':
      return 'Folded';
    case 'check':
      return 'Checked';
    case 'call':
      return 'Called';
    case 'bet':
      return `Bet ${amount}s`;
    case 'raise':
      return `Raised to ${amount}s`;
    default:
      return '';
  }
}
