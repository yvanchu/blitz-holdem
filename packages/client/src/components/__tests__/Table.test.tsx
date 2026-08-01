import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Table from '../Table';
import { useGameStore } from '../../store/gameStore';
import type { PlayerPublic, Card } from '@bullet-poker/common';

// Helper to create a test player
function createPlayer(overrides: Partial<PlayerPublic> = {}): PlayerPublic {
  return {
    id: 'test-player',
    alias: 'TestPlayer',
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

beforeEach(() => {
  useGameStore.setState({
    yourSeatIndex: 0,
    yourPlayerId: 'player-1',
    players: [
      createPlayer({ id: 'player-1', alias: 'You', seatIndex: 0 as const }),
      createPlayer({ id: 'player-2', alias: 'Opponent', seatIndex: 1 as const }),
    ],
    isHandInProgress: false,
    handNumber: 0,
    communityCards: [],
    pot: 0,
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
});

afterEach(() => {
  useGameStore.getState().reset();
});

describe('Table', () => {
  const mockSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render table with data-testid', () => {
      render(<Table send={mockSend} />);
      expect(screen.getByTestId('poker-table')).toBeInTheDocument();
    });

    it('should render bottom seat (your seat) always', () => {
      render(<Table send={mockSend} />);
      expect(screen.getByTestId('seat-bottom')).toBeInTheDocument();
    });

    it('should render both seats when both players are ready', () => {
      useGameStore.setState({
        isHandInProgress: true,
        handNumber: 1,
        readyState: [true, true],
      });
      render(<Table send={mockSend} />);
      expect(screen.getByTestId('seat-top')).toBeInTheDocument();
      expect(screen.getByTestId('seat-bottom')).toBeInTheDocument();
    });
  });

  describe('lobby state', () => {
    it('should show copy link button in lobby', () => {
      render(<Table send={mockSend} />);
      expect(screen.getByTestId('copy-link-button')).toBeInTheDocument();
    });

    it('should copy URL to clipboard when copy button clicked', async () => {
      render(<Table send={mockSend} />);

      const copyButton = screen.getByTestId('copy-link-button');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.href);
      });
    });

    it('should show settings button', () => {
      render(<Table send={mockSend} />);
      expect(screen.getByTestId('settings-button')).toBeInTheDocument();
    });

    it('should not show the hand number in the lobby', () => {
      render(<Table send={mockSend} />);
      expect(screen.queryByTestId('hand-number')).not.toBeInTheDocument();
    });

    it('should open settings modal when settings button clicked', () => {
      render(<Table send={mockSend} />);

      fireEvent.click(screen.getByTestId('settings-button'));

      expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
    });

    it('should show start game button when both players ready', () => {
      useGameStore.setState({
        readyState: [true, true],
      });
      render(<Table send={mockSend} />);

      expect(screen.getByTestId('start-game-button')).toBeInTheDocument();
    });

    it('should send START message when start button clicked', () => {
      useGameStore.setState({
        readyState: [true, true],
      });
      render(<Table send={mockSend} />);

      fireEvent.click(screen.getByTestId('start-game-button'));

      expect(mockSend).toHaveBeenCalledWith({ type: 'START' });
    });
  });

  describe('in-game state', () => {
    beforeEach(() => {
      useGameStore.setState({
        isHandInProgress: true,
        handNumber: 1,
        pot: 10,
        communityCards: [],
      });
    });

    it('should display pot amount', () => {
      render(<Table send={mockSend} />);
      expect(screen.getByTestId('pot')).toBeInTheDocument();
      expect(screen.getByTestId('pot-value')).toHaveTextContent('10');
    });

    it('should display community cards container', () => {
      render(<Table send={mockSend} />);
      expect(screen.getByTestId('community-cards')).toBeInTheDocument();
    });

    it('should display the current hand number', () => {
      render(<Table send={mockSend} />);
      const handNumber = screen.getByTestId('hand-number');
      expect(handNumber).toBeInTheDocument();
      expect(handNumber).toHaveTextContent('Hand #1');
    });

    it('should update the hand number as hands advance', () => {
      useGameStore.setState({ handNumber: 7 });
      render(<Table send={mockSend} />);
      expect(screen.getByTestId('hand-number')).toHaveTextContent('Hand #7');
    });

    it('should display community cards on flop', () => {
      const flopCards: Card[] = [
        { rank: 'A', suit: 's' },
        { rank: 'K', suit: 'h' },
        { rank: 'Q', suit: 'd' },
      ];
      useGameStore.setState({ communityCards: flopCards });
      render(<Table send={mockSend} />);

      const cards = screen.getByTestId('community-cards').querySelectorAll('[data-testid="card"]');
      expect(cards).toHaveLength(3);
    });

    it('should display 5 cards on river', () => {
      const riverCards: Card[] = [
        { rank: 'A', suit: 's' },
        { rank: 'K', suit: 'h' },
        { rank: 'Q', suit: 'd' },
        { rank: 'J', suit: 'c' },
        { rank: 'T', suit: 's' },
      ];
      useGameStore.setState({ communityCards: riverCards });
      render(<Table send={mockSend} />);

      const cards = screen.getByTestId('community-cards').querySelectorAll('[data-testid="card"]');
      expect(cards).toHaveLength(5);
    });
  });

  describe('showdown', () => {
    beforeEach(() => {
      useGameStore.setState({
        isHandInProgress: false,
        handNumber: 1,
        pot: 0,
        communityCards: [
          { rank: 'A', suit: 's' },
          { rank: 'K', suit: 'h' },
          { rank: 'Q', suit: 'd' },
          { rank: 'J', suit: 'c' },
          { rank: 'T', suit: 's' },
        ],
        result: {
          showdown: true,
          winnerId: 'player-1',
          winnerHandRank: 'Straight',
          potAwarded: 10,
          winningCards: [
            { rank: 'A', suit: 's' },
            { rank: 'K', suit: 'h' },
            { rank: 'Q', suit: 'd' },
            { rank: 'J', suit: 'c' },
            { rank: 'T', suit: 's' },
          ],
        },
      });
    });
  });

  describe('session wins', () => {
    it('should pass session wins to player seat', () => {
      useGameStore.setState({
        sessionWins: [3, 2],
        isHandInProgress: true,
        handNumber: 5,
        readyState: [true, true],
      });
      render(<Table send={mockSend} />);

      // Your seat shows your wins (seat 0 = 3 wins)
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});
