import { describe, it, expect } from 'vitest';
import {
  formatCard,
  formatCards,
  formatHoleCards,
  formatHandHistory,
  formatHandHistoryStructured,
  SUIT_COLORS,
} from '../handHistoryFormatter';
import type { CompletedHand } from '../../store/handHistoryStore';
import type { Card } from '@bullet-poker/common';

describe('handHistoryFormatter', () => {
  describe('formatCard', () => {
    it('should format hearts with ♥ symbol', () => {
      expect(formatCard({ rank: 'A', suit: 'h' })).toBe('A♥');
      expect(formatCard({ rank: 'K', suit: 'h' })).toBe('K♥');
    });

    it('should format diamonds with ♦ symbol', () => {
      expect(formatCard({ rank: 'Q', suit: 'd' })).toBe('Q♦');
      expect(formatCard({ rank: '2', suit: 'd' })).toBe('2♦');
    });

    it('should format clubs with ♣ symbol', () => {
      expect(formatCard({ rank: 'J', suit: 'c' })).toBe('J♣');
      expect(formatCard({ rank: 'T', suit: 'c' })).toBe('T♣');
    });

    it('should format spades with ♠ symbol', () => {
      expect(formatCard({ rank: '9', suit: 's' })).toBe('9♠');
      expect(formatCard({ rank: '5', suit: 's' })).toBe('5♠');
    });

    it('should handle all ranks correctly', () => {
      const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
      ranks.forEach((rank) => {
        const result = formatCard({ rank, suit: 'h' });
        expect(result).toBe(`${rank}♥`);
      });
    });
  });

  describe('formatCards', () => {
    it('should format multiple cards with spaces', () => {
      const cards: Card[] = [
        { rank: 'A', suit: 's' },
        { rank: 'K', suit: 'h' },
        { rank: 'Q', suit: 'd' },
      ];
      expect(formatCards(cards)).toBe('A♠ K♥ Q♦');
    });

    it('should return empty string for empty array', () => {
      expect(formatCards([])).toBe('');
    });

    it('should handle single card', () => {
      expect(formatCards([{ rank: 'J', suit: 'c' }])).toBe('J♣');
    });

    it('should format a full board (5 cards)', () => {
      const board: Card[] = [
        { rank: 'A', suit: 's' },
        { rank: 'K', suit: 's' },
        { rank: 'Q', suit: 's' },
        { rank: 'J', suit: 's' },
        { rank: 'T', suit: 's' },
      ];
      expect(formatCards(board)).toBe('A♠ K♠ Q♠ J♠ T♠');
    });
  });

  describe('formatHoleCards', () => {
    it('should format hole cards with brackets', () => {
      const cards: [Card, Card] = [
        { rank: 'A', suit: 'h' },
        { rank: 'K', suit: 's' },
      ];
      expect(formatHoleCards(cards)).toBe('[A♥ K♠]');
    });

    it('should return placeholder for null cards', () => {
      expect(formatHoleCards(null)).toBe('[?? ??]');
    });

    it('should format pocket pairs correctly', () => {
      const cards: [Card, Card] = [
        { rank: 'A', suit: 'h' },
        { rank: 'A', suit: 's' },
      ];
      expect(formatHoleCards(cards)).toBe('[A♥ A♠]');
    });
  });

  describe('SUIT_COLORS', () => {
    it('should have correct Tailwind classes for each suit', () => {
      expect(SUIT_COLORS['h']).toBe('text-red-500');
      expect(SUIT_COLORS['d']).toBe('text-blue-500');
      expect(SUIT_COLORS['c']).toBe('text-green-600');
      expect(SUIT_COLORS['s']).toBe('text-zinc-800');
    });
  });

  describe('formatHandHistory', () => {
    // Helper to create a minimal completed hand for testing
    function createTestHand(overrides: Partial<CompletedHand> = {}): CompletedHand {
      return {
        handNumber: 1,
        timestamp: '2026-02-06T15:30:00.000Z',
        ohhData: {
          ohh: {
            spec_version: '1.4.6',
            internal_version: '1.4.6',
            network_name: 'Bullet Poker',
            site_name: 'Bullet Poker',
            game_type: 'Holdem',
            table_name: 'test-room',
            table_size: 2,
            game_number: '1',
            start_date_utc: '2026-02-06T15:30:00.000Z',
            currency: 'SEC',
            ante_amount: 0,
            small_blind_amount: 1,
            big_blind_amount: 2,
            bet_limit: { bet_cap: 0, bet_type: 'NL' },
            dealer_seat: 1,
            hero_player_id: 1,
            players: [
              { name: 'Hero', id: 1, starting_stack: 100, seat: 1 },
              { name: 'Villain', id: 2, starting_stack: 100, seat: 2 },
            ],
            rounds: [
              {
                id: 1,
                street: 'Preflop' as const,
                actions: [
                  { action_number: 1, player_id: 1, action: 'Post SB' as const, amount: 1 },
                  { action_number: 2, player_id: 2, action: 'Post BB' as const, amount: 2 },
                  { action_number: 3, player_id: 1, action: 'Raise' as const, amount: 6 },
                  { action_number: 4, player_id: 2, action: 'Fold' as const },
                ],
              },
            ],
            pots: [{ number: 1, amount: 8, player_wins: [{ player_id: 1, win_amount: 8 }] }],
          },
        },
        heroSeatIndex: 0,
        heroHoleCards: [
          { rank: 'A', suit: 'h' },
          { rank: 'K', suit: 's' },
        ],
        opponentHoleCards: null,
        communityCards: [],
        winnerId: 'hero-id',
        winnerHandRank: null,
        potAwarded: 8,
        ...overrides,
      };
    }

    it('should include hand number in header', () => {
      const hand = createTestHand({ handNumber: 5 });
      const result = formatHandHistory(hand);
      expect(result).toContain('BULLET POKER HAND #5');
    });

    it('should include room name and blinds', () => {
      const hand = createTestHand();
      const result = formatHandHistory(hand);
      expect(result).toContain('Room: test-room');
      expect(result).toContain('Blinds: 1/2 sec');
    });

    it('should show player info with positions', () => {
      const hand = createTestHand();
      const result = formatHandHistory(hand);
      expect(result).toContain('PLAYERS:');
      expect(result).toContain('Hero (Hero)');
      expect(result).toContain('BTN/SB');
      expect(result).toContain('BB');
    });

    it('should show hero hole cards', () => {
      const hand = createTestHand();
      const result = formatHandHistory(hand);
      expect(result).toContain('HOLE CARDS [Hero]: [A♥ K♠]');
    });

    it('should show preflop section', () => {
      const hand = createTestHand();
      const result = formatHandHistory(hand);
      expect(result).toContain('── PREFLOP ──');
    });

    it('should show blind posts', () => {
      const hand = createTestHand();
      const result = formatHandHistory(hand);
      expect(result).toContain('posts small blind 1 sec');
      expect(result).toContain('posts big blind 2 sec');
    });

    it('should show raises correctly', () => {
      const hand = createTestHand();
      const result = formatHandHistory(hand);
      expect(result).toContain('raises to 6 sec');
    });

    it('should show folds correctly', () => {
      const hand = createTestHand();
      const result = formatHandHistory(hand);
      expect(result).toContain('folds');
    });

    it('should mark all-in bets and calls with (all-in)', () => {
      const hand = createTestHand({
        communityCards: [
          { rank: 'A', suit: 's' },
          { rank: 'K', suit: 'd' },
          { rank: 'Q', suit: 'c' },
        ],
        ohhData: {
          ohh: {
            ...createTestHand().ohhData.ohh,
            rounds: [
              {
                id: 1,
                street: 'Preflop' as const,
                actions: [
                  { action_number: 1, player_id: 1, action: 'Post SB' as const, amount: 1 },
                  { action_number: 2, player_id: 2, action: 'Post BB' as const, amount: 2 },
                  { action_number: 3, player_id: 1, action: 'Call' as const, amount: 1 },
                  { action_number: 4, player_id: 2, action: 'Check' as const },
                ],
              },
              {
                id: 2,
                street: 'Flop' as const,
                actions: [
                  {
                    action_number: 5,
                    player_id: 2,
                    action: 'Bet' as const,
                    amount: 50,
                    is_allin: true,
                  },
                  {
                    action_number: 6,
                    player_id: 1,
                    action: 'Call' as const,
                    amount: 50,
                    is_allin: true,
                  },
                ],
              },
            ],
          },
        },
      });
      const result = formatHandHistory(hand);
      expect(result).toContain('Villain bets 50 sec (all-in)');
      expect(result).toContain('Hero calls 50 sec (all-in)');
      // A non-all-in call must not be marked
      expect(result).toContain('Hero calls 1 sec');
      expect(result).not.toContain('calls 1 sec (all-in)');
    });

    it('should show result section with winner', () => {
      const hand = createTestHand();
      const result = formatHandHistory(hand);
      expect(result).toContain('── RESULT ──');
      expect(result).toContain('Hero wins 8 sec');
      expect(result).toContain('Pot: 8 sec');
    });

    it('should show winning hand rank when available', () => {
      const hand = createTestHand({ winnerHandRank: 'Two Pair' });
      const result = formatHandHistory(hand);
      expect(result).toContain('wins 8 sec with Two Pair');
    });

    it('should show opponent cards when revealed', () => {
      const hand = createTestHand({
        opponentHoleCards: [
          { rank: 'Q', suit: 'd' },
          { rank: 'J', suit: 'c' },
        ],
      });
      const result = formatHandHistory(hand);
      expect(result).toContain('Villain shows [Q♦ J♣]');
    });

    it('should show community cards on flop', () => {
      const hand = createTestHand({
        communityCards: [
          { rank: 'A', suit: 's' },
          { rank: 'K', suit: 'd' },
          { rank: 'Q', suit: 'c' },
        ],
        ohhData: {
          ohh: {
            ...createTestHand().ohhData.ohh,
            rounds: [
              {
                id: 1,
                street: 'Preflop' as const,
                actions: [
                  { action_number: 1, player_id: 1, action: 'Post SB' as const, amount: 1 },
                  { action_number: 2, player_id: 2, action: 'Post BB' as const, amount: 2 },
                  { action_number: 3, player_id: 1, action: 'Call' as const, amount: 1 },
                  { action_number: 4, player_id: 2, action: 'Check' as const },
                ],
              },
              {
                id: 2,
                street: 'Flop' as const,
                cards: ['As', 'Kd', 'Qc'],
                actions: [
                  { action_number: 5, player_id: 2, action: 'Check' as const },
                  { action_number: 6, player_id: 1, action: 'Bet' as const, amount: 4 },
                  { action_number: 7, player_id: 2, action: 'Fold' as const },
                ],
              },
            ],
          },
        },
      });
      const result = formatHandHistory(hand);
      expect(result).toContain('── FLOP ──');
      expect(result).toContain('A♠ K♦ Q♣');
    });
  });

  describe('formatHandHistoryStructured', () => {
    function createTestHand(): CompletedHand {
      return {
        handNumber: 1,
        timestamp: '2026-02-06T15:30:00.000Z',
        ohhData: {
          ohh: {
            spec_version: '1.4.6',
            internal_version: '1.4.6',
            network_name: 'Bullet Poker',
            site_name: 'Bullet Poker',
            game_type: 'Holdem',
            table_name: 'test-room',
            table_size: 2,
            game_number: '1',
            start_date_utc: '2026-02-06T15:30:00.000Z',
            currency: 'SEC',
            ante_amount: 0,
            small_blind_amount: 1,
            big_blind_amount: 2,
            bet_limit: { bet_cap: 0, bet_type: 'NL' },
            dealer_seat: 1,
            hero_player_id: 1,
            players: [
              { name: 'Hero', id: 1, starting_stack: 100, seat: 1 },
              { name: 'Villain', id: 2, starting_stack: 100, seat: 2 },
            ],
            rounds: [
              {
                id: 1,
                street: 'Preflop' as const,
                actions: [
                  { action_number: 1, player_id: 1, action: 'Post SB' as const, amount: 1 },
                  { action_number: 2, player_id: 2, action: 'Post BB' as const, amount: 2 },
                  { action_number: 3, player_id: 1, action: 'Fold' as const },
                ],
              },
            ],
            pots: [{ number: 1, amount: 3, player_wins: [{ player_id: 2, win_amount: 3 }] }],
          },
        },
        heroSeatIndex: 0,
        heroHoleCards: [
          { rank: '7', suit: 'h' },
          { rank: '2', suit: 's' },
        ],
        opponentHoleCards: null,
        communityCards: [],
        winnerId: 'villain-id',
        winnerHandRank: null,
        potAwarded: 3,
      };
    }

    it('should return array of formatted lines', () => {
      const hand = createTestHand();
      const result = formatHandHistoryStructured(hand);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should have correct line types', () => {
      const hand = createTestHand();
      const result = formatHandHistoryStructured(hand);

      const types = result.map((line) => line.type);
      expect(types).toContain('divider');
      expect(types).toContain('header');
      expect(types).toContain('subheader');
      expect(types).toContain('section');
      expect(types).toContain('action');
      expect(types).toContain('result');
      expect(types).toContain('empty');
    });

    it('should include header with hand number', () => {
      const hand = createTestHand();
      const result = formatHandHistoryStructured(hand);
      const header = result.find((line) => line.type === 'header');
      expect(header?.text).toContain('HAND #1');
    });

    it('should highlight hero actions', () => {
      const hand = createTestHand();
      const result = formatHandHistoryStructured(hand);
      const heroActions = result.filter((line) => line.type === 'action' && line.highlight);
      expect(heroActions.length).toBeGreaterThan(0);
    });

    it('should mark all-in calls with (all-in) in structured output', () => {
      const base = createTestHand();
      const hand: CompletedHand = {
        ...base,
        ohhData: {
          ohh: {
            ...base.ohhData.ohh,
            rounds: [
              {
                id: 1,
                street: 'Preflop' as const,
                actions: [
                  { action_number: 1, player_id: 1, action: 'Post SB' as const, amount: 1 },
                  { action_number: 2, player_id: 2, action: 'Post BB' as const, amount: 2 },
                  {
                    action_number: 3,
                    player_id: 2,
                    action: 'Raise' as const,
                    amount: 100,
                    is_allin: true,
                  },
                  {
                    action_number: 4,
                    player_id: 1,
                    action: 'Call' as const,
                    amount: 99,
                    is_allin: true,
                  },
                ],
              },
            ],
          },
        },
      };
      const result = formatHandHistoryStructured(hand);
      const callLine = result.find(
        (line) => line.type === 'action' && line.text.includes('calls')
      );
      expect(callLine?.text).toBe('Hero calls 99 sec (all-in)');
    });

    it('should include cards in section lines when applicable', () => {
      const hand: CompletedHand = {
        ...createTestHand(),
        heroHoleCards: [
          { rank: 'A', suit: 'h' },
          { rank: 'K', suit: 's' },
        ],
      };
      const result = formatHandHistoryStructured(hand);
      const holeCardsSection = result.find(
        (line) => line.type === 'section' && line.text.includes('HOLE CARDS')
      );
      expect(holeCardsSection?.cards).toBeDefined();
      expect(holeCardsSection?.cards?.length).toBe(2);
    });

    it('should not highlight opponent winner', () => {
      const hand = createTestHand(); // Villain wins in this hand
      const result = formatHandHistoryStructured(hand);
      const winnerLine = result.find(
        (line) => line.type === 'result' && line.text.includes('wins')
      );
      // Villain wins, so hero actions should not be highlighted for winner
      expect(winnerLine?.text).toContain('Villain');
    });
  });

  describe('Split pot formatting', () => {
    function createSplitPotHand(): CompletedHand {
      return {
        handNumber: 1,
        timestamp: '2024-01-15T10:30:00.000Z',
        ohhData: {
          ohh: {
            spec_version: '1.4.6',
            internal_version: '1.4.6',
            network_name: 'Bullet Poker',
            site_name: 'Bullet Poker',
            game_type: 'Holdem',
            table_name: 'test-room',
            table_size: 2,
            game_number: '1',
            start_date_utc: '2024-01-15T10:30:00.000Z',
            currency: 'sec',
            ante_amount: 0,
            bet_limit: { bet_cap: 0, bet_type: 'NL' },
            hero_player_id: 1,
            small_blind_amount: 1,
            big_blind_amount: 2,
            dealer_seat: 1,
            players: [
              { id: 1, name: 'Hero', starting_stack: 50, seat: 1 },
              { id: 2, name: 'Villain', starting_stack: 50, seat: 2 },
            ],
            rounds: [],
            pots: [
              {
                number: 1,
                amount: 100,
                player_wins: [
                  { player_id: 1, win_amount: 50 },
                  { player_id: 2, win_amount: 50 },
                ],
              },
            ],
          },
        },
        heroSeatIndex: 0,
        heroHoleCards: [
          { rank: '5', suit: 'h' },
          { rank: '6', suit: 'h' },
        ],
        opponentHoleCards: [
          { rank: '8', suit: 'c' },
          { rank: '6', suit: 'c' },
        ],
        communityCards: [
          { rank: 'Q', suit: 'c' },
          { rank: '7', suit: 'd' },
          { rank: 'J', suit: 'd' },
          { rank: '7', suit: 'c' },
          { rank: 'J', suit: 'h' },
        ],
        winnerId: 'hero-id',
        winnerHandRank: 'Two Pair (split)',
        potAwarded: 50,
        isSplit: true,
        splitWinners: [
          { playerId: 'hero-id', amount: 50 },
          { playerId: 'villain-id', amount: 50 },
        ],
      };
    }

    it('should display split pot in plain text format', () => {
      const hand = createSplitPotHand();
      const result = formatHandHistory(hand);
      expect(result).toContain('Split pot!');
      expect(result).toContain('Both players have Two Pair');
      expect(result).toContain('Hero wins 50 sec');
    });

    it('should display split pot in structured format', () => {
      const hand = createSplitPotHand();
      const result = formatHandHistoryStructured(hand);
      const splitLine = result.find((line) => line.text.includes('Split pot!'));
      expect(splitLine).toBeDefined();
      expect(splitLine?.text).toContain('Both players have Two Pair');
    });

    it('should show total pot in split scenario', () => {
      const hand = createSplitPotHand();
      const result = formatHandHistory(hand);
      expect(result).toContain('Pot: 100 sec');
    });
  });
});
