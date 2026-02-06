// ─────────────────────────────────────────────────────────────
// WebSocket Protocol Messages
// ─────────────────────────────────────────────────────────────

import type { Action, Card, HandResult, Street, TableSettings } from './types';

// ─────────────────────────────────────────────────────────────
// Client → Server (C2S) Messages
// ─────────────────────────────────────────────────────────────

export interface C2S_Join {
  type: 'JOIN';
  roomId: string;
  alias: string;
}

export interface C2S_Ready {
  type: 'READY';
}

export interface C2S_Start {
  type: 'START';
  force?: boolean; // Start even if opponent not ready
}

export interface C2S_UpdateSettings {
  type: 'UPDATE_SETTINGS';
  settings: {
    smallBlind?: number;
    bigBlind?: number;
    initialTimeBank?: number;
  };
}

export interface C2S_UpdateAlias {
  type: 'UPDATE_ALIAS';
  alias: string;
}

export interface C2S_Action {
  type: 'ACTION';
  action: Action['type'];
  amount?: number;
}

export interface C2S_Ping {
  type: 'PING';
  clientTime: number;
}

export interface C2S_ShowCards {
  type: 'SHOW_CARDS';
}

export type C2SMessage =
  | C2S_Join
  | C2S_Ready
  | C2S_Start
  | C2S_UpdateSettings
  | C2S_UpdateAlias
  | C2S_Action
  | C2S_Ping
  | C2S_ShowCards;

// ─────────────────────────────────────────────────────────────
// Server → Client (S2C) Messages
// ─────────────────────────────────────────────────────────────

export interface S2C_RoomState {
  type: 'ROOM_STATE';
  roomId: string;
  yourPlayerId: string;
  yourSeatIndex: 0 | 1;
  players: [PlayerPublic | null, PlayerPublic | null];
  dealerIndex: 0 | 1;
  activePlayerIndex: 0 | 1 | null;
  street: Street;
  communityCards: Card[];
  pot: number;
  currentBet: number;
  minRaise: number;
  settings: TableSettings;
  handNumber: number;
  isHandInProgress: boolean;
  serverTime: number;
}

// Public player info (hides opponent's hole cards)
export interface PlayerPublic {
  id: string;
  alias: string;
  timeBank: number;
  holeCards: [Card, Card] | null; // null for opponent unless showdown
  currentBet: number;
  folded: boolean;
  isAllIn: boolean;
  isConnected: boolean;
  seatIndex: 0 | 1;
}

export interface S2C_HandStart {
  type: 'HAND_START';
  handNumber: number;
  dealerIndex: 0 | 1;
  holeCards: [Card, Card];
  players: [PlayerPublic | null, PlayerPublic | null];
  pot: number;
  serverTime: number;
}

export interface S2C_Turn {
  type: 'TURN';
  activePlayerIndex: 0 | 1;
  currentBet: number;
  minRaise: number;
  pot: number;
  serverTime: number;
}

export interface S2C_Tick {
  type: 'TICK';
  activePlayerIndex: 0 | 1;
  players: [{ timeBank: number }, { timeBank: number }];
  serverTime: number;
}

export interface S2C_ActionConfirm {
  type: 'ACTION_CONFIRM';
  playerId: string;
  action: Action['type'];
  amount: number;
  pot: number;
  currentBet: number;
  players: [PlayerPublic, PlayerPublic];
  serverTime: number;
}

export interface S2C_Street {
  type: 'STREET';
  street: Street;
  communityCards: Card[];
  pot: number;
  currentBet: number;
  serverTime: number;
}

export interface S2C_Result {
  type: 'RESULT';
  result: HandResult;
  players: [PlayerPublic, PlayerPublic];
  communityCards: Card[];
  revealedCards: {
    seat0: [Card, Card] | null;
    seat1: [Card, Card] | null;
  };
  serverTime: number;
}

export interface S2C_Error {
  type: 'ERROR';
  message: string;
  code: string;
}

export interface S2C_Pong {
  type: 'PONG';
  clientTime: number;
  serverTime: number;
}

export interface S2C_PlayerJoined {
  type: 'PLAYER_JOINED';
  player: PlayerPublic;
  seatIndex: 0 | 1;
}

export interface S2C_PlayerLeft {
  type: 'PLAYER_LEFT';
  playerId: string;
  seatIndex: 0 | 1;
}

export interface S2C_SettingsUpdated {
  type: 'SETTINGS_UPDATED';
  settings: TableSettings;
}

export interface S2C_PlayerUpdated {
  type: 'PLAYER_UPDATED';
  player: PlayerPublic;
  seatIndex: 0 | 1;
}

export interface S2C_PlayersUpdate {
  type: 'PLAYERS_UPDATE';
  players: [PlayerPublic, PlayerPublic];
  pot: number;
  serverTime: number;
}

export interface S2C_CardsShown {
  type: 'CARDS_SHOWN';
  playerId: string;
  seatIndex: 0 | 1;
  cards: [Card, Card];
}

export interface S2C_AllInShowdown {
  type: 'ALL_IN_SHOWDOWN';
  revealedCards: {
    seat0: [Card, Card] | null;
    seat1: [Card, Card] | null;
  };
  serverTime: number;
}

export interface S2C_PlayerReady {
  type: 'PLAYER_READY';
  seatIndex: 0 | 1;
  isReady: boolean;
}

export interface S2C_OwnerLeft {
  type: 'OWNER_LEFT';
}

export type S2CMessage =
  | S2C_RoomState
  | S2C_HandStart
  | S2C_Turn
  | S2C_Tick
  | S2C_ActionConfirm
  | S2C_Street
  | S2C_Result
  | S2C_Error
  | S2C_Pong
  | S2C_PlayerJoined
  | S2C_PlayerLeft
  | S2C_SettingsUpdated
  | S2C_PlayerUpdated
  | S2C_PlayersUpdate
  | S2C_CardsShown
  | S2C_AllInShowdown
  | S2C_PlayerReady
  | S2C_OwnerLeft;
