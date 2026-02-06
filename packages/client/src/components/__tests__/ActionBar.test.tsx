import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ActionBar from '../ActionBar';
import { useGameStore } from '../../store/gameStore';
import type { PlayerPublic } from '@blitz-holdem/common';

// Helper to create a test player
function createPlayer(overrides: Partial<PlayerPublic> = {}): PlayerPublic {
  return {
    id: 'test-player',
    alias: 'TestPlayer',
    seatIndex: 0 as const,
    timeBank: 100,
    currentBet: 0,
    folded: false,
    isAllIn: false,
    isConnected: true,
    holeCards: null,
    ...overrides,
  };
}

// Helper to set up game state for active turn
function setupActiveTurn(playerOverrides: Partial<PlayerPublic> = {}) {
  const player = createPlayer({ seatIndex: 0 as const, ...playerOverrides });
  useGameStore.setState({
    yourSeatIndex: 0,
    yourPlayerId: 'test-player',
    players: [player, createPlayer({ seatIndex: 1 as const })],
    isHandInProgress: true,
    activePlayerIndex: 0,
    minRaise: 2,
    currentBet: 0,
    pot: 10,
  });
  return player;
}

beforeEach(() => {
  useGameStore.setState({
    yourSeatIndex: null,
    yourPlayerId: null,
    players: [null, null],
    isHandInProgress: false,
    activePlayerIndex: null,
    minRaise: 2,
    currentBet: 0,
    pot: 0,
  });
});

afterEach(() => {
  useGameStore.getState().reset();
});

describe('ActionBar', () => {
  const mockSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render action bar with data-testid', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);
      expect(screen.getByTestId('action-bar')).toBeInTheDocument();
    });

    it('should render all action buttons', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      expect(screen.getByTestId('call-button')).toBeInTheDocument();
      expect(screen.getByTestId('raise-button')).toBeInTheDocument();
      expect(screen.getByTestId('check-button')).toBeInTheDocument();
      expect(screen.getByTestId('fold-button')).toBeInTheDocument();
    });
  });

  describe('button states when it is your turn', () => {
    it('should enable check button when no bet to call', () => {
      setupActiveTurn();
      useGameStore.setState({ currentBet: 0 });
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      expect(screen.getByTestId('check-button')).not.toBeDisabled();
    });

    it('should disable check button when there is a bet to call', () => {
      setupActiveTurn({ currentBet: 0 });
      useGameStore.setState({ currentBet: 5 }); // There's a bet we haven't matched
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      expect(screen.getByTestId('check-button')).toBeDisabled();
    });

    it('should enable call button when there is a bet to call', () => {
      setupActiveTurn({ currentBet: 0 });
      useGameStore.setState({ currentBet: 5 });
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      expect(screen.getByTestId('call-button')).not.toBeDisabled();
    });

    it('should disable call button when no bet to call', () => {
      setupActiveTurn();
      useGameStore.setState({ currentBet: 0 });
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      expect(screen.getByTestId('call-button')).toBeDisabled();
    });

    it('should enable fold button during hand', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      expect(screen.getByTestId('fold-button')).not.toBeDisabled();
    });

    it('should enable raise/bet button when player has enough time', () => {
      setupActiveTurn({ timeBank: 100 });
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      expect(screen.getByTestId('raise-button')).not.toBeDisabled();
    });
  });

  describe('button states when it is not your turn', () => {
    it('should disable all action buttons', () => {
      setupActiveTurn();
      useGameStore.setState({ activePlayerIndex: 1 }); // Opponent's turn
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      expect(screen.getByTestId('call-button')).toBeDisabled();
      expect(screen.getByTestId('raise-button')).toBeDisabled();
      expect(screen.getByTestId('check-button')).toBeDisabled();
      expect(screen.getByTestId('fold-button')).toBeDisabled();
    });
  });

  describe('actions', () => {
    it('should send check action when check button clicked', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.click(screen.getByTestId('check-button'));

      expect(mockSend).toHaveBeenCalledWith({ type: 'ACTION', action: 'check' });
    });

    it('should send call action when call button clicked', () => {
      setupActiveTurn({ currentBet: 0 });
      useGameStore.setState({ currentBet: 5 });
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.click(screen.getByTestId('call-button'));

      expect(mockSend).toHaveBeenCalledWith({ type: 'ACTION', action: 'call', amount: 5 });
    });

    it('should send fold action when fold button clicked', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.click(screen.getByTestId('fold-button'));

      expect(mockSend).toHaveBeenCalledWith({ type: 'ACTION', action: 'fold' });
    });
  });

  describe('raise panel', () => {
    it('should show raise panel when raise button clicked', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.click(screen.getByTestId('raise-button'));

      expect(screen.getByTestId('bet-input')).toBeInTheDocument();
      expect(screen.getByTestId('bet-slider')).toBeInTheDocument();
    });

    it('should show preset buttons in raise panel', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.click(screen.getByTestId('raise-button'));

      expect(screen.getByText('33%')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('Pot')).toBeInTheDocument();
      expect(screen.getByText('150%')).toBeInTheDocument();
      expect(screen.getByText('All In')).toBeInTheDocument();
    });

    it('should allow changing bet amount via input', () => {
      setupActiveTurn({ timeBank: 100 });
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.click(screen.getByTestId('raise-button'));

      const input = screen.getByTestId('bet-input');
      fireEvent.change(input, { target: { value: '20' } });

      expect(input).toHaveValue('20');
    });
  });

  describe('call amount display', () => {
    it('should show call amount on call button', () => {
      setupActiveTurn({ currentBet: 0, timeBank: 100 });
      useGameStore.setState({ currentBet: 10 });
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      expect(screen.getByTestId('call-button')).toHaveTextContent('Call 10s');
    });

    it('should cap call amount to player time bank', () => {
      setupActiveTurn({ currentBet: 0, timeBank: 5 });
      useGameStore.setState({ currentBet: 10 });
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      // Should show capped amount
      expect(screen.getByTestId('call-button')).toHaveTextContent('Call 5s');
    });
  });

  describe('keyboard shortcuts', () => {
    it('should trigger check on "c" key when check is valid', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.keyDown(window, { key: 'c' });

      expect(mockSend).toHaveBeenCalledWith({ type: 'ACTION', action: 'check' });
    });

    it('should trigger fold on "f" key', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.keyDown(window, { key: 'f' });

      expect(mockSend).toHaveBeenCalledWith({ type: 'ACTION', action: 'fold' });
    });

    it('should toggle raise panel on "r" key', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      // Open raise panel
      fireEvent.keyDown(window, { key: 'r' });
      expect(screen.getByTestId('bet-input')).toBeInTheDocument();

      // Close raise panel
      fireEvent.keyDown(window, { key: 'escape' });
      expect(screen.queryByTestId('bet-input')).not.toBeInTheDocument();
    });

    it('should not trigger shortcuts when typing in input', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      // Open raise panel
      fireEvent.click(screen.getByTestId('raise-button'));

      const input = screen.getByTestId('bet-input');

      // Simulate typing 'f' in input
      fireEvent.keyDown(input, { key: 'f', target: input });

      // Should not have triggered fold
      expect(mockSend).not.toHaveBeenCalledWith({ type: 'ACTION', action: 'fold' });
    });
  });

  describe('button text', () => {
    it('should show "Bet" when current bet is 0', () => {
      setupActiveTurn();
      useGameStore.setState({ currentBet: 0 });
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      expect(screen.getByTestId('raise-button')).toHaveTextContent('Bet');
    });

    it('should show "Raise" when current bet is > 0', () => {
      setupActiveTurn({ currentBet: 0 });
      useGameStore.setState({ currentBet: 5 });
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      expect(screen.getByTestId('raise-button')).toHaveTextContent('Raise');
    });
  });
});
