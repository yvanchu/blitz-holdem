import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import type { TableState } from '@bullet-poker/common';
import { TableController } from '../table';

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

type TableInternals = {
  state: TableState;
  lastTickTime: number;
  tick: () => void;
  stopTickLoop: () => void;
};

// The new-street deal pause: when a betting round closes and the next street is
// dealt, the action freezes for streetDealDelayMs so the deal feels live and
// neither time bank drains. These tests drive a heads-up hand to the flop and
// assert the freeze/resume behavior deterministically with fake timers.
describe('street deal pause (flop/turn/river)', () => {
  let table: TableController;
  let internals: TableInternals;
  let player1Id: string; // seat 0 (dealer/SB)
  let player2Id: string; // seat 1 (BB)

  beforeEach(() => {
    vi.useFakeTimers();
    table = new TableController('test-room'); // DEFAULT_SETTINGS → streetDealDelayMs 1200
    player1Id = table.addPlayer(createMockWs(), 'Player1').playerId!;
    player2Id = table.addPlayer(createMockWs(), 'Player2').playerId!;
    table.setPlayerReady(player1Id);
    table.setPlayerReady(player2Id);
    table.startGame(player1Id);

    internals = table as unknown as TableInternals;
    // Drive ticks manually; the only timer we exercise is the street-deal setTimeout.
    internals.stopTickLoop();
  });

  afterEach(() => {
    table.destroy();
    vi.useRealTimers();
  });

  // Advance pre-flop to the flop: SB (seat 0) calls, BB (seat 1) checks.
  function closePreflop() {
    expect(internals.state.activePlayerIndex).toBe(0);
    table.handleAction(player1Id, 'call');
    expect(internals.state.activePlayerIndex).toBe(1);
    table.handleAction(player2Id, 'check');
  }

  it('freezes the action (no active player) the moment the street is dealt', () => {
    closePreflop();

    // The flop has been dealt and shown, but the action is frozen during the deal.
    expect(internals.state.street).toBe('flop');
    expect(internals.state.communityCards.length).toBe(3);
    expect(internals.state.activePlayerIndex).toBeNull();
  });

  it('does not drain either time bank while the deal is paused', () => {
    closePreflop();
    expect(internals.state.activePlayerIndex).toBeNull(); // mid-deal pause

    const paused0 = internals.state.players[0]!.timeBank;
    const paused1 = internals.state.players[1]!.timeBank;

    // Pretend a full second elapsed and tick: with no active player, nobody drains.
    internals.lastTickTime = Date.now() - 1000;
    internals.tick();
    internals.lastTickTime = Date.now() - 1000;
    internals.tick();

    expect(internals.state.players[0]!.timeBank).toBe(paused0);
    expect(internals.state.players[1]!.timeBank).toBe(paused1);
  });

  it('rejects actions during the deal pause', () => {
    closePreflop();

    // Neither player can act until the street is fully dealt.
    expect(table.handleAction(player1Id, 'check').success).toBe(false);
    expect(table.handleAction(player2Id, 'check').success).toBe(false);
  });

  it('resumes play with the first post-flop actor once the pause elapses', () => {
    closePreflop();
    expect(internals.state.activePlayerIndex).toBeNull();

    // After the deal delay, the active player is restored and can act.
    vi.advanceTimersByTime(1200);

    expect(internals.state.activePlayerIndex).not.toBeNull();
    // Heads-up: the non-dealer (BB, seat 1) acts first post-flop.
    expect(internals.state.activePlayerIndex).toBe(1);
    expect(table.handleAction(player2Id, 'check').success).toBe(true);
  });
});
