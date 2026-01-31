// ─────────────────────────────────────────────────────────────
// Hand Evaluator for Texas Hold'em
// ─────────────────────────────────────────────────────────────

import type { Card, Rank } from './types';

// Hand rankings (higher is better)
export enum HandRank {
  HighCard = 1,
  OnePair = 2,
  TwoPair = 3,
  ThreeOfAKind = 4,
  Straight = 5,
  Flush = 6,
  FullHouse = 7,
  FourOfAKind = 8,
  StraightFlush = 9,
  RoyalFlush = 10,
}

export interface EvaluatedHand {
  rank: HandRank;
  rankName: string;
  value: number; // Numeric value for comparison (higher is better)
  cards: Card[]; // Best 5 cards
}

const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const RANK_NAMES: Record<HandRank, string> = {
  [HandRank.HighCard]: 'High Card',
  [HandRank.OnePair]: 'One Pair',
  [HandRank.TwoPair]: 'Two Pair',
  [HandRank.ThreeOfAKind]: 'Three of a Kind',
  [HandRank.Straight]: 'Straight',
  [HandRank.Flush]: 'Flush',
  [HandRank.FullHouse]: 'Full House',
  [HandRank.FourOfAKind]: 'Four of a Kind',
  [HandRank.StraightFlush]: 'Straight Flush',
  [HandRank.RoyalFlush]: 'Royal Flush',
};

/**
 * Evaluate the best 5-card hand from 7 cards (2 hole + 5 community).
 */
export function evaluateHand(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate');
  }

  // Generate all 5-card combinations
  const combinations = getCombinations(cards, 5);
  let bestHand: EvaluatedHand | null = null;

  for (const combo of combinations) {
    const evaluated = evaluate5Cards(combo);
    if (!bestHand || evaluated.value > bestHand.value) {
      bestHand = evaluated;
    }
  }

  return bestHand!;
}

/**
 * Evaluate exactly 5 cards.
 */
function evaluate5Cards(cards: Card[]): EvaluatedHand {
  const sorted = [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);

  const isFlush = cards.every((c) => c.suit === cards[0]!.suit);
  const isStraight = checkStraight(sorted);
  const isWheel = checkWheel(sorted); // A-2-3-4-5

  // Group by rank
  const rankCounts = new Map<Rank, Card[]>();
  for (const card of sorted) {
    const existing = rankCounts.get(card.rank) || [];
    existing.push(card);
    rankCounts.set(card.rank, existing);
  }

  const groups = Array.from(rankCounts.entries()).sort((a, b) => {
    // Sort by count desc, then by rank value desc
    if (b[1].length !== a[1].length) return b[1].length - a[1].length;
    return RANK_VALUES[b[0]] - RANK_VALUES[a[0]];
  });

  const counts = groups.map((g) => g[1].length);

  // Determine hand rank
  let rank: HandRank;
  let value: number;

  if ((isStraight || isWheel) && isFlush) {
    if (isStraight && sorted[0]!.rank === 'A') {
      rank = HandRank.RoyalFlush;
    } else {
      rank = HandRank.StraightFlush;
    }
    value = calculateStraightValue(rank, sorted, isWheel);
  } else if (counts[0] === 4) {
    rank = HandRank.FourOfAKind;
    value = calculateGroupValue(rank, groups);
  } else if (counts[0] === 3 && counts[1] === 2) {
    rank = HandRank.FullHouse;
    value = calculateGroupValue(rank, groups);
  } else if (isFlush) {
    rank = HandRank.Flush;
    value = calculateHighCardValue(rank, sorted);
  } else if (isStraight || isWheel) {
    rank = HandRank.Straight;
    value = calculateStraightValue(rank, sorted, isWheel);
  } else if (counts[0] === 3) {
    rank = HandRank.ThreeOfAKind;
    value = calculateGroupValue(rank, groups);
  } else if (counts[0] === 2 && counts[1] === 2) {
    rank = HandRank.TwoPair;
    value = calculateGroupValue(rank, groups);
  } else if (counts[0] === 2) {
    rank = HandRank.OnePair;
    value = calculateGroupValue(rank, groups);
  } else {
    rank = HandRank.HighCard;
    value = calculateHighCardValue(rank, sorted);
  }

  return {
    rank,
    rankName: RANK_NAMES[rank],
    value,
    cards: sorted,
  };
}

function checkStraight(sorted: Card[]): boolean {
  for (let i = 0; i < sorted.length - 1; i++) {
    if (RANK_VALUES[sorted[i]!.rank] - RANK_VALUES[sorted[i + 1]!.rank] !== 1) {
      return false;
    }
  }
  return true;
}

function checkWheel(sorted: Card[]): boolean {
  const ranks = sorted.map((c) => c.rank);
  return (
    ranks.includes('A') &&
    ranks.includes('2') &&
    ranks.includes('3') &&
    ranks.includes('4') &&
    ranks.includes('5')
  );
}

function calculateHighCardValue(rank: HandRank, sorted: Card[]): number {
  // Base value from rank, then add card values
  let value = rank * 1000000;
  for (let i = 0; i < sorted.length; i++) {
    value += RANK_VALUES[sorted[i]!.rank] * Math.pow(15, 4 - i);
  }
  return value;
}

function calculateStraightValue(rank: HandRank, sorted: Card[], isWheel: boolean): number {
  let value = rank * 1000000;
  if (isWheel) {
    value += 5; // Wheel is lowest straight (5-high)
  } else {
    value += RANK_VALUES[sorted[0]!.rank];
  }
  return value;
}

function calculateGroupValue(rank: HandRank, groups: [Rank, Card[]][]): number {
  let value = rank * 1000000;
  for (let i = 0; i < groups.length; i++) {
    value += RANK_VALUES[groups[i]![0]] * Math.pow(15, 4 - i);
  }
  return value;
}

function getCombinations<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];

  function combine(start: number, combo: T[]) {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]!);
      combine(i + 1, combo);
      combo.pop();
    }
  }

  combine(0, []);
  return result;
}

/**
 * Compare two evaluated hands. Returns:
 *  - Positive if hand1 wins
 *  - Negative if hand2 wins
 *  - 0 if tie
 */
export function compareHands(hand1: EvaluatedHand, hand2: EvaluatedHand): number {
  return hand1.value - hand2.value;
}
