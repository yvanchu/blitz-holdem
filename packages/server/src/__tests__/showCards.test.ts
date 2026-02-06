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
  } as unknown as WebSocket;
}

describe('showCards', () => {
  let table: TableController;
  let ws1: WebSocket;
  let ws2: WebSocket;
  let player1Id: string;
  let player2Id: string;

  beforeEach(() => {
    table = new TableController('test-room');
    ws1 = createMockWs();
    ws2 = createMockWs();

    // Add two players
    const result1 = table.addPlayer(ws1, 'Player1');
    const result2 = table.addPlayer(ws2, 'Player2');

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    player1Id = result1.playerId!;
    player2Id = result2.playerId!;

    // Set both players ready
    table.setPlayerReady(player1Id);
    table.setPlayerReady(player2Id);
  });

  it('should broadcast CARDS_SHOWN to all players when a player shows cards after folding', () => {
    // Hand should have started automatically
    expect(table.isPlaying()).toBe(true);

    // Clear previous messages
    (ws1.send as ReturnType<typeof vi.fn>).mockClear();
    (ws2.send as ReturnType<typeof vi.fn>).mockClear();

    // Player 1 folds (assuming they're the active player or we need to handle action)
    const foldResult = table.handleAction(player1Id, 'fold');

    // If player1 wasn't active, try player2
    if (!foldResult.success) {
      const foldResult2 = table.handleAction(player2Id, 'fold');
      expect(foldResult2.success).toBe(true);
    }

    // Hand should now be over
    expect(table.isPlaying()).toBe(false);

    // Clear messages from fold
    (ws1.send as ReturnType<typeof vi.fn>).mockClear();
    (ws2.send as ReturnType<typeof vi.fn>).mockClear();

    // The player who folded shows their cards
    const folderPlayerId = foldResult.success ? player1Id : player2Id;
    table.showCards(folderPlayerId);

    // Both players should receive CARDS_SHOWN
    const ws1Messages = (ws1.send as ReturnType<typeof vi.fn>).mock.calls.map((call) =>
      JSON.parse(call[0] as string)
    );
    const ws2Messages = (ws2.send as ReturnType<typeof vi.fn>).mock.calls.map((call) =>
      JSON.parse(call[0] as string)
    );

    const ws1CardsShown = ws1Messages.find((m) => m.type === 'CARDS_SHOWN');
    const ws2CardsShown = ws2Messages.find((m) => m.type === 'CARDS_SHOWN');

    expect(ws1CardsShown).toBeDefined();
    expect(ws2CardsShown).toBeDefined();

    // Both should have the same cards data
    expect(ws1CardsShown.playerId).toBe(folderPlayerId);
    expect(ws2CardsShown.playerId).toBe(folderPlayerId);
    expect(ws1CardsShown.cards).toHaveLength(2);
    expect(ws2CardsShown.cards).toHaveLength(2);
    expect(ws1CardsShown.cards).toEqual(ws2CardsShown.cards);
  });

  it('should not allow showing cards during an active hand', () => {
    expect(table.isPlaying()).toBe(true);

    // Clear previous messages
    (ws1.send as ReturnType<typeof vi.fn>).mockClear();
    (ws2.send as ReturnType<typeof vi.fn>).mockClear();

    // Try to show cards while hand is in progress
    table.showCards(player1Id);

    // No CARDS_SHOWN should be sent
    const ws1Messages = (ws1.send as ReturnType<typeof vi.fn>).mock.calls.map((call) =>
      JSON.parse(call[0] as string)
    );
    const ws2Messages = (ws2.send as ReturnType<typeof vi.fn>).mock.calls.map((call) =>
      JSON.parse(call[0] as string)
    );

    expect(ws1Messages.find((m) => m.type === 'CARDS_SHOWN')).toBeUndefined();
    expect(ws2Messages.find((m) => m.type === 'CARDS_SHOWN')).toBeUndefined();
  });

  it('should not allow showing cards twice', () => {
    // Fold to end the hand
    const foldResult = table.handleAction(player1Id, 'fold');
    if (!foldResult.success) {
      table.handleAction(player2Id, 'fold');
    }

    const folderPlayerId = foldResult.success ? player1Id : player2Id;

    // Clear messages
    (ws1.send as ReturnType<typeof vi.fn>).mockClear();
    (ws2.send as ReturnType<typeof vi.fn>).mockClear();

    // Show cards first time
    table.showCards(folderPlayerId);

    const firstCallCount1 = (ws1.send as ReturnType<typeof vi.fn>).mock.calls.length;
    const firstCallCount2 = (ws2.send as ReturnType<typeof vi.fn>).mock.calls.length;

    // Try to show cards again
    table.showCards(folderPlayerId);

    // No additional messages should be sent
    expect((ws1.send as ReturnType<typeof vi.fn>).mock.calls.length).toBe(firstCallCount1);
    expect((ws2.send as ReturnType<typeof vi.fn>).mock.calls.length).toBe(firstCallCount2);
  });
});
