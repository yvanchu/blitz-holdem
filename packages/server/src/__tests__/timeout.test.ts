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

// Minimal view of the controller internals we need to drive deterministic ticks.
type TableInternals = {
  state: TableState;
  tick: () => void;
  stopTickLoop: () => void;
};

describe('timeout = all-in for zero (table stakes)', () => {
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

  it('treats a player who runs out of time while facing a bet as all-in for zero, refunding the opponent the uncalled amount', () => {
    // Pre-flop: the dealer/SB (seat 0) acts first, facing the big blind.
    // Posted blinds: seat0 = SB (1), seat1 = BB (2); seat0 owes 1 to call.
    expect(internals.state.activePlayerIndex).toBe(0);
    expect(internals.state.players[0]!.currentBet).toBe(1);
    expect(internals.state.players[1]!.currentBet).toBe(2);

    // Drain the SB's clock to zero while they still owe the call.
    internals.state.players[0]!.timeBank = 0;
    internals.tick();

    // Table stakes: the timed-out player is all-in, NOT folded — they remain
    // entitled to a showdown for the pot they have already matched.
    expect(internals.state.players[0]!.isAllIn).toBe(true);
    expect(internals.state.players[0]!.folded).toBe(false);
    expect(internals.state.winner).toBeNull();

    // The opponent's uncalled bet (BB - SB = 1) is refunded, so only the matched
    // amount stays in the pot (1 + 1 = 2).
    expect(internals.state.players[1]!.currentBet).toBe(1);
    expect(internals.state.pot).toBe(2);
  });

  it('keeps a player who runs out of time with the option to check in the hand (all-in for zero, not folded)', () => {
    // Advance to the flop where the player to act faces no bet.
    expect(table.handleAction(player1Id, 'call').success).toBe(true); // SB completes
    expect(table.handleAction(player2Id, 'check').success).toBe(true); // BB checks -> flop

    expect(internals.state.street).toBe('flop');
    const activeIndex = internals.state.activePlayerIndex!;

    // Drain the active player's clock to zero with no bet to face.
    internals.state.players[activeIndex]!.timeBank = 0;
    internals.tick();

    // They are all-in for zero and stay in the hand to contest the showdown —
    // running out of time never forces a fold.
    expect(internals.state.players[activeIndex]!.isAllIn).toBe(true);
    expect(internals.state.players[activeIndex]!.folded).toBe(false);
    expect(internals.state.winner).toBeNull();
  });
});
