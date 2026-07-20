import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, selectToCall } from '../gameStore';
import type { PlayerPublic } from '@bullet-poker/common';

const makePlayer = (seatIndex: 0 | 1, currentBet: number): PlayerPublic => ({
  id: `p${seatIndex}`,
  alias: `Player ${seatIndex}`,
  timeBank: 100,
  holeCards: null,
  currentBet,
  folded: false,
  isAllIn: false,
  isConnected: true,
  seatIndex,
});

beforeEach(() => {
  useGameStore.getState().reset();
});

describe('gameStore', () => {
  describe('setStreet', () => {
    it('advances the street and community cards', () => {
      useGameStore
        .getState()
        .setStreet('flop', [
          { rank: 'A', suit: 's' },
          { rank: 'K', suit: 'h' },
          { rank: 'Q', suit: 'd' },
        ]);

      const state = useGameStore.getState();
      expect(state.street).toBe('flop');
      expect(state.communityCards).toHaveLength(3);
    });

    it('resets the table-level currentBet to 0', () => {
      useGameStore.setState({ currentBet: 8 });
      useGameStore.getState().setStreet('turn', []);
      expect(useGameStore.getState().currentBet).toBe(0);
    });

    it('clears each player currentBet so stale bet chips do not linger into the new street', () => {
      // Both players had committed bets on the previous street (swept to the pot server-side).
      useGameStore.setState({
        players: [makePlayer(0, 6), makePlayer(1, 6)],
        currentBet: 6,
      });

      useGameStore.getState().setStreet('flop', []);

      const { players } = useGameStore.getState();
      expect(players[0]?.currentBet).toBe(0);
      expect(players[1]?.currentBet).toBe(0);
    });

    it('preserves other player fields when resetting currentBet', () => {
      useGameStore.setState({ players: [makePlayer(0, 5), null] });
      useGameStore.getState().setStreet('flop', []);

      const player = useGameStore.getState().players[0];
      expect(player?.id).toBe('p0');
      expect(player?.timeBank).toBe(100);
      expect(player?.currentBet).toBe(0);
      // Null seats stay null.
      expect(useGameStore.getState().players[1]).toBeNull();
    });

    it('makes selectToCall 0 for the acting player at the start of a new street', () => {
      useGameStore.setState({
        yourSeatIndex: 0,
        players: [makePlayer(0, 6), makePlayer(1, 6)],
        currentBet: 6,
      });

      useGameStore.getState().setStreet('flop', []);
      expect(selectToCall(useGameStore.getState())).toBe(0);
    });
  });
});
