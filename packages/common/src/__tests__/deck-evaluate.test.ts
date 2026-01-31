import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, dealCards } from '../deck';
import { evaluateHand, compareHands } from '../evaluate';
import type { Card } from '../types';

describe('Deck utilities', () => {
  describe('createDeck', () => {
    it('should create a standard 52-card deck', () => {
      const deck = createDeck();
      expect(deck.length).toBe(52);
    });

    it('should have 13 cards of each suit', () => {
      const deck = createDeck();
      const suits = ['h', 'd', 'c', 's']; // hearts, diamonds, clubs, spades

      for (const suit of suits) {
        const suitCards = deck.filter((c) => c.suit === suit);
        expect(suitCards.length).toBe(13);
      }
    });

    it('should have 4 cards of each rank', () => {
      const deck = createDeck();
      const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

      for (const rank of ranks) {
        const rankCards = deck.filter((c) => c.rank === rank);
        expect(rankCards.length).toBe(4);
      }
    });
  });

  describe('shuffle', () => {
    it('should return same number of cards', () => {
      const deck = createDeck();
      const shuffled = shuffle(deck);
      expect(shuffled.length).toBe(52);
    });

    it('should not modify original deck', () => {
      const deck = createDeck();
      const original = [...deck];
      shuffle(deck);
      expect(deck).toEqual(original);
    });
  });

  describe('dealCards', () => {
    it('should deal correct number of cards', () => {
      const deck = createDeck();
      const [cards, remaining] = dealCards(deck, 2);

      expect(cards.length).toBe(2);
      expect(remaining.length).toBe(50);
    });

    it('should remove dealt cards from deck', () => {
      const deck = createDeck();
      const [cards, remaining] = dealCards(deck, 5);

      for (const card of cards) {
        const found = remaining.find((c) => c.rank === card.rank && c.suit === card.suit);
        expect(found).toBeUndefined();
      }
    });
  });
});

describe('Hand evaluation', () => {
  // Helper to create cards (using short suit names: h, d, c, s)
  const card = (rank: string, suit: string): Card => ({
    rank: rank as Card['rank'],
    suit: suit as Card['suit'],
  });

  describe('evaluateHand', () => {
    it('should identify a royal flush', () => {
      const cards = [
        card('A', 's'),
        card('K', 's'),
        card('Q', 's'),
        card('J', 's'),
        card('T', 's'),
        card('2', 'h'),
        card('3', 'd'),
      ];

      const result = evaluateHand(cards);
      expect(result.rankName).toBe('Royal Flush');
    });

    it('should identify a straight flush', () => {
      const cards = [
        card('9', 'h'),
        card('8', 'h'),
        card('7', 'h'),
        card('6', 'h'),
        card('5', 'h'),
        card('2', 'c'),
        card('3', 'd'),
      ];

      const result = evaluateHand(cards);
      expect(result.rankName).toBe('Straight Flush');
    });

    it('should identify four of a kind', () => {
      const cards = [
        card('A', 's'),
        card('A', 'h'),
        card('A', 'd'),
        card('A', 'c'),
        card('K', 's'),
        card('2', 'h'),
        card('3', 'd'),
      ];

      const result = evaluateHand(cards);
      expect(result.rankName).toBe('Four of a Kind');
    });

    it('should identify a full house', () => {
      const cards = [
        card('K', 's'),
        card('K', 'h'),
        card('K', 'd'),
        card('Q', 'c'),
        card('Q', 's'),
        card('2', 'h'),
        card('3', 'd'),
      ];

      const result = evaluateHand(cards);
      expect(result.rankName).toBe('Full House');
    });

    it('should identify a flush', () => {
      const cards = [
        card('A', 'h'),
        card('J', 'h'),
        card('8', 'h'),
        card('6', 'h'),
        card('3', 'h'),
        card('2', 'c'),
        card('K', 'd'),
      ];

      const result = evaluateHand(cards);
      expect(result.rankName).toBe('Flush');
    });

    it('should identify a straight', () => {
      const cards = [
        card('9', 's'),
        card('8', 'h'),
        card('7', 'd'),
        card('6', 'c'),
        card('5', 's'),
        card('2', 'h'),
        card('A', 'd'),
      ];

      const result = evaluateHand(cards);
      expect(result.rankName).toBe('Straight');
    });

    it('should identify three of a kind', () => {
      const cards = [
        card('J', 's'),
        card('J', 'h'),
        card('J', 'd'),
        card('8', 'c'),
        card('5', 's'),
        card('2', 'h'),
        card('3', 'd'),
      ];

      const result = evaluateHand(cards);
      expect(result.rankName).toBe('Three of a Kind');
    });

    it('should identify two pair', () => {
      const cards = [
        card('A', 's'),
        card('A', 'h'),
        card('K', 'd'),
        card('K', 'c'),
        card('5', 's'),
        card('2', 'h'),
        card('3', 'd'),
      ];

      const result = evaluateHand(cards);
      expect(result.rankName).toBe('Two Pair');
    });

    it('should identify one pair', () => {
      const cards = [
        card('Q', 's'),
        card('Q', 'h'),
        card('9', 'd'),
        card('6', 'c'),
        card('4', 's'),
        card('2', 'h'),
        card('3', 'd'),
      ];

      const result = evaluateHand(cards);
      expect(result.rankName).toBe('One Pair');
    });

    it('should identify high card', () => {
      const cards = [
        card('A', 's'),
        card('K', 'h'),
        card('9', 'd'),
        card('6', 'c'),
        card('4', 's'),
        card('2', 'h'),
        card('3', 'd'),
      ];

      const result = evaluateHand(cards);
      expect(result.rankName).toBe('High Card');
    });
  });

  describe('compareHands', () => {
    it('should rank flush higher than straight', () => {
      const flush = evaluateHand([
        card('A', 'h'),
        card('J', 'h'),
        card('8', 'h'),
        card('6', 'h'),
        card('3', 'h'),
        card('2', 'c'),
        card('K', 'd'),
      ]);

      const straight = evaluateHand([
        card('9', 's'),
        card('8', 'h'),
        card('7', 'd'),
        card('6', 'c'),
        card('5', 's'),
        card('2', 'h'),
        card('A', 'd'),
      ]);

      expect(compareHands(flush, straight)).toBeGreaterThan(0);
    });

    it('should correctly compare same rank hands', () => {
      const pairAces = evaluateHand([
        card('A', 's'),
        card('A', 'h'),
        card('K', 'd'),
        card('Q', 'c'),
        card('J', 's'),
        card('2', 'h'),
        card('3', 'd'),
      ]);

      const pairKings = evaluateHand([
        card('K', 's'),
        card('K', 'h'),
        card('Q', 'd'),
        card('J', 'c'),
        card('T', 's'),
        card('2', 'h'),
        card('3', 'd'),
      ]);

      expect(compareHands(pairAces, pairKings)).toBeGreaterThan(0);
    });

    it('should return 0 for identical hands', () => {
      const hand1 = evaluateHand([
        card('A', 's'),
        card('A', 'h'),
        card('K', 'd'),
        card('Q', 'c'),
        card('J', 's'),
        card('2', 'h'),
        card('3', 'd'),
      ]);

      const hand2 = evaluateHand([
        card('A', 'd'),
        card('A', 'c'),
        card('K', 's'),
        card('Q', 'h'),
        card('J', 'd'),
        card('4', 'h'),
        card('5', 'd'),
      ]);

      // Same hand value (pair of aces with K Q J kickers)
      expect(compareHands(hand1, hand2)).toBe(0);
    });
  });
});
