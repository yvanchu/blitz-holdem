import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, selectIsYourTurn } from '../gameStore';
import type { Card, HandResult } from '@bullet-poker/common';

// Reset store before each test
beforeEach(() => {
  useGameStore.getState().reset();
});

const CARDS: [Card, Card] = [
  { rank: 'A', suit: 's' },
  { rank: 'K', suit: 'h' },
];

const RESULT: HandResult = {
  winnerId: 'p1',
  winnerHandRank: 'Pair',
  potAwarded: 6,
  showdown: true,
};

describe('gameStore setResult', () => {
  it('clears activePlayerIndex when the hand ends so no seat keeps the "your turn" glow', () => {
    // Simulate mid-hand state where seat 0 was the last player to act.
    useGameStore.setState({
      yourSeatIndex: 0,
      isHandInProgress: true,
      activePlayerIndex: 0,
    });

    // A hand-end RESULT arrives (arrives after the last actor's turn, with no
    // intervening TURN(null) or STREET to reset the active seat).
    useGameStore
      .getState()
      .setResult(RESULT, { seat0: CARDS, seat1: null }, []);

    const state = useGameStore.getState();
    expect(state.activePlayerIndex).toBeNull();
    expect(state.isHandInProgress).toBe(false);
    // The my-turn indicator (UX §6) must not linger after the hand is over.
    expect(selectIsYourTurn(state)).toBe(false);
  });
});
