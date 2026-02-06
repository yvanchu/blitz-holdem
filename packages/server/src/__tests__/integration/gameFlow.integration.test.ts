/**
 * Game Flow Integration Tests
 *
 * Tests complete hand lifecycle from deal to showdown with real WebSocket connections.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import {
  createTestServer,
  setupTwoPlayerGame,
  startGame,
  type TestServer,
  type TestClient,
  sleep,
} from './testUtils';

describe('Game Flow Integration', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Hand Start', () => {
    let player1: TestClient;
    let player2: TestClient;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should deal unique hole cards to each player', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      const handStart1 = player1.getMessages('HAND_START')[0]!;
      const handStart2 = player2.getMessages('HAND_START')[0]!;

      expect(handStart1.holeCards).toHaveLength(2);
      expect(handStart2.holeCards).toHaveLength(2);

      // Cards should be different
      const cards1Str = handStart1.holeCards.map((c) => `${c.rank}${c.suit}`).join(',');
      const cards2Str = handStart2.holeCards.map((c) => `${c.rank}${c.suit}`).join(',');
      expect(cards1Str).not.toBe(cards2Str);
    });

    it('should post blinds correctly', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      const handStart = player1.getMessages('HAND_START')[0]!;

      // Pot should have SB + BB (default: 1 + 2 = 3)
      expect(handStart.pot).toBe(3);

      // Players should have blinds deducted
      const dealerPlayer = handStart.players[handStart.dealerIndex];
      const bbPlayer = handStart.players[handStart.dealerIndex === 0 ? 1 : 0];

      // Dealer posts SB, other posts BB
      expect(dealerPlayer?.currentBet).toBe(1); // SB
      expect(bbPlayer?.currentBet).toBe(2); // BB
    });

    it('should set correct active player (SB acts first preflop)', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      // Wait for TURN message
      const turn1 = await player1.waitForMessage('TURN');

      // In heads-up, dealer (SB) acts first preflop
      const handStart = player1.getMessages('HAND_START')[0]!;
      expect(turn1.activePlayerIndex).toBe(handStart.dealerIndex);
    });
  });

  describe('Betting Actions', () => {
    let player1: TestClient;
    let player2: TestClient;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should process call action correctly', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      // Determine who is active
      const turn = await player1.waitForMessage('TURN');
      const activeClient = turn.activePlayerIndex === player1.seatIndex ? player1 : player2;

      activeClient.clearMessages();
      activeClient.action('call');

      const actionConfirm = await activeClient.waitForMessage('ACTION_CONFIRM');

      expect(actionConfirm.action).toBe('call');
      expect(actionConfirm.pot).toBeGreaterThanOrEqual(3);
    });

    it('should process fold action and end hand', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      const turn = await player1.waitForMessage('TURN');
      const activeClient = turn.activePlayerIndex === player1.seatIndex ? player1 : player2;
      const otherClient = activeClient === player1 ? player2 : player1;

      activeClient.clearMessages();
      otherClient.clearMessages();

      activeClient.action('fold');

      // Both should receive RESULT
      const result1 = await activeClient.waitForMessage('RESULT');
      const result2 = await otherClient.waitForMessage('RESULT');

      expect(result1.type).toBe('RESULT');
      expect(result2.type).toBe('RESULT');

      // The folder lost, other player won
      expect(result1.result.winnerId).toBe(otherClient.playerId);
    });

    it('should process raise action correctly', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      const turn = await player1.waitForMessage('TURN');
      const activeClient = turn.activePlayerIndex === player1.seatIndex ? player1 : player2;

      activeClient.clearMessages();
      activeClient.action('raise', 5); // Raise to 5

      const actionConfirm = await activeClient.waitForMessage('ACTION_CONFIRM');

      expect(actionConfirm.action).toBe('raise');
      expect(actionConfirm.amount).toBeGreaterThan(2); // More than BB
    });

    it('should reject invalid actions with ERROR', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      const turn = await player1.waitForMessage('TURN');
      const inactiveClient = turn.activePlayerIndex === player1.seatIndex ? player2 : player1;

      inactiveClient.clearMessages();
      inactiveClient.action('call'); // Not their turn

      const error = await inactiveClient.waitForMessage('ERROR');
      expect(error.code).toBe('ACTION_FAILED');
    });
  });

  describe('Street Progression', () => {
    let player1: TestClient;
    let player2: TestClient;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should advance to flop after preflop betting completes', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      // Get active player
      const turn1 = await player1.waitForMessage('TURN');
      const sbClient = turn1.activePlayerIndex === player1.seatIndex ? player1 : player2;
      const bbClient = sbClient === player1 ? player2 : player1;

      // SB calls
      sbClient.action('call');
      await sbClient.waitForMessage('ACTION_CONFIRM');

      // BB checks
      bbClient.clearMessages();
      sbClient.clearMessages();

      bbClient.action('check');

      // Should receive STREET message with flop
      const street = await sbClient.waitForMessage('STREET');

      expect(street.type).toBe('STREET');
      expect(street.street).toBe('flop');
      expect(street.communityCards).toHaveLength(3);
    });

    it('should advance through all streets to showdown', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      // Helper to find street by name from all messages
      const waitForStreetByName = async (
        client: TestClient,
        streetName: string,
        timeout = 5000
      ) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
          const streets = client.getMessages('STREET');
          const found = streets.find((s) => s.street === streetName);
          if (found) return found;
          await sleep(50);
        }
        throw new Error(`Timeout waiting for street: ${streetName}`);
      };

      // Preflop: SB calls, BB checks
      const preflopTurn = await player1.waitForMessage('TURN');
      const sbClient = preflopTurn.activePlayerIndex === player1.seatIndex ? player1 : player2;
      const bbClient = sbClient === player1 ? player2 : player1;

      sbClient.action('call');
      await player1.waitForMessage('TURN'); // Wait for BB's turn
      bbClient.action('check');

      // Wait for flop street
      const flopStreet = await waitForStreetByName(player1, 'flop');
      expect(flopStreet.communityCards).toHaveLength(3);

      // Flop: both check
      const flopTurn = await player1.waitForMessage('TURN');
      const flopActive = flopTurn.activePlayerIndex === player1.seatIndex ? player1 : player2;
      const flopOther = flopActive === player1 ? player2 : player1;

      flopActive.action('check');
      await player1.waitForMessage('TURN');
      flopOther.action('check');

      // Wait for turn street
      const turnStreet = await waitForStreetByName(player1, 'turn');
      expect(turnStreet.communityCards).toHaveLength(4);

      // Turn: both check
      const turnTurn = await player1.waitForMessage('TURN');
      const turnActive = turnTurn.activePlayerIndex === player1.seatIndex ? player1 : player2;
      const turnOther = turnActive === player1 ? player2 : player1;

      turnActive.action('check');
      await player1.waitForMessage('TURN');
      turnOther.action('check');

      // Wait for river street
      const riverStreet = await waitForStreetByName(player1, 'river');
      expect(riverStreet.communityCards).toHaveLength(5);

      // River: both check
      const riverTurn = await player1.waitForMessage('TURN');
      const riverActive = riverTurn.activePlayerIndex === player1.seatIndex ? player1 : player2;
      const riverOther = riverActive === player1 ? player2 : player1;

      riverActive.action('check');
      await player1.waitForMessage('TURN');
      riverOther.action('check');

      // Should get RESULT (showdown)
      const result = await player1.waitForMessage('RESULT');
      expect(result.type).toBe('RESULT');
      expect(result.result.showdown).toBe(true);
    }, 10000); // Reduced timeout - test server uses fast delays (100ms)
  });

  describe('All-In Scenarios', () => {
    let player1: TestClient;
    let player2: TestClient;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should handle all-in action', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      const turn = await player1.waitForMessage('TURN');
      const activeClient = turn.activePlayerIndex === player1.seatIndex ? player1 : player2;

      activeClient.clearMessages();

      // Go all-in
      activeClient.action('all-in');

      // Should receive ACTION_CONFIRM
      const confirm = await activeClient.waitForMessage('ACTION_CONFIRM');
      expect(confirm.action).toBe('all-in');
    });

    it('should end hand when all-in is called', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      const turn = await player1.waitForMessage('TURN');
      const activeClient = turn.activePlayerIndex === player1.seatIndex ? player1 : player2;
      const otherClient = activeClient === player1 ? player2 : player1;

      // First player goes all-in
      activeClient.action('all-in');
      await sleep(200);

      // Second player calls/goes all-in
      otherClient.clearMessages();
      otherClient.action('all-in');

      // Server runs out the hand with configurable delays (100ms in test mode)
      // preflop -> flop -> turn -> river -> showdown
      const result = await otherClient.waitForMessage('RESULT', 5000);

      expect(result.type).toBe('RESULT');
      // When both all-in, it's a showdown
      expect(result.result.showdown).toBe(true);
    }, 10000); // Reduced timeout - test server uses fast delays
  });

  describe('Multiple Hands', () => {
    let player1: TestClient;
    let player2: TestClient;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should play multiple hands with alternating dealer', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      // Hand 1
      await startGame(player1, player2);
      const hand1 = player1.getMessages('HAND_START')[0]!;
      const dealer1 = hand1.dealerIndex;

      // Fold to end hand quickly
      const turn1 = await player1.waitForMessage('TURN');
      const active1 = turn1.activePlayerIndex === player1.seatIndex ? player1 : player2;
      active1.action('fold');

      await player1.waitForMessage('RESULT');

      // Clear and wait for hand 2
      // Server auto-starts next hand after delay (100ms in test mode)
      player1.clearMessages();
      player2.clearMessages();

      // Wait for auto-start
      const hand2 = await player1.waitForMessage('HAND_START', 2000);
      const dealer2 = hand2.dealerIndex;

      // Dealer should alternate
      expect(dealer2).not.toBe(dealer1);
      expect(hand2.handNumber).toBe(2);
    }, 10000); // Reduced timeout - test server uses fast delays
  });

  describe('Show Cards', () => {
    let player1: TestClient;
    let player2: TestClient;

    afterEach(() => {
      player1?.close();
      player2?.close();
    });

    it('should broadcast CARDS_SHOWN when player shows after folding', async () => {
      const { player1: p1, player2: p2 } = await setupTwoPlayerGame(server);
      player1 = p1;
      player2 = p2;

      await startGame(player1, player2);

      const turn = await player1.waitForMessage('TURN');
      const folderClient = turn.activePlayerIndex === player1.seatIndex ? player1 : player2;
      const otherClient = folderClient === player1 ? player2 : player1;

      // Fold
      folderClient.action('fold');
      await folderClient.waitForMessage('RESULT');

      folderClient.clearMessages();
      otherClient.clearMessages();

      // Show cards
      folderClient.showCards();

      // Both should receive CARDS_SHOWN
      const shown1 = await folderClient.waitForMessage('CARDS_SHOWN');
      const shown2 = await otherClient.waitForMessage('CARDS_SHOWN');

      expect(shown1.type).toBe('CARDS_SHOWN');
      expect(shown1.cards).toHaveLength(2);
      expect(shown2.cards).toEqual(shown1.cards);
    });
  });
});
