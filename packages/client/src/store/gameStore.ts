import { create } from 'zustand';
import type {
  Card,
  Street,
  PlayerPublic,
  TableSettings,
  HandResult,
  ActionType,
} from '@blitz-holdem/common';

interface GameState {
  // Connection
  connected: boolean;
  yourPlayerId: string | null;
  yourSeatIndex: 0 | 1 | null;

  // Room
  roomId: string | null;
  players: [PlayerPublic | null, PlayerPublic | null];
  settings: TableSettings | null;

  // Hand
  handNumber: number;
  isHandInProgress: boolean;
  dealerIndex: 0 | 1;
  activePlayerIndex: 0 | 1 | null;
  street: Street;
  communityCards: Card[];
  pot: number;
  currentBet: number;
  minRaise: number;

  // Result
  result: HandResult | null;
  revealedCards: { seat0: [Card, Card] | null; seat1: [Card, Card] | null } | null;

  // Server time offset for clock sync
  serverTimeOffset: number;

  // Actions
  setConnected: (connected: boolean) => void;
  setRoomState: (state: Partial<GameState>) => void;
  updatePlayers: (players: [PlayerPublic | null, PlayerPublic | null]) => void;
  updateTimeBanks: (banks: [{ timeBank: number }, { timeBank: number }]) => void;
  setStreet: (street: Street, communityCards: Card[]) => void;
  setActivePlayer: (index: 0 | 1 | null) => void;
  setResult: (
    result: HandResult,
    revealedCards: { seat0: [Card, Card] | null; seat1: [Card, Card] | null },
    communityCards: Card[]
  ) => void;
  clearResult: () => void;
  revealCardsForSeat: (seatIndex: 0 | 1, cards: [Card, Card]) => void;
  syncServerTime: (serverTime: number) => void;
  reset: () => void;
}

const initialState = {
  connected: false,
  yourPlayerId: null,
  yourSeatIndex: null,
  roomId: null,
  players: [null, null] as [PlayerPublic | null, PlayerPublic | null],
  settings: null,
  handNumber: 0,
  isHandInProgress: false,
  dealerIndex: 0 as const,
  activePlayerIndex: null,
  street: 'preflop' as Street,
  communityCards: [],
  pot: 0,
  currentBet: 0,
  minRaise: 2,
  result: null,
  revealedCards: null,
  serverTimeOffset: 0,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setConnected: (connected) => set({ connected }),

  setRoomState: (state) => set(state),

  updatePlayers: (players) => set({ players }),

  updateTimeBanks: (banks) =>
    set((state) => ({
      players: [
        state.players[0] ? { ...state.players[0], timeBank: banks[0].timeBank } : null,
        state.players[1] ? { ...state.players[1], timeBank: banks[1].timeBank } : null,
      ],
    })),

  setStreet: (street, communityCards) => set({ street, communityCards, currentBet: 0 }),

  setActivePlayer: (index) => set({ activePlayerIndex: index }),

  setResult: (result, revealedCards, communityCards) =>
    set({ result, revealedCards, communityCards, isHandInProgress: false }),

  clearResult: () => set({ result: null, revealedCards: null }),

  revealCardsForSeat: (seatIndex, cards) =>
    set((state) => ({
      revealedCards: {
        seat0: seatIndex === 0 ? cards : (state.revealedCards?.seat0 ?? null),
        seat1: seatIndex === 1 ? cards : (state.revealedCards?.seat1 ?? null),
      },
    })),

  syncServerTime: (serverTime) => {
    const clientTime = Date.now();
    set({ serverTimeOffset: serverTime - clientTime });
  },

  reset: () => set(initialState),
}));

// Selectors
export const selectYourPlayer = (state: GameState): PlayerPublic | null => {
  if (state.yourSeatIndex === null) return null;
  return state.players[state.yourSeatIndex];
};

export const selectOpponentPlayer = (state: GameState): PlayerPublic | null => {
  if (state.yourSeatIndex === null) return null;
  const opponentIndex = state.yourSeatIndex === 0 ? 1 : 0;
  return state.players[opponentIndex];
};

export const selectIsYourTurn = (state: GameState): boolean => {
  return state.activePlayerIndex === state.yourSeatIndex;
};

export const selectToCall = (state: GameState): number => {
  const player = selectYourPlayer(state);
  if (!player) return 0;
  return Math.max(0, state.currentBet - player.currentBet);
};

export const selectValidActions = (state: GameState): ActionType[] => {
  if (!state.isHandInProgress || !selectIsYourTurn(state)) return [];

  const player = selectYourPlayer(state);
  if (!player || player.folded || player.isAllIn) return [];

  const toCall = selectToCall(state);
  const actions: ActionType[] = ['fold'];

  if (toCall === 0) actions.push('check');
  // Allow call if there's a bet and player has any time (partial calls allowed vs all-in)
  if (toCall > 0 && player.timeBank > 0) actions.push('call');
  if (player.timeBank >= toCall + state.minRaise) {
    actions.push(state.currentBet === 0 ? 'bet' : 'raise');
  }
  if (player.timeBank > 0) actions.push('all-in');

  return actions;
};
