// ─────────────────────────────────────────────────────────────
// Core Types for Blitz Hold'em
// ─────────────────────────────────────────────────────────────

export type Suit = 'h' | 'd' | 'c' | 's'; // hearts, diamonds, clubs, spades
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export interface Action {
  type: ActionType;
  amount?: number; // seconds committed (for bet/raise/call/all-in)
  playerId: string;
  timestamp: number; // server timestamp
}

export interface Player {
  id: string;
  alias: string;
  timeBank: number; // remaining seconds
  holeCards: [Card, Card] | null;
  currentBet: number; // seconds committed this street
  folded: boolean;
  isAllIn: boolean;
  isConnected: boolean;
  seatIndex: 0 | 1;
  hasActedThisStreet: boolean; // has player acted in current betting round
}

export interface TableSettings {
  initialTimeBank: number; // default 180
  smallBlind: number; // default 1
  bigBlind: number; // default 2
  tickRateHz: number; // default 6
  disconnectGracePeriod: number; // default 5000 (ms)
  runoutDelayMs: number; // delay between streets during all-in runout (default 3000)
  nextHandDelayMs: number; // delay before starting next hand after result (default 6000)
}

export const DEFAULT_SETTINGS: TableSettings = {
  initialTimeBank: 300,
  smallBlind: 1,
  bigBlind: 2,
  tickRateHz: 6,
  disconnectGracePeriod: 5000,
  runoutDelayMs: 3000,
  nextHandDelayMs: 6000,
};

export interface TableState {
  roomId: string;
  players: [Player | null, Player | null];
  dealerIndex: 0 | 1;
  activePlayerIndex: 0 | 1 | null;
  street: Street;
  communityCards: Card[];
  pot: number;
  currentBet: number; // highest bet this street
  minRaise: number; // minimum raise amount
  lastRaiseAmount: number;
  lastAggressorIndex: 0 | 1 | null; // player who made the last bet/raise (for showdown order)
  settings: TableSettings;
  handNumber: number;
  isHandInProgress: boolean;
  lastActionTimestamp: number;
  winner: string | null; // player id or null if ongoing
}

export interface HandResult {
  winnerId: string; // Primary winner (for backwards compatibility) or first player in split
  winnerHandRank: string;
  potAwarded: number; // Amount awarded to primary winner
  showdown: boolean;
  winningCards?: Card[]; // The 5 cards that make the winning hand
  firstToShow?: 0 | 1; // Seat index of player who shows first
  isSplit?: boolean; // True if pot was split
  splitWinners?: { playerId: string; amount: number }[]; // All winners and their amounts
}

export type GamePhase = 'waiting' | 'ready' | 'playing' | 'finished';
