import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PlayerPublic } from '@bullet-poker/common';
import { useGameStore } from '../../store/gameStore';

// Mock router so TablePage can resolve roomId / navigate without a real Router.
vi.mock('react-router-dom', () => ({
  useParams: () => ({ roomId: 'room-1' }),
  useNavigate: () => vi.fn(),
}));

// Mock the socket hook: report a live connection so TablePage renders the table.
vi.mock('../../hooks/useSocket', () => ({
  useSocket: () => ({ connected: true, error: null, send: vi.fn(), ownerLeft: false }),
}));

import TablePage from '../TablePage';

function createPlayer(overrides: Partial<PlayerPublic> = {}): PlayerPublic {
  return {
    id: 'p',
    alias: 'Player',
    seatIndex: 0 as const,
    timeBank: 300,
    currentBet: 0,
    folded: false,
    isAllIn: false,
    isConnected: true,
    holeCards: null,
    ...overrides,
  };
}

function seatAs(seatIndex: 0 | 1) {
  useGameStore.setState({
    yourSeatIndex: seatIndex,
    yourPlayerId: seatIndex === 0 ? 'p0' : 'p1',
    players: [
      createPlayer({ id: 'p0', alias: 'Host', seatIndex: 0 as const }),
      createPlayer({ id: 'p1', alias: 'Joiner', seatIndex: 1 as const }),
    ],
    isHandInProgress: false,
    handNumber: 0,
    activePlayerIndex: null,
    communityCards: [],
    pot: 0,
    currentBet: 0,
    minRaise: 2,
    dealerIndex: 0,
    readyState: [false, false],
    result: null,
    revealedCards: null,
    gameOver: null,
    sessionWins: [0, 0],
    settings: {
      smallBlind: 1,
      bigBlind: 2,
      initialTimeBank: 300,
      tickRateHz: 6,
      disconnectGracePeriod: 5000,
      runoutDelayMs: 3000,
      nextHandDelayMs: 6000,
      streetDealDelayMs: 1200,
    },
  });
}

afterEach(() => {
  useGameStore.getState().reset();
});

describe('TablePage stakes display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Regression: the host (seat 0 / room owner) previously never saw the stakes badge
  // because it was gated on `isJoiner`. It must be visible regardless of seat.
  it('shows stakes to the host (seat 0)', () => {
    seatAs(0);
    render(<TablePage />);
    expect(screen.getByText('Stakes:')).toBeInTheDocument();
    expect(screen.getByText('1s / 2s')).toBeInTheDocument();
  });

  it('shows stakes to the joiner (seat 1)', () => {
    seatAs(1);
    render(<TablePage />);
    expect(screen.getByText('Stakes:')).toBeInTheDocument();
    expect(screen.getByText('1s / 2s')).toBeInTheDocument();
  });
});
