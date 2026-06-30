import { describe, it, expect, afterEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import type { TableState } from '@bullet-poker/common';
import { TableController } from '../table';

// Mock WebSocket (mirrors disconnect.test.ts)
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

type TableInternals = { state: TableState };

/**
 * On-demand reclamation of seats abandoned past the grace period.
 *
 * A disconnected player's seat is normally freed by a grace-expiry `setTimeout`.
 * Under event-loop load that timer can be delayed by seconds, which used to make a
 * new player's JOIN fail with "Room is full" even though the grace period had long
 * since elapsed (the source of a flaky reconnection integration test). The seat must
 * therefore also be reclaimed lazily at join time once grace has actually elapsed.
 */
describe('seat reclamation on join (no hand in progress)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reclaims an abandoned seat on a new join even if the grace timer has not fired yet', () => {
    vi.useFakeTimers();
    const t0 = Date.now();
    vi.setSystemTime(t0);

    const table = new TableController('reclaim-room', { disconnectGracePeriod: 500 });
    table.addPlayer(createMockWs(), 'Alice');
    const bob = table.addPlayer(createMockWs(), 'Bob');
    expect(table.getPlayerCount()).toBe(2);

    // Bob disconnects with no hand in progress. This schedules the grace-cleanup
    // timer but we deliberately never let it run.
    table.handleDisconnect(bob.playerId!);
    expect(table.getPlayerCount()).toBe(2); // seat still held during grace

    // Advance the wall clock past the grace period WITHOUT running the pending
    // timer — simulating event-loop load that delays the grace-cleanup callback.
    vi.setSystemTime(t0 + 600);

    // A brand-new player (different alias, so not a reconnection) joins. The
    // abandoned seat must be reclaimed on demand so the join succeeds.
    const carol = table.addPlayer(createMockWs(), 'Carol');
    expect(carol.success).toBe(true);
    expect(table.getPlayerCount()).toBe(2);

    // Carol took Bob's freed seat (seat 1); Alice still holds seat 0.
    const state = (table as unknown as TableInternals).state;
    expect(state.players[0]?.alias).toBe('Alice');
    expect(state.players[1]?.alias).toBe('Carol');

    table.destroy();
  });

  it('does NOT reclaim a disconnected seat before the grace period elapses', () => {
    vi.useFakeTimers();
    const t0 = Date.now();
    vi.setSystemTime(t0);

    const table = new TableController('grace-room', { disconnectGracePeriod: 500 });
    table.addPlayer(createMockWs(), 'Alice');
    const bob = table.addPlayer(createMockWs(), 'Bob');

    table.handleDisconnect(bob.playerId!);

    // Still within the grace window: the seat is held, so a new player can't take it.
    vi.setSystemTime(t0 + 300);
    const carol = table.addPlayer(createMockWs(), 'Carol');
    expect(carol.success).toBe(false);
    expect(carol.error).toBe('Room is full');
    expect(table.getPlayerCount()).toBe(2);

    table.destroy();
  });
});
