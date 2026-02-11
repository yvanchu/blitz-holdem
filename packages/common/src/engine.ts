// ─────────────────────────────────────────────────────────────
// Game Engine - Pure State Management for Bullet Poker
// ─────────────────────────────────────────────────────────────

import type {
  Action,
  ActionType,
  Card,
  HandResult,
  Player,
  Street,
  TableSettings,
  TableState,
} from './types';
import { DEFAULT_SETTINGS } from './types';
import { createDeck, dealCards, shuffle } from './deck';
import { compareHands, evaluateHand } from './evaluate';
import { awardPot, canAfford, commitSeconds } from './timer';

// ─────────────────────────────────────────────────────────────
// State Initialization
// ─────────────────────────────────────────────────────────────

export function createInitialState(
  roomId: string,
  settingsOverrides?: Partial<TableSettings>
): TableState {
  const settings = { ...DEFAULT_SETTINGS, ...settingsOverrides };
  return {
    roomId,
    players: [null, null],
    dealerIndex: 0,
    activePlayerIndex: null,
    street: 'preflop',
    communityCards: [],
    pot: 0,
    currentBet: 0,
    minRaise: settings.bigBlind,
    lastRaiseAmount: settings.bigBlind,
    lastAggressorIndex: null,
    settings,
    handNumber: 0,
    isHandInProgress: false,
    lastActionTimestamp: Date.now(),
    winner: null,
  };
}

export function addPlayer(state: TableState, player: Player): TableState {
  const seatIndex = state.players[0] === null ? 0 : state.players[1] === null ? 1 : null;
  if (seatIndex === null) {
    throw new Error('Table is full');
  }

  const players: [Player | null, Player | null] = [...state.players];
  players[seatIndex] = { ...player, seatIndex };

  return { ...state, players };
}

export function removePlayer(state: TableState, playerId: string): TableState {
  const players: [Player | null, Player | null] = [...state.players];
  for (let i = 0; i < 2; i++) {
    if (players[i]?.id === playerId) {
      players[i] = null;
    }
  }
  return { ...state, players };
}

// ─────────────────────────────────────────────────────────────
// Hand Management
// ─────────────────────────────────────────────────────────────

export interface StartHandResult {
  state: TableState;
  deck: Card[];
}

export function startHand(state: TableState): StartHandResult {
  const player0 = state.players[0];
  const player1 = state.players[1];

  if (!player0 || !player1) {
    throw new Error('Need 2 players to start hand');
  }

  // Rotate dealer
  const dealerIndex: 0 | 1 = state.handNumber === 0 ? 0 : state.dealerIndex === 0 ? 1 : 0;

  // In heads-up, dealer posts SB, other posts BB
  const sbIndex = dealerIndex;
  const bbIndex: 0 | 1 = dealerIndex === 0 ? 1 : 0;

  const { smallBlind, bigBlind } = state.settings;

  // Create and shuffle deck
  let deck = shuffle(createDeck());

  // Deal hole cards (2 each)
  const [holeCards0, remaining1] = dealCards(deck, 2);
  const [holeCards1, remaining2] = dealCards(remaining1, 2);
  deck = remaining2;

  // Post blinds - explicitly type as Player
  let updatedPlayer0: Player = {
    ...player0,
    holeCards: holeCards0 as [Card, Card],
    currentBet: 0,
    folded: false,
    isAllIn: false,
    hasActedThisStreet: false,
  };
  let updatedPlayer1: Player = {
    ...player1,
    holeCards: holeCards1 as [Card, Card],
    currentBet: 0,
    folded: false,
    isAllIn: false,
    hasActedThisStreet: false,
  };

  // Small blind
  if (sbIndex === 0) {
    const sbAmount = Math.min(smallBlind, updatedPlayer0.timeBank);
    updatedPlayer0 = commitSeconds(updatedPlayer0, sbAmount);
    if (updatedPlayer0.timeBank === 0) updatedPlayer0.isAllIn = true;
  } else {
    const sbAmount = Math.min(smallBlind, updatedPlayer1.timeBank);
    updatedPlayer1 = commitSeconds(updatedPlayer1, sbAmount);
    if (updatedPlayer1.timeBank === 0) updatedPlayer1.isAllIn = true;
  }

  // Big blind
  if (bbIndex === 0) {
    const bbAmount = Math.min(bigBlind, updatedPlayer0.timeBank);
    updatedPlayer0 = commitSeconds(updatedPlayer0, bbAmount);
    if (updatedPlayer0.timeBank === 0) updatedPlayer0.isAllIn = true;
  } else {
    const bbAmount = Math.min(bigBlind, updatedPlayer1.timeBank);
    updatedPlayer1 = commitSeconds(updatedPlayer1, bbAmount);
    if (updatedPlayer1.timeBank === 0) updatedPlayer1.isAllIn = true;
  }

  const pot = Math.round(updatedPlayer0.currentBet + updatedPlayer1.currentBet);
  const currentBet = bigBlind;

  // In heads-up preflop, dealer (SB) acts first
  const activePlayerIndex = sbIndex;

  // Order players by their seat index
  const orderedPlayers: [Player, Player] = [
    updatedPlayer0.seatIndex === 0 ? updatedPlayer0 : updatedPlayer1,
    updatedPlayer0.seatIndex === 0 ? updatedPlayer1 : updatedPlayer0,
  ];

  return {
    state: {
      ...state,
      players: orderedPlayers,
      dealerIndex,
      activePlayerIndex,
      street: 'preflop',
      communityCards: [],
      pot,
      currentBet,
      minRaise: bigBlind,
      lastRaiseAmount: bigBlind,
      handNumber: state.handNumber + 1,
      isHandInProgress: true,
      lastActionTimestamp: Date.now(),
      winner: null,
    },
    deck,
  };
}

// ─────────────────────────────────────────────────────────────
// Action Validation & Application
// ─────────────────────────────────────────────────────────────

export interface ActionResult {
  state: TableState;
  deck: Card[];
  handResult?: HandResult;
}

export function getValidActions(state: TableState): ActionType[] {
  if (!state.isHandInProgress || state.activePlayerIndex === null) {
    return [];
  }

  const player = state.players[state.activePlayerIndex];
  if (!player || player.folded || player.isAllIn) {
    return [];
  }

  const toCall = state.currentBet - player.currentBet;
  const actions: ActionType[] = ['fold'];

  if (toCall === 0) {
    actions.push('check');
  }

  // Allow call if there's a bet to call and player has any time
  // (partial calls are allowed when facing an all-in for more than you have)
  if (toCall > 0 && player.timeBank > 0) {
    actions.push('call');
  }

  if (canAfford(player, toCall + state.minRaise)) {
    actions.push(state.currentBet === 0 ? 'bet' : 'raise');
  }

  if (player.timeBank > 0) {
    actions.push('all-in');
  }

  return actions;
}

export function applyAction(state: TableState, action: Action, deck: Card[]): ActionResult {
  if (!state.isHandInProgress) {
    throw new Error('No hand in progress');
  }

  if (state.activePlayerIndex === null) {
    throw new Error('No active player');
  }

  const playerIndex = state.activePlayerIndex;
  const player = state.players[playerIndex];

  if (!player || player.id !== action.playerId) {
    throw new Error("Not this player's turn");
  }

  if (player.folded || player.isAllIn) {
    throw new Error('Player cannot act');
  }

  const validActions = getValidActions(state);
  if (!validActions.includes(action.type)) {
    throw new Error(`Invalid action: ${action.type}`);
  }

  const updatedPlayers: [Player | null, Player | null] = [...state.players];
  let pot = state.pot;
  let currentBet = state.currentBet;
  let minRaise = state.minRaise;
  let lastRaiseAmount = state.lastRaiseAmount;
  let lastAggressorIndex = state.lastAggressorIndex;
  let updatedPlayer = { ...player, hasActedThisStreet: true };

  switch (action.type) {
    case 'fold':
      updatedPlayer.folded = true;
      break;

    case 'check':
      // Nothing to commit
      break;

    case 'call': {
      const toCall = currentBet - player.currentBet;
      const callAmount = Math.round(Math.min(toCall, player.timeBank));
      updatedPlayer = commitSeconds(updatedPlayer, callAmount);
      pot += callAmount;
      if (updatedPlayer.timeBank === 0) {
        updatedPlayer.isAllIn = true;
      }
      break;
    }

    case 'bet':
    case 'raise': {
      let amount = Math.round(action.amount ?? 0);
      const toCall = currentBet - player.currentBet;

      // Cap at player's time bank
      amount = Math.min(amount, player.timeBank);

      const raiseAmount = amount - toCall;

      if (raiseAmount < minRaise && amount < player.timeBank) {
        throw new Error(`Minimum raise is ${minRaise}s`);
      }

      updatedPlayer = commitSeconds(updatedPlayer, amount);
      pot += amount;
      currentBet = updatedPlayer.currentBet;
      lastRaiseAmount = Math.round(raiseAmount);
      minRaise = Math.round(raiseAmount);
      lastAggressorIndex = playerIndex; // Track the aggressor

      if (updatedPlayer.timeBank === 0) {
        updatedPlayer.isAllIn = true;
      }
      break;
    }

    case 'all-in': {
      // Go all-in with entire time bank - excess will be refunded before runout
      const allInAmount = Math.round(player.timeBank);

      updatedPlayer = commitSeconds(updatedPlayer, allInAmount);
      pot += allInAmount;
      updatedPlayer.isAllIn = true;

      if (updatedPlayer.currentBet > currentBet) {
        const raiseAmount = updatedPlayer.currentBet - currentBet;
        if (raiseAmount >= minRaise) {
          lastRaiseAmount = Math.round(raiseAmount);
          minRaise = Math.round(raiseAmount);
        }
        currentBet = updatedPlayer.currentBet;
        lastAggressorIndex = playerIndex; // Track the aggressor for all-in raises
      }
      break;
    }
  }

  updatedPlayers[playerIndex] = updatedPlayer;

  // Round pot to avoid floating point issues
  pot = Math.round(pot);

  const newState: TableState = {
    ...state,
    players: updatedPlayers,
    pot,
    currentBet,
    minRaise,
    lastRaiseAmount,
    lastAggressorIndex,
    lastActionTimestamp: Date.now(),
  };

  // Check for hand end (fold)
  if (action.type === 'fold') {
    const winnerId = playerIndex === 0 ? newState.players[1]!.id : newState.players[0]!.id;
    return endHand(newState, winnerId, false);
  }

  // Check if betting round is complete
  if (isBettingRoundComplete(newState)) {
    // Server will handle pacing for all-in runouts
    return advanceStreet(newState, deck);
  }

  // Switch to next player
  const nextPlayerIndex: 0 | 1 = playerIndex === 0 ? 1 : 0;
  newState.activePlayerIndex = nextPlayerIndex;

  return { state: newState, deck };
}

function isBettingRoundComplete(state: TableState): boolean {
  const p0 = state.players[0];
  const p1 = state.players[1];

  if (!p0 || !p1) return false;

  // One player folded
  if (p0.folded || p1.folded) return true;

  // Both all-in
  if (p0.isAllIn && p1.isAllIn) return true;

  // One all-in, other has matched or called
  if (p0.isAllIn && p1.hasActedThisStreet && p1.currentBet >= p0.currentBet) return true;
  if (p1.isAllIn && p0.hasActedThisStreet && p0.currentBet >= p1.currentBet) return true;

  // Special case: all-in for less than opponent's existing bet (no action needed)
  // This happens when a player times out and goes all-in for less than the BB
  if (p0.isAllIn && p0.currentBet <= p1.currentBet) return true;
  if (p1.isAllIn && p1.currentBet <= p0.currentBet) return true;

  // Both have acted this street and bets are equal
  if (p0.hasActedThisStreet && p1.hasActedThisStreet && p0.currentBet === p1.currentBet) {
    return true;
  }

  return false;
}

// Refund uncalled bet when one player is all-in for less
function refundUncalledBet(state: TableState): TableState {
  const p0 = state.players[0];
  const p1 = state.players[1];
  if (!p0 || !p1) return state;

  // Find the smaller bet (the effective amount both players are risking)
  const minBet = Math.min(p0.currentBet, p1.currentBet);
  let pot = state.pot;

  let newP0 = p0;
  let newP1 = p1;

  // Refund any excess to each player
  if (p0.currentBet > minBet) {
    const refund = p0.currentBet - minBet;
    newP0 = { ...p0, timeBank: p0.timeBank + refund, currentBet: minBet };
    pot -= refund;
  }
  if (p1.currentBet > minBet) {
    const refund = p1.currentBet - minBet;
    newP1 = { ...p1, timeBank: p1.timeBank + refund, currentBet: minBet };
    pot -= refund;
  }

  return {
    ...state,
    players: [newP0, newP1],
    pot: Math.round(pot),
  };
}

// ─────────────────────────────────────────────────────────────
// Street Advancement
// ─────────────────────────────────────────────────────────────

export function advanceStreet(state: TableState, deck: Card[]): ActionResult {
  // Refund any uncalled bet before advancing (handles all-in for less scenarios)
  const refundedState = refundUncalledBet(state);
  const p0 = refundedState.players[0]!;
  const p1 = refundedState.players[1]!;

  // In heads-up, if either player is all-in, run out remaining streets
  // (the non-all-in player can only check - no betting possible)
  const oneOrBothAllIn = p0.isAllIn || p1.isAllIn;

  // Reset current bets and hasActed for new street
  const resetPlayers: [Player, Player] = [
    { ...p0, currentBet: 0, hasActedThisStreet: false },
    { ...p1, currentBet: 0, hasActedThisStreet: false },
  ];

  let newStreet: Street;
  let newCommunityCards: Card[];
  let remainingDeck = deck;

  switch (refundedState.street) {
    case 'preflop': {
      newStreet = 'flop';
      const [flop, remaining] = dealCards(remainingDeck, 3);
      newCommunityCards = flop;
      remainingDeck = remaining;
      break;
    }
    case 'flop': {
      newStreet = 'turn';
      const [turn, remaining] = dealCards(remainingDeck, 1);
      newCommunityCards = [...refundedState.communityCards, ...turn];
      remainingDeck = remaining;
      break;
    }
    case 'turn': {
      newStreet = 'river';
      const [river, remaining] = dealCards(remainingDeck, 1);
      newCommunityCards = [...refundedState.communityCards, ...river];
      remainingDeck = remaining;
      break;
    }
    case 'river': {
      // Go to showdown
      return resolveShowdown({ ...refundedState, players: resetPlayers }, remainingDeck);
    }
    default:
      throw new Error(`Invalid street: ${refundedState.street}`);
  }

  // In heads-up post-flop, BB acts first (non-dealer)
  const activePlayerIndex: 0 | 1 = refundedState.dealerIndex === 0 ? 1 : 0;

  const newState: TableState = {
    ...refundedState,
    players: resetPlayers,
    street: newStreet,
    communityCards: newCommunityCards,
    currentBet: 0,
    minRaise: refundedState.settings.bigBlind,
    activePlayerIndex: oneOrBothAllIn ? null : activePlayerIndex,
    // Reset aggressor when advancing to a new street - it will be set if someone bets/raises
    lastAggressorIndex: null,
  };

  // Always return after one street - server handles the pacing for all-in runouts
  // The server will check if both players are all-in and call runOutHand with delays
  return { state: newState, deck: remainingDeck };
}

// ─────────────────────────────────────────────────────────────
// Showdown & Hand End
// ─────────────────────────────────────────────────────────────

function resolveShowdown(state: TableState, _deck: Card[]): ActionResult {
  const p0 = state.players[0]!;
  const p1 = state.players[1]!;

  const cards0 = [...p0.holeCards!, ...state.communityCards];
  const cards1 = [...p1.holeCards!, ...state.communityCards];

  const hand0 = evaluateHand(cards0);
  const hand1 = evaluateHand(cards1);

  const comparison = compareHands(hand0, hand1);

  // Determine who shows first:
  // - If there was a river aggressor, they show first
  // - Otherwise, out of position (non-dealer) shows first
  let firstToShow: 0 | 1;
  if (state.lastAggressorIndex !== null) {
    firstToShow = state.lastAggressorIndex;
  } else {
    // Out of position = non-dealer
    firstToShow = state.dealerIndex === 0 ? 1 : 0;
  }

  if (comparison > 0) {
    // Player 0 wins outright
    return endHand(state, p0.id, true, hand0.rankName, hand0.cards, firstToShow);
  } else if (comparison < 0) {
    // Player 1 wins outright
    return endHand(state, p1.id, true, hand1.rankName, hand1.cards, firstToShow);
  } else {
    // Tie - split pot
    return endHandSplit(state, hand0.rankName, hand0.cards, firstToShow);
  }
}

function endHand(
  state: TableState,
  winnerId: string,
  showdown: boolean,
  winnerHandRank: string = 'fold',
  winningCards?: Card[],
  firstToShow?: 0 | 1
): ActionResult {
  const winnerIndex = state.players[0]?.id === winnerId ? 0 : 1;
  const winner = state.players[winnerIndex]!;

  const updatedWinner = awardPot(winner, state.pot);

  const updatedPlayers: [Player | null, Player | null] = [...state.players];
  updatedPlayers[winnerIndex] = updatedWinner;

  const handResult: HandResult = {
    winnerId,
    winnerHandRank,
    potAwarded: state.pot,
    showdown,
    winningCards,
    firstToShow,
  };

  const newState: TableState = {
    ...state,
    players: updatedPlayers,
    pot: 0,
    currentBet: 0,
    isHandInProgress: false,
    activePlayerIndex: null,
    street: 'showdown',
    winner: winnerId,
  };

  return { state: newState, deck: [], handResult };
}

function endHandSplit(
  state: TableState,
  handRank: string,
  winningCards: Card[],
  firstToShow: 0 | 1
): ActionResult {
  const p0 = state.players[0]!;
  const p1 = state.players[1]!;

  // Split pot evenly - handle odd chip by giving to player out of position (non-dealer)
  const halfPot = Math.floor(state.pot / 2);
  const remainder = state.pot % 2;
  const outOfPositionIndex = state.dealerIndex === 0 ? 1 : 0;

  const p0Award = halfPot + (outOfPositionIndex === 0 ? remainder : 0);
  const p1Award = halfPot + (outOfPositionIndex === 1 ? remainder : 0);

  const updatedP0 = awardPot(p0, p0Award);
  const updatedP1 = awardPot(p1, p1Award);

  const updatedPlayers: [Player | null, Player | null] = [updatedP0, updatedP1];

  const handResult: HandResult = {
    winnerId: p0.id, // Primary winner for backwards compatibility
    winnerHandRank: handRank + ' (split)',
    potAwarded: p0Award, // Amount to primary winner
    showdown: true,
    winningCards,
    firstToShow,
    isSplit: true,
    splitWinners: [
      { playerId: p0.id, amount: p0Award },
      { playerId: p1.id, amount: p1Award },
    ],
  };

  const newState: TableState = {
    ...state,
    players: updatedPlayers,
    pot: 0,
    currentBet: 0,
    isHandInProgress: false,
    activePlayerIndex: null,
    street: 'showdown',
    winner: null, // No single winner on split
  };

  return { state: newState, deck: [], handResult };
}
