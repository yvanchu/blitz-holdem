import { describe, it, expect } from 'vitest';
import { drainTime, commitSeconds, awardPot, canAfford, isTimeout } from '../timer';
import type { Player } from '../types';

// Helper to create a test player
function createPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'test-player',
    alias: 'Test',
    timeBank: 100,
    holeCards: null,
    currentBet: 0,
    folded: false,
    isAllIn: false,
    isConnected: true,
    seatIndex: 0,
    hasActedThisStreet: false,
    ...overrides,
  };
}

describe('Timer utilities', () => {
  describe('drainTime', () => {
    it('should drain time correctly', () => {
      const player = createPlayer({ timeBank: 100 });
      const result = drainTime(player, 1000); // 1 second
      expect(result.timeBank).toBe(99);
    });

    it('should not go below zero', () => {
      const player = createPlayer({ timeBank: 0.5 });
      const result = drainTime(player, 1000); // 1 second
      expect(result.timeBank).toBe(0);
    });

    it('should avoid floating point precision issues', () => {
      // Simulate many small drains that could cause floating point issues
      let player = createPlayer({ timeBank: 100 });

      // Drain 166ms 600 times (100 seconds total)
      for (let i = 0; i < 600; i++) {
        player = drainTime(player, 166.666666);
      }

      // Result should be a clean number, not something like 0.00000000001
      expect(player.timeBank).toBe(0);
    });

    it('should round to avoid precision issues with small values', () => {
      const player = createPlayer({ timeBank: 10 });
      const result = drainTime(player, 333); // 0.333 seconds

      // Should be rounded, not 9.667000000000001
      expect(Number.isInteger(result.timeBank * 100)).toBe(true);
    });
  });

  describe('commitSeconds', () => {
    it('should commit seconds and update currentBet', () => {
      const player = createPlayer({ timeBank: 100, currentBet: 0 });
      const result = commitSeconds(player, 10);

      expect(result.timeBank).toBe(90);
      expect(result.currentBet).toBe(10);
    });

    it('should return integer values', () => {
      const player = createPlayer({ timeBank: 100, currentBet: 5 });
      const result = commitSeconds(player, 15);

      expect(Number.isInteger(result.timeBank)).toBe(true);
      expect(Number.isInteger(result.currentBet)).toBe(true);
    });

    it('should throw if insufficient time bank', () => {
      const player = createPlayer({ timeBank: 10 });
      expect(() => commitSeconds(player, 20)).toThrow('Insufficient time bank');
    });

    it('should handle exact amount (all-in)', () => {
      const player = createPlayer({ timeBank: 50, currentBet: 0 });
      const result = commitSeconds(player, 50);

      expect(result.timeBank).toBe(0);
      expect(result.currentBet).toBe(50);
    });
  });

  describe('awardPot', () => {
    it('should add pot to time bank', () => {
      const player = createPlayer({ timeBank: 50 });
      const result = awardPot(player, 100);

      expect(result.timeBank).toBe(150);
    });

    it('should return integer value', () => {
      const player = createPlayer({ timeBank: 50 });
      const result = awardPot(player, 33);

      expect(Number.isInteger(result.timeBank)).toBe(true);
    });

    it('should handle large pots without floating point issues', () => {
      const player = createPlayer({ timeBank: 0 });
      const result = awardPot(player, 558.97599999999997);

      expect(result.timeBank).toBe(559); // Should round
    });
  });

  describe('canAfford', () => {
    it('should return true if player can afford', () => {
      const player = createPlayer({ timeBank: 100 });
      expect(canAfford(player, 50)).toBe(true);
    });

    it('should return true for exact amount', () => {
      const player = createPlayer({ timeBank: 100 });
      expect(canAfford(player, 100)).toBe(true);
    });

    it('should return false if cannot afford', () => {
      const player = createPlayer({ timeBank: 100 });
      expect(canAfford(player, 150)).toBe(false);
    });
  });

  describe('isTimeout', () => {
    it('should return true when timeBank is 0', () => {
      const player = createPlayer({ timeBank: 0 });
      expect(isTimeout(player)).toBe(true);
    });

    it('should return true when timeBank is negative', () => {
      const player = createPlayer({ timeBank: -1 });
      expect(isTimeout(player)).toBe(true);
    });

    it('should return false when timeBank is positive', () => {
      const player = createPlayer({ timeBank: 1 });
      expect(isTimeout(player)).toBe(false);
    });
  });
});
