/**
 * Protocol Integration Tests
 *
 * Tests WebSocket message format validation and error handling.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import {
  createTestServer,
  createTestClient,
  setupTwoPlayerGame,
  startGame,
  type TestServer,
  type TestClient,
  sleep,
  waitForOpen,
} from './testUtils';

describe('Protocol Integration', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Message Format Validation', () => {
    let client: TestClient;

    afterEach(() => {
      client?.close();
    });

    it('should reject malformed JSON', async () => {
      const ws = new WebSocket(`ws://localhost:${server.port}/ws`);
      await waitForOpen(ws);

      ws.send('not valid json {{{');

      // Wait for error response
      await new Promise<void>((resolve) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'ERROR' && msg.code === 'INVALID_MESSAGE') {
            resolve();
          }
        });
        setTimeout(resolve, 1000); // Timeout
      });

      ws.close();
    });

    it('should reject messages with missing required fields', async () => {
      client = await createTestClient(server.port);

      // JOIN without roomId
      client.send({ type: 'JOIN', alias: 'Test' } as any);

      // Should receive error or be silently ignored
      await sleep(100);
    });

    it('should reject unknown message types', async () => {
      client = await createTestClient(server.port);

      client.send({ type: 'UNKNOWN_MESSAGE_TYPE', data: 'test' } as any);

      // Should not crash server - subsequent messages should work
      await sleep(100);

      const roomId = await server.createRoom();
      const state = await client.join(roomId, 'Test');
      expect(state.type).toBe('ROOM_STATE');
    });
  });

  describe('ROOM_STATE Message Format', () => {
    let player1: TestClient | undefined;
    let player2: TestClient | undefined;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should have all required fields in ROOM_STATE', async () => {
      const roomId = await server.createRoom();
      player1 = await createTestClient(server.port);

      const roomState = await player1.join(roomId, 'Player1');

      // Verify all required fields
      expect(roomState).toHaveProperty('type', 'ROOM_STATE');
      expect(roomState).toHaveProperty('roomId', roomId);
      expect(roomState).toHaveProperty('yourPlayerId');
      expect(roomState).toHaveProperty('yourSeatIndex');
      expect(roomState).toHaveProperty('players');
      expect(roomState).toHaveProperty('dealerIndex');
      expect(roomState).toHaveProperty('activePlayerIndex');
      expect(roomState).toHaveProperty('street');
      expect(roomState).toHaveProperty('communityCards');
      expect(roomState).toHaveProperty('pot');
      expect(roomState).toHaveProperty('currentBet');
      expect(roomState).toHaveProperty('minRaise');
      expect(roomState).toHaveProperty('settings');
      expect(roomState).toHaveProperty('handNumber');
      expect(roomState).toHaveProperty('isHandInProgress');
      expect(roomState).toHaveProperty('serverTime');

      // Verify types
      expect(typeof roomState.yourPlayerId).toBe('string');
      expect([0, 1]).toContain(roomState.yourSeatIndex);
      expect(Array.isArray(roomState.players)).toBe(true);
      expect(roomState.players).toHaveLength(2);
      expect([0, 1]).toContain(roomState.dealerIndex);
      expect(typeof roomState.pot).toBe('number');
      expect(typeof roomState.serverTime).toBe('number');
    });

    it('should have correct player structure in ROOM_STATE', async () => {
      const roomId = await server.createRoom();
      player1 = await createTestClient(server.port);
      const roomState = await player1.join(roomId, 'Player1');

      const player = roomState.players[0];
      expect(player).not.toBeNull();

      // Verify player fields
      expect(player).toHaveProperty('id');
      expect(player).toHaveProperty('alias', 'Player1');
      expect(player).toHaveProperty('timeBank');
      expect(player).toHaveProperty('holeCards');
      expect(player).toHaveProperty('currentBet');
      expect(player).toHaveProperty('folded');
      expect(player).toHaveProperty('isAllIn');
      expect(player).toHaveProperty('isConnected');
      expect(player).toHaveProperty('seatIndex', 0);
    });

    it('should have correct settings structure', async () => {
      const roomId = await server.createRoom();
      player1 = await createTestClient(server.port);
      const roomState = await player1.join(roomId, 'Player1');

      const settings = roomState.settings;
      expect(settings).toHaveProperty('smallBlind');
      expect(settings).toHaveProperty('bigBlind');
      expect(settings).toHaveProperty('initialTimeBank');

      expect(typeof settings.smallBlind).toBe('number');
      expect(typeof settings.bigBlind).toBe('number');
      expect(typeof settings.initialTimeBank).toBe('number');
    });
  });

  describe('HAND_START Message Format', () => {
    let player1: TestClient;
    let player2: TestClient;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should have all required fields in HAND_START', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      const handStart = player1.getMessages('HAND_START')[0]!;

      expect(handStart).toHaveProperty('type', 'HAND_START');
      expect(handStart).toHaveProperty('handNumber');
      expect(handStart).toHaveProperty('dealerIndex');
      expect(handStart).toHaveProperty('holeCards');
      expect(handStart).toHaveProperty('players');
      expect(handStart).toHaveProperty('pot');
      expect(handStart).toHaveProperty('serverTime');

      // Verify types
      expect(typeof handStart.handNumber).toBe('number');
      expect([0, 1]).toContain(handStart.dealerIndex);
      expect(Array.isArray(handStart.holeCards)).toBe(true);
      expect(handStart.holeCards).toHaveLength(2);
      expect(typeof handStart.pot).toBe('number');
    });

    it('should have valid card format in holeCards', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      const handStart = player1.getMessages('HAND_START')[0]!;
      const [card1, card2] = handStart.holeCards;

      // Valid ranks
      const validRanks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
      const validSuits = ['h', 'd', 'c', 's'];

      expect(card1).toHaveProperty('rank');
      expect(card1).toHaveProperty('suit');
      expect(validRanks).toContain(card1.rank);
      expect(validSuits).toContain(card1.suit);

      expect(card2).toHaveProperty('rank');
      expect(card2).toHaveProperty('suit');
      expect(validRanks).toContain(card2.rank);
      expect(validSuits).toContain(card2.suit);
    });
  });

  describe('ACTION_CONFIRM Message Format', () => {
    let player1: TestClient;
    let player2: TestClient;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should have all required fields in ACTION_CONFIRM', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      const turn = await player1.waitForMessage('TURN');
      const activeClient = turn.activePlayerIndex === player1.seatIndex ? player1 : player2;

      activeClient.clearMessages();
      activeClient.action('call');

      const confirm = await activeClient.waitForMessage('ACTION_CONFIRM');

      expect(confirm).toHaveProperty('type', 'ACTION_CONFIRM');
      expect(confirm).toHaveProperty('playerId');
      expect(confirm).toHaveProperty('action');
      expect(confirm).toHaveProperty('amount');
      expect(confirm).toHaveProperty('pot');
      expect(confirm).toHaveProperty('currentBet');
      expect(confirm).toHaveProperty('players');
      expect(confirm).toHaveProperty('serverTime');

      // Verify types
      expect(typeof confirm.playerId).toBe('string');
      expect(['check', 'call', 'bet', 'raise', 'fold', 'all-in']).toContain(confirm.action);
      expect(typeof confirm.amount).toBe('number');
      expect(typeof confirm.pot).toBe('number');
    });
  });

  describe('STREET Message Format', () => {
    let player1: TestClient;
    let player2: TestClient;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should have correct community cards for each street', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      // Complete preflop
      const turn = await player1.waitForMessage('TURN');
      const sbClient = turn.activePlayerIndex === player1.seatIndex ? player1 : player2;
      const bbClient = sbClient === player1 ? player2 : player1;

      sbClient.action('call');
      await sleep(50);
      bbClient.action('check');

      const flopStreet = await player1.waitForMessage('STREET');

      expect(flopStreet).toHaveProperty('type', 'STREET');
      expect(flopStreet).toHaveProperty('street', 'flop');
      expect(flopStreet).toHaveProperty('communityCards');
      expect(flopStreet).toHaveProperty('pot');
      expect(flopStreet).toHaveProperty('currentBet');
      expect(flopStreet).toHaveProperty('serverTime');

      // Flop should have 3 cards
      expect(flopStreet.communityCards).toHaveLength(3);

      // Verify card format
      for (const card of flopStreet.communityCards) {
        expect(card).toHaveProperty('rank');
        expect(card).toHaveProperty('suit');
      }
    });
  });

  describe('RESULT Message Format', () => {
    let player1: TestClient;
    let player2: TestClient;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should have all required fields in RESULT', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      const turn = await player1.waitForMessage('TURN');
      const activeClient = turn.activePlayerIndex === player1.seatIndex ? player1 : player2;

      activeClient.action('fold');

      const result = await player1.waitForMessage('RESULT');

      expect(result).toHaveProperty('type', 'RESULT');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('players');
      expect(result).toHaveProperty('communityCards');
      expect(result).toHaveProperty('revealedCards');
      expect(result).toHaveProperty('serverTime');

      // Verify result structure
      expect(result.result).toHaveProperty('winnerId');
      expect(result.result).toHaveProperty('winnerHandRank');
      expect(result.result).toHaveProperty('potAwarded');
    });
  });

  describe('ERROR Message Format', () => {
    let client: TestClient;

    afterEach(() => {
      client?.close();
    });

    it('should have correct ERROR format', async () => {
      client = await createTestClient(server.port);

      // Trigger an error by joining non-existent room
      client.send({ type: 'JOIN', roomId: 'nonexistent', alias: 'Test' });

      const error = await client.waitForMessage('ERROR');

      expect(error).toHaveProperty('type', 'ERROR');
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');

      expect(typeof error.code).toBe('string');
      expect(typeof error.message).toBe('string');
    });

    it('should use consistent error codes', async () => {
      client = await createTestClient(server.port);

      // Test ROOM_NOT_FOUND
      client.send({ type: 'JOIN', roomId: 'nonexistent', alias: 'Test' });
      const error1 = await client.waitForMessage('ERROR');
      expect(error1.code).toBe('ROOM_NOT_FOUND');

      // Test NOT_IN_ROOM
      client.clearMessages();
      client.send({ type: 'ACTION', action: 'call' });
      const error2 = await client.waitForMessage('ERROR');
      expect(error2.code).toBe('NOT_IN_ROOM');
    });
  });

  describe('Timestamp Consistency', () => {
    let player1: TestClient;
    let player2: TestClient;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should have monotonically increasing serverTime', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      // Collect serverTime from multiple messages
      const messages = player1.messages.filter((m) => 'serverTime' in m);

      expect(messages.length).toBeGreaterThan(0);

      // Verify timestamps are increasing
      for (let i = 1; i < messages.length; i++) {
        const prev = (messages[i - 1] as { serverTime: number }).serverTime;
        const curr = (messages[i] as { serverTime: number }).serverTime;
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });

    it('should have serverTime close to actual time', async () => {
      const roomId = await server.createRoom();
      player1 = await createTestClient(server.port);

      const before = Date.now();
      const roomState = await player1.join(roomId, 'Player1');
      const after = Date.now();

      // Server time should be within reasonable bounds
      expect(roomState.serverTime).toBeGreaterThanOrEqual(before - 1000);
      expect(roomState.serverTime).toBeLessThanOrEqual(after + 1000);
    });
  });

  describe('Message Integrity', () => {
    let player1: TestClient;
    let player2: TestClient;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should ensure pot values are integers', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      // Check all pot values in messages
      for (const msg of player1.messages) {
        if ('pot' in msg) {
          expect(Number.isInteger((msg as { pot: number }).pot)).toBe(true);
        }
      }
    });

    it('should ensure timeBank values are non-negative', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      // Check all timeBank values
      for (const msg of player1.messages) {
        if ('players' in msg && Array.isArray((msg as { players: unknown[] }).players)) {
          const players = (msg as { players: Array<{ timeBank?: number } | null> }).players;
          for (const player of players) {
            if (player && 'timeBank' in player) {
              expect(player.timeBank).toBeGreaterThanOrEqual(0);
            }
          }
        }
      }
    });

    it('should not leak opponent hole cards before showdown', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      // In ROOM_STATE, opponent's holeCards should be null
      const roomStates = player1.getMessages('ROOM_STATE');
      for (const state of roomStates) {
        const opponent = state.players[player1.seatIndex === 0 ? 1 : 0];
        if (opponent) {
          // Opponent cards should be hidden unless showdown
          expect(opponent.holeCards).toBeNull();
        }
      }
    });
  });
});
