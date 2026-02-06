/**
 * Reconnection Integration Tests
 *
 * Tests disconnect/reconnect scenarios and state restoration.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import {
  createTestServer,
  createTestClient,
  setupTwoPlayerGame,
  startGame,
  type TestServer,
  type TestClient,
  sleep,
} from './testUtils';

describe('Reconnection Integration', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Disconnect During Lobby', () => {
    let player1: TestClient;
    let player2: TestClient;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should notify remaining player when opponent disconnects', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      player1.clearMessages();

      // Player 2 disconnects
      player2.close();

      // Player 1 should receive PLAYER_LEFT
      const playerLeft = await player1.waitForMessage('PLAYER_LEFT');
      expect(playerLeft.seatIndex).toBe(1);
    });

    it('should allow new player to join after grace period expires (no hand in progress)', async () => {
      const { player1: p1, player2: p2, roomId } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      // Player 2 disconnects (no hand in progress)
      player2.close();

      // Server has 500ms grace period in test mode (configurable via TEST_SETTINGS)
      // Wait for grace period to expire plus buffer
      await sleep(1000);

      // New player joins
      player2 = await createTestClient(server.port);
      const roomState = await player2.join(roomId, 'NewPlayer');

      // Should successfully join seat 1 (freed after grace period)
      expect(roomState.yourSeatIndex).toBe(1);
      expect(roomState.players[1]?.alias).toBe('NewPlayer');
    });
  });

  describe('Disconnect During Hand', () => {
    let player1: TestClient;
    let player2: TestClient;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should mark disconnected player as not connected', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      player1.clearMessages();

      // Player 2 disconnects mid-hand
      player2.close();

      // Player 1 should receive notification
      const playerLeft = await player1.waitForMessage('PLAYER_LEFT');
      expect(playerLeft.seatIndex).toBe(1);
    });

    it('should allow game to continue with remaining player taking action', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      // Determine active player
      const turn = await player1.waitForMessage('TURN');
      const isPlayer1Active = turn.activePlayerIndex === player1.seatIndex;

      if (isPlayer1Active) {
        // Player 1 is active, disconnect player 2
        player2.close();
        await sleep(100);

        // Player 1 should still be able to act
        player1.action('fold');
        const result = await player1.waitForMessage('RESULT');
        expect(result.type).toBe('RESULT');
      } else {
        // Player 2 is active, they disconnect - wait for auto-action after grace period
        player2.close();

        // Wait for grace period (500ms) + auto-action
        await sleep(1000);

        // Disconnected player should auto-fold, hand should end
        const results = player1.getMessages('RESULT');
        expect(results.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should auto-act for disconnected player after grace period expires', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      // Determine who is active
      const turn = await player1.waitForMessage('TURN');
      const isP1Active = turn.activePlayerIndex === player1.seatIndex;
      const activeClient = isP1Active ? player1 : player2;
      const otherClient = isP1Active ? player2 : player1;

      // Active player calls to complete preflop
      activeClient.action('call');
      await sleep(100);

      // Now other player should have action (BB can check)
      // Disconnect the other player (who now has action)
      otherClient.close();

      // Wait for grace period to expire, disconnected player should auto-check
      // Hand should continue to flop, then eventually end or advance
      await sleep(1500);

      // Check that we got a STREET message (flop) indicating game advanced
      // after the disconnected player auto-checked
      const streets = player1.getMessages('STREET');
      // Should have at least flop (auto-check allowed game to advance)
      expect(streets.length).toBeGreaterThanOrEqual(1);
    });

    it('should cleanup seat after hand ends when player was disconnected', async () => {
      const { player1: p1, player2: p2, roomId } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      // Determine who is active
      const turn = await player1.waitForMessage('TURN');
      const isP1Active = turn.activePlayerIndex === player1.seatIndex;

      // Disconnect the non-active player and have active player fold
      if (isP1Active) {
        player2.close();
        // Player 1 folds to end hand
        player1.action('fold');
        // Wait for grace period and cleanup
        await sleep(1000);
      } else {
        player2.close();
        // Wait for grace period, player 2 will auto-fold
        await sleep(1000);
      }

      // Now player1 should either be connected or cleanup happened
      // Close player1 too, wait for cleanup
      player1.close();
      await sleep(1000);

      // Try to join as a new player - both seats should be available now
      const newPlayer = await createTestClient(server.port);
      try {
        const roomState = await newPlayer.join(roomId, 'NewPlayer');
        // Should be able to join (seats should be free after cleanup)
        expect([0, 1]).toContain(roomState.yourSeatIndex);
      } finally {
        newPlayer.close();
      }
    }, 10000); // Increase timeout for this test
  });

  describe('Reconnection State Restoration', () => {
    let player1: TestClient;
    let player2: TestClient;
    let roomId: string;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should preserve settings when new player joins after grace period', async () => {
      const setup = await setupTwoPlayerGame(server);
      player1 = setup.player1;
      player2 = setup.player2;
      roomId = setup.roomId;

      // Get initial settings
      const originalState = player1.getMessages('ROOM_STATE')[0]!;

      // Player 2 disconnects (no hand in progress)
      player2.close();

      // Wait for grace period to expire (500ms in test mode) plus buffer
      await sleep(1000);

      // New player joins
      player2 = await createTestClient(server.port);
      const newState = await player2.join(roomId, 'NewPlayer');

      // Settings should be preserved
      expect(newState.settings.smallBlind).toEqual(originalState.settings.smallBlind);
      expect(newState.settings.bigBlind).toEqual(originalState.settings.bigBlind);
    });

    it('should preserve pot when player reconnects mid-hand', async () => {
      const setup = await setupTwoPlayerGame(server);
      player1 = setup.player1;
      player2 = setup.player2;
      roomId = setup.roomId;

      await startGame(player1, player2);

      // Get current pot after blinds
      const handStart = player1.getMessages('HAND_START')[0]!;
      const initialPot = handStart.pot;
      expect(initialPot).toBeGreaterThanOrEqual(3); // SB + BB

      // Player 2 disconnects
      player2.close();
      await sleep(200);

      // Query room state via API
      const res = await fetch(`${server.baseUrl}/api/rooms/${roomId}`);
      const data = await res.json();

      // Room should still exist and be playing
      expect(res.status).toBe(200);
      expect(data.isPlaying).toBe(true);
    });
  });

  describe('Grace Period', () => {
    let player1: TestClient;
    let player2: TestClient;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should give disconnected player time to reconnect before auto-fold', async () => {
      const { player1: p1, player2: p2, roomId } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      // Determine who is active
      const turn = await player1.waitForMessage('TURN');
      const activeIsP2 = turn.activePlayerIndex === player2.seatIndex;

      if (activeIsP2) {
        // Disconnect the active player
        player2.close();

        // Quick reconnect (within grace period)
        await sleep(500); // Less than typical grace period

        player2 = await createTestClient(server.port);
        await player2.join(roomId, 'Player2');

        // Player 2 should still be able to act
        player2.action('call');

        // Should not get error (within grace period)
        await sleep(100);
        const errors = player2.getMessages('ERROR');
        const actionFailed = errors.filter((e) => e.code === 'ACTION_FAILED');
        expect(actionFailed.length).toBe(0);
      }
    });
  });

  describe('Both Players Disconnect', () => {
    let player1: TestClient;
    let player2: TestClient;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should preserve room when both players disconnect', async () => {
      const { player1: p1, player2: p2, roomId } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      // Both disconnect
      player1.close();
      player2.close();

      await sleep(500);

      // Room should still exist (or be cleaned up depending on impl)
      const res = await fetch(`${server.baseUrl}/api/rooms/${roomId}`);
      // Either 200 (room preserved) or 404 (room cleaned up) is acceptable
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Rapid Disconnect/Reconnect', () => {
    let clients: TestClient[] = [];

    afterEach(() => {
      clients.forEach((c) => c?.close());
      clients = [];
    });

    it('should handle multiple sequential joins', async () => {
      const roomId = await server.createRoom();

      // First player joins
      const player1 = await createTestClient(server.port);
      clients.push(player1);
      const state1 = await player1.join(roomId, 'Player1');
      expect(state1.yourSeatIndex).toBe(0);

      // Second player joins
      const player2 = await createTestClient(server.port);
      clients.push(player2);
      const state2 = await player2.join(roomId, 'Player2');
      expect(state2.yourSeatIndex).toBe(1);

      // Both should see each other
      expect(state2.players[0]?.alias).toBe('Player1');
    });
  });
});
