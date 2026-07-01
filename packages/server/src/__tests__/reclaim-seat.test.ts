import { describe, it, expect, afterEach, vi } from 'vitest';
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

type ConnectedRecord = {
  player: { alias: string; seatIndex: 0 | 1; isConnected: boolean };
  disconnectedAt: number | null;
};
type TableInternals = {
  state: TableState;
  players: Map<string, ConnectedRecord>;
};

describe('seat reclamation on join (no reliance on grace-period timer)', () => {
  let table: TableController;

  afterEach(() => {
    table.destroy();
  });

  // Simulate a player who disconnected long enough ago that the grace window has
  // objectively elapsed, WITHOUT running handleDisconnect's cleanup timer. This is
  // the exact state that could leave a stale seat occupied if the setTimeout was
  // delayed under load.
  function markAbandoned(internals: TableInternals, playerId: string, elapsedMs: number) {
    const rec = internals.players.get(playerId);
    if (!rec) throw new Error('player not found');
    rec.player.isConnected = false;
    rec.disconnectedAt = Date.now() - elapsedMs;
    const seat = internals.state.players.find((p) => p?.id === playerId);
    if (seat) seat.isConnected = false;
  }

  it('reclaims a seat whose grace period has elapsed so a new player can join', () => {
    table = new TableController('test-room', { disconnectGracePeriod: 500 });
    const p1 = table.addPlayer(createMockWs(), 'Player1');
    const p2 = table.addPlayer(createMockWs(), 'Player2');
    expect(p1.success).toBe(true);
    expect(p2.success).toBe(true);

    const internals = table as unknown as TableInternals;

    // Player2's grace period has elapsed (1000ms > 500ms) but the cleanup timer
    // has not fired — the seat is still occupied.
    markAbandoned(internals, p2.playerId!, 1000);
    expect(internals.players.size).toBe(2);

    // A brand-new player (different alias) joins: the stale seat is reclaimed
    // synchronously and the join succeeds into seat 1.
    const p3 = table.addPlayer(createMockWs(), 'NewPlayer');
    expect(p3.success).toBe(true);
    expect(internals.players.has(p2.playerId!)).toBe(false);
    expect(internals.players.size).toBe(2);
    const newSeat = internals.state.players.find((p) => p?.id === p3.playerId);
    expect(newSeat?.seatIndex).toBe(1);
    expect(newSeat?.alias).toBe('NewPlayer');
  });

  it('does NOT reclaim a seat still within the grace period (room stays full)', () => {
    table = new TableController('test-room-2', { disconnectGracePeriod: 500 });
    const p1 = table.addPlayer(createMockWs(), 'Player1');
    const p2 = table.addPlayer(createMockWs(), 'Player2');
    expect(p1.success).toBe(true);
    expect(p2.success).toBe(true);

    const internals = table as unknown as TableInternals;

    // Player2 just disconnected — still inside the grace window.
    markAbandoned(internals, p2.playerId!, 50);

    // A new player cannot take the seat yet; the disconnected player may still
    // reconnect within the grace period.
    const p3 = table.addPlayer(createMockWs(), 'NewPlayer');
    expect(p3.success).toBe(false);
    expect(p3.error).toBe('Room is full');
    expect(internals.players.has(p2.playerId!)).toBe(true);
  });
});
