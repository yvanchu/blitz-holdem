import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TableController } from '../table';
import { WebSocket } from 'ws';

// Mock WebSocket
function createMockWs(): WebSocket {
  return {
    readyState: WebSocket.OPEN,
    send: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeListener: vi.fn(),
    close: vi.fn(),
  } as unknown as WebSocket;
}

// Helper to get messages of a specific type
function getMessages(ws: WebSocket, type?: string) {
  const messages = (ws.send as ReturnType<typeof vi.fn>).mock.calls.map((call) =>
    JSON.parse(call[0] as string)
  );
  return type ? messages.filter((m) => m.type === type) : messages;
}

// Helper to clear mock calls
function clearMocks(...wsList: WebSocket[]) {
  wsList.forEach((ws) => (ws.send as ReturnType<typeof vi.fn>).mockClear());
}

describe('lobby', () => {
  let table: TableController;
  let ws1: WebSocket;
  let ws2: WebSocket;
  let player1Id: string;
  let player2Id: string;

  beforeEach(() => {
    table = new TableController('test-room');
    ws1 = createMockWs();
    ws2 = createMockWs();
  });

  describe('player ready', () => {
    beforeEach(() => {
      // Add two players
      const result1 = table.addPlayer(ws1, 'Player1');
      const result2 = table.addPlayer(ws2, 'Player2');
      player1Id = result1.playerId!;
      player2Id = result2.playerId!;
      clearMocks(ws1, ws2);
    });

    it('should broadcast PLAYER_READY when a player clicks ready', () => {
      table.setPlayerReady(player2Id);

      const ws1ReadyMsgs = getMessages(ws1, 'PLAYER_READY');
      const ws2ReadyMsgs = getMessages(ws2, 'PLAYER_READY');

      expect(ws1ReadyMsgs).toHaveLength(1);
      expect(ws2ReadyMsgs).toHaveLength(1);
      expect(ws1ReadyMsgs[0].seatIndex).toBe(1);
      expect(ws1ReadyMsgs[0].isReady).toBe(true);
    });

    it('should track ready state correctly', () => {
      expect(table.isOpponentReady()).toBe(false);

      table.setPlayerReady(player2Id);

      expect(table.isOpponentReady()).toBe(true);
    });

    it('should not auto-start the game when both players ready', () => {
      table.setPlayerReady(player1Id);
      table.setPlayerReady(player2Id);

      // Game should NOT start automatically
      expect(table.isPlaying()).toBe(false);
    });
  });

  describe('startGame', () => {
    beforeEach(() => {
      const result1 = table.addPlayer(ws1, 'Player1');
      const result2 = table.addPlayer(ws2, 'Player2');
      player1Id = result1.playerId!;
      player2Id = result2.playerId!;
      clearMocks(ws1, ws2);
    });

    it('should allow owner (seat 0) to start the game', () => {
      table.setPlayerReady(player2Id);

      const result = table.startGame(player1Id);

      expect(result.success).toBe(true);
      expect(table.isPlaying()).toBe(true);
    });

    it('should not allow joiner (seat 1) to start the game', () => {
      table.setPlayerReady(player1Id);

      const result = table.startGame(player2Id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the room creator can start the game');
      expect(table.isPlaying()).toBe(false);
    });

    it('should not start without 2 players', () => {
      // Create a new table with only 1 player
      const singleTable = new TableController('single-room');
      const singleWs = createMockWs();
      const singleResult = singleTable.addPlayer(singleWs, 'Solo');

      const result = singleTable.startGame(singleResult.playerId!);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Need 2 players to start');
    });

    it('should fail if opponent not ready and force=false', () => {
      // Player2 has NOT clicked ready
      const result = table.startGame(player1Id, false);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Opponent is not ready');
      expect(table.isPlaying()).toBe(false);
    });

    it('should allow force start even if opponent not ready', () => {
      // Player2 has NOT clicked ready
      const result = table.startGame(player1Id, true);

      expect(result.success).toBe(true);
      expect(table.isPlaying()).toBe(true);
    });

    it('should broadcast HAND_START to both players when game starts', () => {
      table.setPlayerReady(player2Id);
      clearMocks(ws1, ws2);

      table.startGame(player1Id);

      const ws1HandStart = getMessages(ws1, 'HAND_START');
      const ws2HandStart = getMessages(ws2, 'HAND_START');

      expect(ws1HandStart).toHaveLength(1);
      expect(ws2HandStart).toHaveLength(1);
      expect(ws1HandStart[0].handNumber).toBe(1);
    });

    it('should not start if game already in progress', () => {
      table.setPlayerReady(player2Id);
      table.startGame(player1Id);

      expect(table.isPlaying()).toBe(true);

      // Try to start again
      const result = table.startGame(player1Id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Game already in progress');
    });
  });

  describe('owner disconnect', () => {
    beforeEach(() => {
      const result1 = table.addPlayer(ws1, 'Player1');
      const result2 = table.addPlayer(ws2, 'Player2');
      player1Id = result1.playerId!;
      player2Id = result2.playerId!;
      clearMocks(ws1, ws2);
    });

    it('should broadcast OWNER_LEFT to joiner when owner disconnects', () => {
      table.handleDisconnect(player1Id);

      // Joiner should receive OWNER_LEFT
      const ws2OwnerLeft = getMessages(ws2, 'OWNER_LEFT');
      expect(ws2OwnerLeft).toHaveLength(1);

      // Owner should NOT receive OWNER_LEFT (they're the one leaving)
      const ws1OwnerLeft = getMessages(ws1, 'OWNER_LEFT');
      expect(ws1OwnerLeft).toHaveLength(0);
    });

    it('should not broadcast OWNER_LEFT when joiner disconnects', () => {
      table.handleDisconnect(player2Id);

      // Neither player should receive OWNER_LEFT
      const ws1OwnerLeft = getMessages(ws1, 'OWNER_LEFT');
      const ws2OwnerLeft = getMessages(ws2, 'OWNER_LEFT');

      expect(ws1OwnerLeft).toHaveLength(0);
      expect(ws2OwnerLeft).toHaveLength(0);
    });

    it('should broadcast PLAYER_LEFT when any player disconnects', () => {
      table.handleDisconnect(player2Id);

      const ws1PlayerLeft = getMessages(ws1, 'PLAYER_LEFT');
      const ws2PlayerLeft = getMessages(ws2, 'PLAYER_LEFT');

      expect(ws1PlayerLeft).toHaveLength(1);
      expect(ws2PlayerLeft).toHaveLength(1);
      expect(ws1PlayerLeft[0].seatIndex).toBe(1);
    });
  });

  describe('settings', () => {
    beforeEach(() => {
      const result1 = table.addPlayer(ws1, 'Player1');
      const result2 = table.addPlayer(ws2, 'Player2');
      player1Id = result1.playerId!;
      player2Id = result2.playerId!;
      clearMocks(ws1, ws2);
    });

    it('should allow owner to update settings', () => {
      const result = table.updateSettings(player1Id, {
        smallBlind: 5,
        bigBlind: 10,
        initialTimeBank: 600,
      });

      expect(result.success).toBe(true);

      // Both players should receive SETTINGS_UPDATED
      const ws1Settings = getMessages(ws1, 'SETTINGS_UPDATED');
      const ws2Settings = getMessages(ws2, 'SETTINGS_UPDATED');

      expect(ws1Settings).toHaveLength(1);
      expect(ws2Settings).toHaveLength(1);
      expect(ws1Settings[0].settings.smallBlind).toBe(5);
      expect(ws1Settings[0].settings.bigBlind).toBe(10);
      expect(ws1Settings[0].settings.initialTimeBank).toBe(600);
    });

    it('should not allow joiner to update settings', () => {
      const result = table.updateSettings(player2Id, {
        smallBlind: 5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the room creator can change settings');
    });

    it('should not allow settings change during a hand', () => {
      table.setPlayerReady(player2Id);
      table.startGame(player1Id);

      expect(table.isPlaying()).toBe(true);

      const result = table.updateSettings(player1Id, {
        smallBlind: 5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot change settings during a hand');
    });
  });
});
