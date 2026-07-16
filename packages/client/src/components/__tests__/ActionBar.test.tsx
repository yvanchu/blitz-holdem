import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ActionBar from '../ActionBar';
import { useGameStore } from '../../store/gameStore';
import type { PlayerPublic } from '@bullet-poker/common';

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

    it('should show the absolute bet amount (in seconds) on each preset button', () => {
      // pot=10, currentBet=0, minRaise=2, toCall=0, timeBank=100
      // => minTotalBet=2, maxTotalBet=100
      setupActiveTurn({ timeBank: 100 });
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.click(screen.getByTestId('raise-button'));

      // 33% => floor(10/3)=3 ; 75% => floor(30/4)=7 ; Pot => 10 ; 150% => floor(15)=15 ; All In => 100
      expect(screen.getByTestId('preset-33')).toHaveTextContent('33%');
      expect(screen.getByTestId('preset-33')).toHaveTextContent('3s');
      expect(screen.getByTestId('preset-75')).toHaveTextContent('7s');
      expect(screen.getByTestId('preset-pot')).toHaveTextContent('10s');
      expect(screen.getByTestId('preset-150')).toHaveTextContent('15s');
      expect(screen.getByTestId('preset-allin')).toHaveTextContent('100s');
    });

    it('should clamp a preset display to the all-in max when it exceeds the time bank', () => {
      // pot=10, timeBank=5 => maxTotalBet=5, so 150% (15) clamps to 5s
      setupActiveTurn({ timeBank: 5 });
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.click(screen.getByTestId('raise-button'));

      expect(screen.getByTestId('preset-150')).toHaveTextContent('5s');
      expect(screen.getByTestId('preset-allin')).toHaveTextContent('5s');
    });

    it('should allow changing bet amount via input', () => {
      setupActiveTurn({ timeBank: 100 });
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.click(screen.getByTestId('raise-button'));

      const input = screen.getByTestId('bet-input');
      fireEvent.change(input, { target: { value: '20' } });

      expect(input).toHaveValue('20');
    });

    it('should expose accessible names for the raise-panel controls', () => {
      // currentBet=0 in the fixture => this is a "Bet" (not a "Raise").
      setupActiveTurn({ timeBank: 100 });
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.click(screen.getByTestId('raise-button'));

      // Amount input and slider must carry accessible labels (screen-reader support).
      expect(screen.getByTestId('bet-input')).toHaveAttribute('aria-label', 'Bet amount in seconds');
      expect(screen.getByTestId('bet-slider')).toHaveAttribute(
        'aria-label',
        'Bet amount slider, in seconds'
      );

      // The +/- steppers are icon-only, so they need descriptive labels.
      expect(
        screen.getByRole('button', { name: 'Decrease bet by 1 second' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Increase bet by 1 second' })
      ).toBeInTheDocument();
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

    it('should trigger call on "c" key when call is valid (and check is not)', () => {
      setupActiveTurn({ currentBet: 0 });
      useGameStore.setState({ currentBet: 5 });
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.keyDown(window, { key: 'c' });

      expect(mockSend).toHaveBeenCalledWith({ type: 'ACTION', action: 'call', amount: 5 });
    });

    it('should trigger check on "k" key', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.keyDown(window, { key: 'k' });

      expect(mockSend).toHaveBeenCalledWith({ type: 'ACTION', action: 'check' });
    });

    it('should trigger fold on "f" key', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.keyDown(window, { key: 'f' });

      expect(mockSend).toHaveBeenCalledWith({ type: 'ACTION', action: 'fold' });
    });

    it('should open raise panel and focus input on "r" key', async () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.keyDown(window, { key: 'r' });

      expect(screen.getByTestId('bet-input')).toBeInTheDocument();
    });

    it('should open raise panel and focus input on "b" key (Bet/Raise per PRD)', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.keyDown(window, { key: 'b' });

      expect(screen.getByTestId('bet-input')).toBeInTheDocument();
    });

    it('should close raise panel on "escape" key', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      // Open raise panel
      fireEvent.keyDown(window, { key: 'r' });
      expect(screen.getByTestId('bet-input')).toBeInTheDocument();

      // Close raise panel
      fireEvent.keyDown(window, { key: 'escape' });
      expect(screen.queryByTestId('bet-input')).not.toBeInTheDocument();
    });

    it('should submit bet on "enter" key when raise panel is open', () => {
      setupActiveTurn({ timeBank: 100 });
      useGameStore.setState({ pot: 10 });
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      // Open raise panel
      fireEvent.keyDown(window, { key: 'r' });

      // Submit with enter
      fireEvent.keyDown(window, { key: 'enter' });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ACTION', action: 'bet' })
      );
    });

    it('should submit bet on "enter" key from within bet input', () => {
      setupActiveTurn({ timeBank: 100 });
      useGameStore.setState({ pot: 10 });
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      // Open raise panel
      fireEvent.click(screen.getByTestId('raise-button'));

      const input = screen.getByTestId('bet-input');

      // Submit with enter from input
      fireEvent.keyDown(input, { key: 'enter' });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ACTION', action: 'bet' })
      );
    });

    it('should toggle auto all-in on "a" key', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      // Find the auto all-in checkbox
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      // Press 'a' to toggle
      fireEvent.keyDown(window, { key: 'a' });

      expect(checkbox).toBeChecked();

      // Press 'a' again to toggle off
      fireEvent.keyDown(window, { key: 'a' });

      expect(checkbox).not.toBeChecked();
    });

    it('should use amber (not yellow) for the active auto all-in control per UX color language', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      const checkbox = screen.getByRole('checkbox');
      // The label wraps the checkbox and carries the state color classes
      const label = checkbox.closest('label');
      expect(label).not.toBeNull();

      // Activate auto all-in
      fireEvent.keyDown(window, { key: 'a' });
      expect(checkbox).toBeChecked();

      // Going all-in is a betting action → amber (#F59E0B), never yellow
      expect(label).toHaveClass('border-amber-500');
      expect(label).toHaveClass('bg-amber-500/20');
      expect(label).toHaveClass('text-amber-400');
      expect(label?.className).not.toContain('border-yellow-500');
      expect(label?.className).not.toContain('text-yellow-400');
    });

    it('should not trigger shortcuts when typing in input (except enter)', () => {
      setupActiveTurn();
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      // Open raise panel
      fireEvent.click(screen.getByTestId('raise-button'));

      const input = screen.getByTestId('bet-input');

      // Simulate typing 'f' in input - should not trigger fold
      fireEvent.keyDown(input, { key: 'f', target: input });

      expect(mockSend).not.toHaveBeenCalledWith({ type: 'ACTION', action: 'fold' });
    });

    it('should not trigger shortcuts when it is not your turn', () => {
      setupActiveTurn();
      useGameStore.setState({ activePlayerIndex: 1 }); // Opponent's turn
      render(<ActionBar send={mockSend} isHandInProgress={true} />);

      fireEvent.keyDown(window, { key: 'f' });
      fireEvent.keyDown(window, { key: 'c' });
      fireEvent.keyDown(window, { key: 'k' });

      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('show cards', () => {
    it('should display show cards button after fold win (not showdown)', () => {
      setupActiveTurn();
      useGameStore.setState({
        isHandInProgress: false,
        result: {
          showdown: false,
          winnerId: 'player-1',
          winnerHandRank: 'Fold',
          potAwarded: 10,
        },
      });
      render(<ActionBar send={mockSend} isHandInProgress={false} />);

      expect(screen.getByTestId('show-cards-button')).toBeInTheDocument();
    });

    it('should send SHOW_CARDS message when show cards clicked', () => {
      setupActiveTurn();
      useGameStore.setState({
        isHandInProgress: false,
        result: {
          showdown: false,
          winnerId: 'player-1',
          winnerHandRank: 'Fold',
          potAwarded: 10,
        },
      });
      render(<ActionBar send={mockSend} isHandInProgress={false} />);

      fireEvent.click(screen.getByTestId('show-cards-button'));

      expect(mockSend).toHaveBeenCalledWith({ type: 'SHOW_CARDS' });
    });

    it('should send SHOW_CARDS message when "s" key pressed', () => {
      setupActiveTurn();
      useGameStore.setState({
        isHandInProgress: false,
        result: {
          showdown: false,
          winnerId: 'player-1',
          winnerHandRank: 'Fold',
          potAwarded: 10,
        },
      });
      render(<ActionBar send={mockSend} isHandInProgress={false} />);

      fireEvent.keyDown(window, { key: 's' });

      expect(mockSend).toHaveBeenCalledWith({ type: 'SHOW_CARDS' });
    });

    it('should not trigger show cards shortcut when typing in input', () => {
      setupActiveTurn();
      useGameStore.setState({
        isHandInProgress: false,
        result: {
          showdown: false,
          winnerId: 'player-1',
          winnerHandRank: 'Fold',
          potAwarded: 10,
        },
      });
      render(<ActionBar send={mockSend} isHandInProgress={false} />);

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      fireEvent.keyDown(input, { key: 's', target: input });

      expect(mockSend).not.toHaveBeenCalledWith({ type: 'SHOW_CARDS' });

      document.body.removeChild(input);
    });

    it('should not show button when showdown occurred', () => {
      setupActiveTurn();
      useGameStore.setState({
        isHandInProgress: false,
        result: {
          showdown: true,
          winnerId: 'player-1',
          winnerHandRank: 'Pair',
          potAwarded: 10,
        },
      });
      render(<ActionBar send={mockSend} isHandInProgress={false} />);

      // Show cards button should not be visible after showdown
      expect(screen.queryByTestId('show-cards-button')).not.toBeInTheDocument();
    });

    it('should not show button when cards already revealed', () => {
      setupActiveTurn();
      useGameStore.setState({
        isHandInProgress: false,
        result: {
          showdown: false,
          winnerId: 'player-1',
          winnerHandRank: 'Fold',
          potAwarded: 10,
        },
        revealedCards: {
          seat0: [
            { rank: 'A', suit: 's' },
            { rank: 'K', suit: 'h' },
          ],
          seat1: null,
        },
      });
      render(<ActionBar send={mockSend} isHandInProgress={false} />);

      // Show cards button should not be visible after cards revealed
      expect(screen.queryByTestId('show-cards-button')).not.toBeInTheDocument();
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
