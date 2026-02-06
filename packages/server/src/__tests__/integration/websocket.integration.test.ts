/**
 * WebSocket Integration Tests
 *
 * Tests real WebSocket connections, room creation, and player joining.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import {
  createTestServer,
  createTestClient,
  type TestServer,
  type TestClient,
  sleep,
} from './testUtils';

describe('WebSocket Integration', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Connection', () => {
    let client: TestClient;

    afterEach(() => {
      client?.close();
    });

    it('should establish WebSocket connection', async () => {
      client = await createTestClient(server.port);
      expect(client.ws.readyState).toBe(1); // OPEN
    });

    it('should respond to PING with PONG', async () => {
      client = await createTestClient(server.port);
      const now = Date.now();

      client.ping();
      const pong = await client.waitForMessage('PONG');

      expect(pong.type).toBe('PONG');
      expect(pong.clientTime).toBeGreaterThanOrEqual(now);
      expect(pong.serverTime).toBeGreaterThan(0);
    });
  });

  describe('Room Creation', () => {
    it('should create a room via HTTP API', async () => {
      const roomId = await server.createRoom();
      expect(roomId).toBeDefined();
      expect(typeof roomId).toBe('string');
      expect(roomId.length).toBeGreaterThan(0);
    });

    it('should allow querying room status', async () => {
      const roomId = await server.createRoom();

      const res = await fetch(`${server.baseUrl}/api/rooms/${roomId}`);
      const data = (await res.json()) as { roomId: string; playerCount: number };

      expect(res.status).toBe(200);
      expect(data.roomId).toBe(roomId);
      expect(data.playerCount).toBe(0);
    });

    it('should return 404 for non-existent room', async () => {
      const res = await fetch(`${server.baseUrl}/api/rooms/nonexistent`);
      expect(res.status).toBe(404);
    });
  });

  describe('Joining Room', () => {
    let client1: TestClient;
    let client2: TestClient;

    afterEach(() => {
      client1?.close();
      client2?.close();
    });

    it('should join a room and receive ROOM_STATE', async () => {
      const roomId = await server.createRoom();
      client1 = await createTestClient(server.port);

      const roomState = await client1.join(roomId, 'TestPlayer');

      expect(roomState.type).toBe('ROOM_STATE');
      expect(roomState.roomId).toBe(roomId);
      expect(roomState.yourSeatIndex).toBe(0);
      expect(roomState.yourPlayerId).toBeDefined();
      expect(client1.playerId).toBe(roomState.yourPlayerId);
      expect(client1.seatIndex).toBe(0);
    });

    it('should assign second player to seat 1', async () => {
      const roomId = await server.createRoom();

      client1 = await createTestClient(server.port);
      client2 = await createTestClient(server.port);

      await client1.join(roomId, 'Player1');
      const roomState2 = await client2.join(roomId, 'Player2');

      expect(roomState2.yourSeatIndex).toBe(1);
      expect(client2.seatIndex).toBe(1);
    });

    it('should broadcast PLAYER_JOINED to existing players', async () => {
      const roomId = await server.createRoom();

      client1 = await createTestClient(server.port);
      await client1.join(roomId, 'Player1');
      client1.clearMessages();

      client2 = await createTestClient(server.port);
      await client2.join(roomId, 'Player2');

      // Wait for player1 to receive the notification
      const playerJoined = await client1.waitForMessage('PLAYER_JOINED');

      expect(playerJoined.type).toBe('PLAYER_JOINED');
      expect(playerJoined.seatIndex).toBe(1);
      expect(playerJoined.player.alias).toBe('Player2');
    });

    it('should receive ERROR when joining non-existent room', async () => {
      client1 = await createTestClient(server.port);

      client1.send({ type: 'JOIN', roomId: 'nonexistent', alias: 'Test' });
      const error = await client1.waitForMessage('ERROR');

      expect(error.type).toBe('ERROR');
      expect(error.code).toBe('ROOM_NOT_FOUND');
    });

    it('should receive ERROR when room is full', async () => {
      const roomId = await server.createRoom();

      client1 = await createTestClient(server.port);
      client2 = await createTestClient(server.port);
      const client3 = await createTestClient(server.port);

      await client1.join(roomId, 'Player1');
      await client2.join(roomId, 'Player2');

      client3.send({ type: 'JOIN', roomId, alias: 'Player3' });
      const error = await client3.waitForMessage('ERROR');

      expect(error.type).toBe('ERROR');
      expect(error.code).toBe('JOIN_FAILED');

      client3.close();
    });
  });

  describe('Ready State', () => {
    let client1: TestClient;
    let client2: TestClient;

    afterEach(() => {
      client1?.close();
      client2?.close();
    });

    it('should broadcast PLAYER_READY when player clicks ready', async () => {
      const roomId = await server.createRoom();

      client1 = await createTestClient(server.port);
      client2 = await createTestClient(server.port);

      await client1.join(roomId, 'Player1');
      await client2.join(roomId, 'Player2');

      client1.clearMessages();
      client2.clearMessages();

      client2.ready();

      // Both should receive PLAYER_READY
      const ready1 = await client1.waitForMessage('PLAYER_READY');
      const ready2 = await client2.waitForMessage('PLAYER_READY');

      expect(ready1.seatIndex).toBe(1);
      expect(ready1.isReady).toBe(true);
      expect(ready2.seatIndex).toBe(1);
    });
  });

  describe('Game Start', () => {
    let client1: TestClient;
    let client2: TestClient;

    afterEach(() => {
      client1?.close();
      client2?.close();
    });

    it('should start game when owner starts and opponent is ready', async () => {
      const roomId = await server.createRoom();

      client1 = await createTestClient(server.port);
      client2 = await createTestClient(server.port);

      await client1.join(roomId, 'Player1');
      await client2.join(roomId, 'Player2');

      client2.ready();
      await sleep(50);

      client1.clearMessages();
      client2.clearMessages();

      client1.start();

      const handStart1 = await client1.waitForMessage('HAND_START');
      const handStart2 = await client2.waitForMessage('HAND_START');

      expect(handStart1.type).toBe('HAND_START');
      expect(handStart1.handNumber).toBe(1);
      expect(handStart1.holeCards).toHaveLength(2);
      expect(handStart2.holeCards).toHaveLength(2);

      // Each player should have different hole cards
      expect(handStart1.holeCards).not.toEqual(handStart2.holeCards);
    });

    it('should not allow non-owner to start game', async () => {
      const roomId = await server.createRoom();

      client1 = await createTestClient(server.port);
      client2 = await createTestClient(server.port);

      await client1.join(roomId, 'Player1');
      await client2.join(roomId, 'Player2');

      client1.ready();
      await sleep(50);

      client2.clearMessages();
      client2.start(); // Player 2 (non-owner) tries to start

      const error = await client2.waitForMessage('ERROR');
      expect(error.code).toBe('START_FAILED');
    });

    it('should allow force start without opponent ready', async () => {
      const roomId = await server.createRoom();

      client1 = await createTestClient(server.port);
      client2 = await createTestClient(server.port);

      await client1.join(roomId, 'Player1');
      await client2.join(roomId, 'Player2');

      // Player 2 does NOT ready
      client1.clearMessages();
      client2.clearMessages();

      client1.start(true); // Force start

      const handStart = await client1.waitForMessage('HAND_START');
      expect(handStart.handNumber).toBe(1);
    });
  });

  describe('Disconnect Handling', () => {
    let client1: TestClient;
    let client2: TestClient;

    afterEach(() => {
      client1?.close();
      client2?.close();
    });

    it('should notify opponent when player disconnects', async () => {
      const roomId = await server.createRoom();

      client1 = await createTestClient(server.port);
      client2 = await createTestClient(server.port);

      await client1.join(roomId, 'Player1');
      await client2.join(roomId, 'Player2');

      client1.clearMessages();

      client2.close();

      const playerLeft = await client1.waitForMessage('PLAYER_LEFT');
      expect(playerLeft.seatIndex).toBe(1);
    });

    it('should notify joiner when owner disconnects (OWNER_LEFT)', async () => {
      const roomId = await server.createRoom();

      client1 = await createTestClient(server.port);
      client2 = await createTestClient(server.port);

      await client1.join(roomId, 'Player1');
      await client2.join(roomId, 'Player2');

      client2.clearMessages();

      client1.close();

      const ownerLeft = await client2.waitForMessage('OWNER_LEFT');
      expect(ownerLeft.type).toBe('OWNER_LEFT');
    });
  });

  describe('Settings', () => {
    let client1: TestClient;
    let client2: TestClient;

    afterEach(() => {
      client1?.close();
      client2?.close();
    });

    it('should allow owner to update settings', async () => {
      const roomId = await server.createRoom();

      client1 = await createTestClient(server.port);
      client2 = await createTestClient(server.port);

      await client1.join(roomId, 'Player1');
      await client2.join(roomId, 'Player2');

      client1.clearMessages();
      client2.clearMessages();

      client1.send({
        type: 'UPDATE_SETTINGS',
        settings: { smallBlind: 5, bigBlind: 10, initialTimeBank: 600 },
      });

      const settings1 = await client1.waitForMessage('SETTINGS_UPDATED');
      const settings2 = await client2.waitForMessage('SETTINGS_UPDATED');

      expect(settings1.settings.smallBlind).toBe(5);
      expect(settings1.settings.bigBlind).toBe(10);
      expect(settings1.settings.initialTimeBank).toBe(600);
      expect(settings2.settings).toEqual(settings1.settings);
    });

    it('should not allow joiner to update settings', async () => {
      const roomId = await server.createRoom();

      client1 = await createTestClient(server.port);
      client2 = await createTestClient(server.port);

      await client1.join(roomId, 'Player1');
      await client2.join(roomId, 'Player2');

      client2.clearMessages();

      client2.send({
        type: 'UPDATE_SETTINGS',
        settings: { smallBlind: 5 },
      });

      const error = await client2.waitForMessage('ERROR');
      expect(error.code).toBe('SETTINGS_FAILED');
    });
  });
});
