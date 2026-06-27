import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import type { TableState } from '@bullet-poker/common';
import { TableController } from '../table';

// Mock WebSocket
function createMockWs(): WebSocket {
  return {
    readyState: WebSocket.OPEN,
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeListener: vi.fn(),
  } as unknown as WebSocket;
}

// Minimal view of the controller internals we need to drive deterministic ticks
// and simulate a disconnect.
type ConnectedRecord = {
  player: { isConnected: boolean };
  disconnectedAt: number | null;
};
type TableInternals = {
  state: TableState;
  players: Map<string, ConnectedRecord>;
  lastTickTime: number;
  tick: () => void;
  stopTickLoop: () => void;
};

describe('disconnection = burn time, then all-in for zero (no auto-fold)', () => {
  let table: TableController;
  let internals: TableInternals;
  let player1Id: string; // seat 0
  let player2Id: string; // seat 1

  beforeEach(() => {
    table = new TableController('test-room');
    const r1 = table.addPlayer(createMockWs(), 'Player1');
    const r2 = table.addPlayer(createMockWs(), 'Player2');
    player1Id = r1.playerId!;
    player2Id = r2.playerId!;
    table.setPlayerReady(player1Id);
    table.setPlayerReady(player2Id);
    table.startGame(player1Id);

    internals = table as unknown as TableInternals;
    // Stop the real interval so we can drive ticks deterministically.
    internals.stopTickLoop();
  });

  afterEach(() => {
    table.destroy();
  });

  // Simulate a real abandoned disconnect: the player is marked not-connected and
  // their disconnect timestamp is well past any grace window. This is the exact
  // state that previously triggered an auto-fold, so these tests also guard against
  // that behavior being reintroduced.
  function markDisconnected(seatIndex: 0 | 1) {
    const playerId = seatIndex === 0 ? player1Id : player2Id;
    internals.state.players[seatIndex]!.isConnected = false;
    const rec = internals.players.get(playerId);
    if (rec) {
      rec.player.isConnected = false;
      rec.disconnectedAt = Date.now() - 10_000;
    }
  }

  it('treats a disconnected player who runs out of time as all-in for zero, not a fold', () => {
    // Pre-flop the dealer/SB (seat 0) acts first, facing the big blind.
    expect(internals.state.activePlayerIndex).toBe(0);
    markDisconnected(0);

    // Their clock hits zero while disconnected.
    internals.state.players[0]!.timeBank = 0;
    internals.tick();

    // Table stakes: all-in, NOT folded — disconnection never forces a fold. The
    // player stays entitled to a showdown for the pot they have already matched.
    expect(internals.state.players[0]!.isAllIn).toBe(true);
    expect(internals.state.players[0]!.folded).toBe(false);
    expect(internals.state.winner).toBeNull();

    // The opponent's uncalled bet (BB - SB = 1) is refunded, leaving only the
    // matched amount in the pot (1 + 1 = 2).
    expect(internals.state.players[1]!.currentBet).toBe(1);
    expect(internals.state.pot).toBe(2);
  });

  it("keeps draining a disconnected player's clock instead of auto-folding while time remains", () => {
    expect(internals.state.activePlayerIndex).toBe(0);
    markDisconnected(0);

    internals.state.players[0]!.timeBank = 100;
    // Simulate ~1 second elapsed since the previous tick.
    internals.lastTickTime = Date.now() - 1000;
    internals.tick();

    const p0 = internals.state.players[0]!;
    // The disconnected player is neither folded nor all-in: their clock simply burns.
    expect(p0.folded).toBe(false);
    expect(p0.isAllIn).toBe(false);
    expect(p0.timeBank).toBeLessThan(100); // time was drained
    expect(p0.timeBank).toBeGreaterThan(0); // but they still have time left
    expect(internals.state.activePlayerIndex).toBe(0); // action stays with them
    expect(internals.state.winner).toBeNull();
  });
});
