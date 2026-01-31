// ─────────────────────────────────────────────────────────────
// Deck Utilities
// ─────────────────────────────────────────────────────────────

import type { Card, Rank, Suit } from './types';

const SUITS: Suit[] = ['h', 'd', 'c', 's'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

/**
 * Create a standard 52-card deck.
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/**
 * Fisher-Yates shuffle (in-place).
 * Uses crypto.getRandomValues when available for unbiased randomness.
 */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/**
 * Generate a secure random integer in [0, max).
 */
function secureRandomInt(max: number): number {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    const randomBuffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(randomBuffer);
    return randomBuffer[0]! % max;
  }
  // Fallback for environments without crypto
  return Math.floor(Math.random() * max);
}

/**
 * Deal cards from the deck.
 * Returns [dealtCards, remainingDeck].
 */
export function dealCards(deck: Card[], count: number): [Card[], Card[]] {
  return [deck.slice(0, count), deck.slice(count)];
}

/**
 * Card to string representation (e.g., "Ah" for Ace of hearts).
 */
export function cardToString(card: Card): string {
  return `${card.rank}${card.suit}`;
}

/**
 * Parse card from string (e.g., "Ah" → { rank: 'A', suit: 'h' }).
 */
export function parseCard(str: string): Card | null {
  if (str.length !== 2) return null;
  const rank = str[0] as Rank;
  const suit = str[1] as Suit;
  if (!RANKS.includes(rank) || !SUITS.includes(suit)) return null;
  return { rank, suit };
}
