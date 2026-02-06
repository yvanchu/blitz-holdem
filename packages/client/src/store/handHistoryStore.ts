import { create } from 'zustand';
import { OpenHandHistory } from 'open-hand-tracker';
import type { Card, Street, ActionType } from '@blitz-holdem/common';

// Types for completed hand data (serializable snapshot)
export interface CompletedHand {
  handNumber: number;
  timestamp: string;
  ohhData: ReturnType<OpenHandHistory['toJSON']>;
  // Additional metadata for display
  heroSeatIndex: 0 | 1;
  heroHoleCards: [Card, Card] | null;
  opponentHoleCards: [Card, Card] | null; // Only if revealed
  communityCards: Card[];
  winnerId: string | null;
  winnerHandRank: string | null;
  potAwarded: number;
  // Split pot support
  isSplit?: boolean;
  splitWinners?: { playerId: string; amount: number }[];
}

interface HandHistoryState {
  // Current hand being recorded
  currentHand: OpenHandHistory | null;
  currentHandNumber: number;
  currentStreetId: number;
  actionNumber: number;

  // Completed hands
  completedHands: CompletedHand[];

  // Modal state
  isModalOpen: boolean;
  viewingIndex: number; // Index into completedHands, -1 means viewing latest

  // Metadata for current hand
  heroSeatIndex: 0 | 1 | null;
  heroHoleCards: [Card, Card] | null;
  revealedOpponentCards: [Card, Card] | null;

  // Actions
  startNewHand: (params: {
    handNumber: number;
    roomId: string;
    dealerSeat: 0 | 1;
    heroSeatIndex: 0 | 1;
    heroPlayerId: string;
    players: Array<{ id: string; alias: string; timeBank: number; seatIndex: 0 | 1 } | null>;
    smallBlind: number;
    bigBlind: number;
    heroHoleCards: [Card, Card];
  }) => void;

  recordAction: (params: {
    playerId: string;
    action: ActionType;
    amount?: number;
    isAllIn?: boolean;
  }) => void;

  recordStreet: (street: Street, communityCards: Card[]) => void;

  recordRevealedCards: (seatIndex: 0 | 1, cards: [Card, Card]) => void;

  finalizeHand: (params: {
    winnerId: string;
    winnerHandRank: string | null;
    potAwarded: number;
    communityCards: Card[];
    isSplit?: boolean;
    splitWinners?: { playerId: string; amount: number }[];
  }) => void;

  // Modal controls
  openModal: () => void;
  closeModal: () => void;
  navigatePrev: () => void;
  navigateNext: () => void;
  goToLatest: () => void;

  // Export
  exportAllHands: () => void;

  // Reset (for new session)
  reset: () => void;
}

// Map our action types to OHH action types
function mapActionToOHH(
  action: ActionType
): 'Fold' | 'Check' | 'Call' | 'Bet' | 'Raise' | 'Post SB' | 'Post BB' {
  switch (action) {
    case 'fold':
      return 'Fold';
    case 'check':
      return 'Check';
    case 'call':
      return 'Call';
    case 'bet':
      return 'Bet';
    case 'raise':
      return 'Raise';
    case 'all-in':
      return 'Raise'; // All-in is treated as raise with is_allin flag
    default:
      return 'Fold';
  }
}

// Map street names
function mapStreetToOHH(street: Street): 'Preflop' | 'Flop' | 'Turn' | 'River' | 'Showdown' {
  switch (street) {
    case 'preflop':
      return 'Preflop';
    case 'flop':
      return 'Flop';
    case 'turn':
      return 'Turn';
    case 'river':
      return 'River';
    case 'showdown':
      return 'Showdown';
    default:
      return 'Preflop';
  }
}

// Convert card to OHH format (e.g., "As", "Kh", "Td")
function cardToOHH(card: Card): string {
  return `${card.rank}${card.suit}`;
}

// Player ID mapping (OHH uses numeric IDs)
const playerIdMap = new Map<string, number>();
let nextPlayerId = 1;

function getNumericPlayerId(playerId: string): number {
  if (!playerIdMap.has(playerId)) {
    playerIdMap.set(playerId, nextPlayerId++);
  }
  return playerIdMap.get(playerId)!;
}

const initialState = {
  currentHand: null,
  currentHandNumber: 0,
  currentStreetId: 0,
  actionNumber: 0,
  completedHands: [],
  isModalOpen: false,
  viewingIndex: -1,
  heroSeatIndex: null,
  heroHoleCards: null,
  revealedOpponentCards: null,
};

export const useHandHistoryStore = create<HandHistoryState>((set, get) => ({
  ...initialState,

  startNewHand: ({
    handNumber,
    roomId,
    dealerSeat,
    heroSeatIndex,
    heroPlayerId,
    players,
    smallBlind,
    bigBlind,
    heroHoleCards,
  }) => {
    // Reset player ID mapping for consistency
    playerIdMap.clear();
    nextPlayerId = 1;

    const ohh = new OpenHandHistory({
      siteName: 'Blitz Holdem',
      networkName: 'Blitz Holdem',
      tableName: roomId,
      tableSize: 2,
      gameNumber: String(handNumber),
      startDateUTC: new Date().toISOString(),
      currency: 'SEC', // Seconds as currency
      smallBlindAmount: smallBlind,
      bigBlindAmount: bigBlind,
      dealerSeat: dealerSeat + 1, // OHH uses 1-indexed seats
      heroPlayerId: getNumericPlayerId(heroPlayerId),
      betType: 'NL',
      gameType: 'Holdem',
    });

    // Add players
    players.forEach((player) => {
      if (player) {
        ohh.addPlayer({
          name: player.alias,
          id: getNumericPlayerId(player.id),
          starting_stack: player.timeBank,
          seat: player.seatIndex + 1, // OHH uses 1-indexed seats
          cards: player.seatIndex === heroSeatIndex ? heroHoleCards.map(cardToOHH) : undefined,
        });
      }
    });

    // Add preflop round
    ohh.addRound({
      id: 1,
      street: 'Preflop',
      actions: [],
    });

    // Determine SB and BB positions (in heads-up, dealer posts SB)
    const sbSeatIndex = dealerSeat;
    const bbSeatIndex = dealerSeat === 0 ? 1 : 0;
    const sbPlayer = players[sbSeatIndex];
    const bbPlayer = players[bbSeatIndex];

    // Record blind posts
    let actionNum = 1;
    if (sbPlayer) {
      ohh.addActionToRound(1, {
        action_number: actionNum++,
        player_id: getNumericPlayerId(sbPlayer.id),
        action: 'Post SB',
        amount: smallBlind,
      });
    }
    if (bbPlayer) {
      ohh.addActionToRound(1, {
        action_number: actionNum++,
        player_id: getNumericPlayerId(bbPlayer.id),
        action: 'Post BB',
        amount: bigBlind,
      });
    }

    set({
      currentHand: ohh,
      currentHandNumber: handNumber,
      currentStreetId: 1,
      actionNumber: actionNum,
      heroSeatIndex,
      heroHoleCards,
      revealedOpponentCards: null,
    });
  },

  recordAction: ({ playerId, action, amount, isAllIn }) => {
    const { currentHand, currentStreetId, actionNumber } = get();
    if (!currentHand) return;

    currentHand.addActionToRound(currentStreetId, {
      action_number: actionNumber,
      player_id: getNumericPlayerId(playerId),
      action: mapActionToOHH(action),
      amount: amount,
      is_allin: isAllIn || action === 'all-in',
    });

    set({ actionNumber: actionNumber + 1 });
  },

  recordStreet: (street, communityCards) => {
    const { currentHand, currentStreetId } = get();
    if (!currentHand || street === 'preflop') return;

    // Check if we already have this street recorded to avoid duplicates
    const ohhData = currentHand.toJSON();
    const existingStreet = ohhData.ohh.rounds.find(
      (r) => r.street.toLowerCase() === street.toLowerCase()
    );
    if (existingStreet) return; // Already recorded this street

    const newStreetId = currentStreetId + 1;

    // Get the new cards for this street
    let streetCards: string[] = [];
    if (street === 'flop') {
      streetCards = communityCards.slice(0, 3).map(cardToOHH);
    } else if (street === 'turn' && communityCards[3]) {
      streetCards = [cardToOHH(communityCards[3])];
    } else if (street === 'river' && communityCards[4]) {
      streetCards = [cardToOHH(communityCards[4])];
    }

    currentHand.addRound({
      id: newStreetId,
      street: mapStreetToOHH(street),
      cards: streetCards,
      actions: [],
    });

    set({ currentStreetId: newStreetId });
  },

  recordRevealedCards: (seatIndex, cards) => {
    const { heroSeatIndex } = get();
    if (seatIndex !== heroSeatIndex) {
      set({ revealedOpponentCards: cards });
    }
  },

  finalizeHand: ({
    winnerId,
    winnerHandRank,
    potAwarded,
    communityCards,
    isSplit,
    splitWinners,
  }) => {
    const {
      currentHand,
      currentHandNumber,
      heroSeatIndex,
      heroHoleCards,
      revealedOpponentCards,
      completedHands,
    } = get();
    if (!currentHand) return;

    // Add pot with proper split handling
    if (isSplit && splitWinners) {
      currentHand.addPot({
        number: 1,
        amount: splitWinners.reduce((sum, w) => sum + w.amount, 0),
        player_wins: splitWinners.map((w) => ({
          player_id: getNumericPlayerId(w.playerId),
          win_amount: w.amount,
        })),
      });
    } else {
      currentHand.addPot({
        number: 1,
        amount: potAwarded,
        player_wins: [
          {
            player_id: getNumericPlayerId(winnerId),
            win_amount: potAwarded,
          },
        ],
      });
    }

    // Create completed hand record
    const completedHand: CompletedHand = {
      handNumber: currentHandNumber,
      timestamp: new Date().toISOString(),
      ohhData: currentHand.toJSON(),
      heroSeatIndex: heroSeatIndex!,
      heroHoleCards,
      opponentHoleCards: revealedOpponentCards,
      communityCards,
      winnerId,
      winnerHandRank,
      potAwarded,
      isSplit,
      splitWinners,
    };

    set({
      completedHands: [...completedHands, completedHand],
      currentHand: null,
      currentHandNumber: 0,
      currentStreetId: 0,
      actionNumber: 0,
      heroHoleCards: null,
      revealedOpponentCards: null,
    });
  },

  openModal: () => {
    const { completedHands } = get();
    set({
      isModalOpen: true,
      viewingIndex: completedHands.length > 0 ? completedHands.length - 1 : -1,
    });
  },

  closeModal: () => set({ isModalOpen: false }),

  navigatePrev: () => {
    const { viewingIndex } = get();
    if (viewingIndex > 0) {
      set({ viewingIndex: viewingIndex - 1 });
    }
  },

  navigateNext: () => {
    const { viewingIndex, completedHands } = get();
    if (viewingIndex < completedHands.length - 1) {
      set({ viewingIndex: viewingIndex + 1 });
    }
  },

  goToLatest: () => {
    const { completedHands } = get();
    set({ viewingIndex: completedHands.length - 1 });
  },

  exportAllHands: () => {
    const { completedHands } = get();
    if (completedHands.length === 0) return;

    // Create export data with all hands in OHH format
    const exportData = {
      exportedAt: new Date().toISOString(),
      siteName: 'Blitz Holdem',
      totalHands: completedHands.length,
      hands: completedHands.map((h) => h.ohhData),
    };

    // Create and download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blitz-holdem-hands-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  reset: () => {
    playerIdMap.clear();
    nextPlayerId = 1;
    set(initialState);
  },
}));
