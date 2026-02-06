/**
 * Integration Test Utilities
 *
 * Helpers for creating real WebSocket connections and testing the server.
 */

import { WebSocket } from 'ws';
import type { Server } from 'http';
import type { S2CMessage, C2SMessage, S2C_RoomState, S2C_ActionConfirm } from '@blitz-holdem/common';

export interface TestClient {
  ws: WebSocket;
  messages: S2CMessage[];
  playerId: string | null;
  seatIndex: 0 | 1 | null;

  // Message sending
  send: (message: C2SMessage) => void;
  join: (roomId: string, alias: string) => Promise<S2C_RoomState>;
  ready: () => void;
  start: (force?: boolean) => void;
  action: (action: string, amount?: number) => void;
  showCards: () => void;
  ping: () => void;

  // Message receiving
  waitForMessage: <T extends S2CMessage['type']>(
    type: T,
    timeout?: number
  ) => Promise<Extract<S2CMessage, { type: T }>>;
  getMessages: <T extends S2CMessage['type']>(type: T) => Extract<S2CMessage, { type: T }>[];
  clearMessages: () => void;

  // Lifecycle
  close: () => void;
}

/**
 * Wait for WebSocket to open
 */
export function waitForOpen(ws: WebSocket, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error('WebSocket connection timeout'));
    }, timeout);

    ws.once('open', () => {
      clearTimeout(timer);
      resolve();
    });

    ws.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Create a test client that connects to the server
 */
export async function createTestClient(port: number, autoConnect = true): Promise<TestClient> {
  const ws = new WebSocket(`ws://localhost:${port}/ws`);
  const messages: S2CMessage[] = [];
  const allMessages: S2CMessage[] = []; // Keep track of all messages (never consumed)
  let playerId: string | null = null;
  let seatIndex: 0 | 1 | null = null;

  // Message listeners waiting for specific types
  const messageWaiters: Map<string, (msg: S2CMessage) => void> = new Map();

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString()) as S2CMessage;
      messages.push(msg);
      allMessages.push(msg);

      // Extract player info from ROOM_STATE
      if (msg.type === 'ROOM_STATE') {
        playerId = msg.yourPlayerId;
        seatIndex = msg.yourSeatIndex;
      }

      // Notify any waiters
      const waiterKey = msg.type;
      const waiter = messageWaiters.get(waiterKey);
      if (waiter) {
        messageWaiters.delete(waiterKey);
        waiter(msg);
      }
    } catch (err) {
      console.error('Failed to parse message:', err);
    }
  });

  if (autoConnect) {
    await waitForOpen(ws);
  }

  const client: TestClient = {
    ws,
    messages: allMessages, // Expose all messages for getMessages
    get playerId() {
      return playerId;
    },
    get seatIndex() {
      return seatIndex;
    },

    send(message: C2SMessage) {
      ws.send(JSON.stringify(message));
    },

    async join(roomId: string, alias: string): Promise<S2C_RoomState> {
      client.send({ type: 'JOIN', roomId, alias });
      return client.waitForMessage('ROOM_STATE');
    },

    ready() {
      client.send({ type: 'READY' });
    },

    start(force = false) {
      client.send({ type: 'START', force });
    },

    action(action: string, amount?: number) {
      client.send({
        type: 'ACTION',
        action: action as S2C_ActionConfirm['action'],
        amount,
      } as C2SMessage);
    },

    showCards() {
      client.send({ type: 'SHOW_CARDS' });
    },

    ping() {
      client.send({ type: 'PING', clientTime: Date.now() });
    },

    waitForMessage<T extends S2CMessage['type']>(
      type: T,
      timeout = 5000
    ): Promise<Extract<S2CMessage, { type: T }>> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          messageWaiters.delete(type);
          reject(new Error(`Timeout waiting for message: ${type}`));
        }, timeout);

        // Function to check and resolve with matching message
        const checkMessages = () => {
          const idx = messages.findIndex((m) => m.type === type);
          if (idx !== -1) {
            const msg = messages.splice(idx, 1)[0];
            clearTimeout(timer);
            messageWaiters.delete(type);
            resolve(msg as Extract<S2CMessage, { type: T }>);
            return true;
          }
          return false;
        };

        // Check existing messages first
        if (checkMessages()) return;

        // Set up waiter for future messages
        messageWaiters.set(type, (msg) => {
          clearTimeout(timer);
          // Remove from consumable messages array
          const idx = messages.indexOf(msg);
          if (idx !== -1) messages.splice(idx, 1);
          resolve(msg as Extract<S2CMessage, { type: T }>);
        });
      });
    },

    getMessages<T extends S2CMessage['type']>(type: T): Extract<S2CMessage, { type: T }>[] {
      // Use allMessages so we can still read historical messages
      return allMessages.filter((m) => m.type === type) as Extract<S2CMessage, { type: T }>[];
    },

    clearMessages() {
      messages.length = 0;
      // Don't clear allMessages - that's for getMessages
    },

    close() {
      ws.close();
    },
  };

  return client;
}

/**
 * Create a test server instance
 */
export interface TestServer {
  server: Server;
  port: number;
  baseUrl: string;
  wsUrl: string;
  close: () => Promise<void>;
  createRoom: () => Promise<string>;
}

/**
 * Test-optimized settings with minimal delays for faster test execution
 */
export const TEST_SETTINGS = {
  runoutDelayMs: 100, // Fast runout (default 3000ms)
  nextHandDelayMs: 100, // Fast next hand (default 6000ms)
  disconnectGracePeriod: 500, // Shorter grace period for tests (default 5000ms)
};

export async function createTestServer(): Promise<TestServer> {
  // Dynamic import to avoid module issues
  const express = (await import('express')).default;
  const { createServer } = await import('http');
  const { setupWebSocket } = await import('../../ws');
  const { RoomManager } = await import('../../room');

  const app = express();
  app.use(express.json());

  // Create room manager with test-optimized settings
  const roomManager = new RoomManager(TEST_SETTINGS);

  app.post('/api/rooms', (_req, res) => {
    const roomId = roomManager.createRoom();
    res.json({ roomId, joinUrl: `/table/${roomId}` });
  });

  app.get('/api/rooms/:roomId', (req, res) => {
    const room = roomManager.getRoom(req.params.roomId);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json({
      roomId: room.id,
      playerCount: room.getPlayerCount(),
      isPlaying: room.isPlaying(),
    });
  });

  const server = createServer(app);
  setupWebSocket(server, roomManager);

  // Listen on random available port
  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  return {
    server,
    port,
    baseUrl: `http://localhost:${port}`,
    wsUrl: `ws://localhost:${port}/ws`,

    async close() {
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },

    async createRoom(): Promise<string> {
      const res = await fetch(`http://localhost:${port}/api/rooms`, {
        method: 'POST',
      });
      const data = (await res.json()) as { roomId: string };
      return data.roomId;
    },
  };
}

/**
 * Helper to wait for a specific condition
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 5000,
  interval = 50
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await sleep(interval);
  }
}

/**
 * Sleep helper
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to set up a game with two connected players
 */
export async function setupTwoPlayerGame(testServer: TestServer): Promise<{
  roomId: string;
  player1: TestClient;
  player2: TestClient;
}> {
  const roomId = await testServer.createRoom();

  const player1 = await createTestClient(testServer.port);
  const player2 = await createTestClient(testServer.port);

  await player1.join(roomId, 'Player1');
  await player2.join(roomId, 'Player2');

  return { roomId, player1, player2 };
}

/**
 * Helper to start a game between two players
 */
export async function startGame(player1: TestClient, player2: TestClient): Promise<void> {
  player2.ready();
  await sleep(50); // Let ready message process

  player1.clearMessages();
  player2.clearMessages();

  player1.start();

  // Wait for both to receive HAND_START
  await Promise.all([player1.waitForMessage('HAND_START'), player2.waitForMessage('HAND_START')]);
}
