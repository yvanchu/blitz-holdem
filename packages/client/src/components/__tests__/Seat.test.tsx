import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Seat from '../Seat';
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

// Reset zustand store before each test
beforeEach(() => {
  useGameStore.setState({
    activePlayerIndex: null,
    result: null,
    communityCards: [],
    street: 'preflop' as const,
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

describe('Seat', () => {
  describe('empty seat', () => {
    it('should display "Waiting for player..." when no player', () => {
      render(<Seat player={null} isDealer={false} position="top" />);
      expect(screen.getByText('Waiting for player...')).toBeInTheDocument();
    });

    it('should display placeholder avatar with "?"', () => {
      render(<Seat player={null} isDealer={false} position="bottom" />);
      expect(screen.getByText('?')).toBeInTheDocument();
    });
  });

  describe('player info', () => {
    it('should display player alias', () => {
      const player = createPlayer({ alias: 'Alice' });
      render(<Seat player={player} isDealer={false} position="bottom" />);
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('should display player avatar with first letter', () => {
      const player = createPlayer({ alias: 'Bob' });
      render(<Seat player={player} isDealer={false} position="top" />);
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('should display session wins count', () => {
      const player = createPlayer();
      render(<Seat player={player} isDealer={false} position="bottom" wins={3} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('pot-won gain badge (+Xs)', () => {
    it('should show +potAwarded for the outright winner', () => {
      const player = createPlayer({ id: 'winner', alias: 'Winner' });
      useGameStore.setState({
        result: {
          winnerId: 'winner',
          winnerHandRank: 'Flush',
          potAwarded: 12,
          showdown: true,
        },
      });
      render(<Seat player={player} isDealer={false} position="bottom" />);
      expect(screen.getByText('+12s')).toBeInTheDocument();
    });

    it('should not show a gain badge for the losing player', () => {
      const player = createPlayer({ id: 'loser', alias: 'Loser' });
      useGameStore.setState({
        result: {
          winnerId: 'winner',
          winnerHandRank: 'Flush',
          potAwarded: 12,
          showdown: true,
        },
      });
      render(<Seat player={player} isDealer={false} position="bottom" />);
      expect(screen.queryByText(/^\+\d+s$/)).not.toBeInTheDocument();
    });

    it('should show each player their own share on a split pot', () => {
      useGameStore.setState({
        result: {
          winnerId: 'p0', // primary winner (seat 0) for backwards compatibility
          winnerHandRank: 'Straight (split)',
          potAwarded: 6, // seat 0 gets the odd chip
          showdown: true,
          isSplit: true,
          splitWinners: [
            { playerId: 'p0', amount: 6 },
            { playerId: 'p1', amount: 5 },
          ],
        },
      });

      // Seat 0 (the recorded primary winner) shows its own share...
      const { unmount } = render(
        <Seat
          player={createPlayer({ id: 'p0', alias: 'P0', seatIndex: 0 as const })}
          isDealer={false}
          position="bottom"
        />
      );
      expect(screen.getByText('+6s')).toBeInTheDocument();
      unmount();

      // ...and seat 1, which used to render nothing, now shows its share too.
      render(
        <Seat
          player={createPlayer({ id: 'p1', alias: 'P1', seatIndex: 1 as const })}
          isDealer={false}
          position="top"
        />
      );
      expect(screen.getByText('+5s')).toBeInTheDocument();
    });
  });

  describe('data attributes', () => {
    it('should have correct data-testid for position', () => {
      const player = createPlayer();
      const { rerender } = render(<Seat player={player} isDealer={false} position="top" />);
      expect(screen.getByTestId('seat-top')).toBeInTheDocument();

      rerender(<Seat player={player} isDealer={false} position="bottom" />);
      expect(screen.getByTestId('seat-bottom')).toBeInTheDocument();
    });

    it('should have data-seat-active="true" when player is active', () => {
      const player = createPlayer({ seatIndex: 0 as const });
      useGameStore.setState({ activePlayerIndex: 0 });

      render(<Seat player={player} isDealer={false} position="bottom" />);
      expect(screen.getByTestId('seat-bottom')).toHaveAttribute('data-seat-active', 'true');
    });

    it('should have data-seat-active="false" when player is not active', () => {
      const player = createPlayer({ seatIndex: 0 as const });
      useGameStore.setState({ activePlayerIndex: 1 });

      render(<Seat player={player} isDealer={false} position="bottom" />);
      expect(screen.getByTestId('seat-bottom')).toHaveAttribute('data-seat-active', 'false');
    });

    it('should have data-seat-folded="true" when player is folded', () => {
      const player = createPlayer({ folded: true });
      render(<Seat player={player} isDealer={false} position="bottom" />);
      expect(screen.getByTestId('seat-bottom')).toHaveAttribute('data-seat-folded', 'true');
    });
  });

  describe('hole cards', () => {
    it('should show face-down cards for opponent (top position)', () => {
      const player = createPlayer();
      render(<Seat player={player} isDealer={false} position="top" />);

      const holeCards = screen.getByTestId('hole-cards');
      const cards = holeCards.querySelectorAll('[data-testid="card"]');
      expect(cards).toHaveLength(2);
      expect(cards[0]).toHaveAttribute('data-card-hidden', 'true');
      expect(cards[1]).toHaveAttribute('data-card-hidden', 'true');
    });

    it('should show face-up cards for your seat (bottom position) when holeCards present', () => {
      const holeCards: [Card, Card] = [
        { rank: 'A', suit: 's' },
        { rank: 'K', suit: 's' },
      ];
      const player = createPlayer({ holeCards });
      render(<Seat player={player} isDealer={false} position="bottom" />);

      const cards = screen.getByTestId('hole-cards').querySelectorAll('[data-testid="card"]');
      expect(cards[0]).toHaveAttribute('data-card-rank', 'A');
      expect(cards[0]).toHaveAttribute('data-card-suit', 's');
      expect(cards[1]).toHaveAttribute('data-card-rank', 'K');
      expect(cards[1]).toHaveAttribute('data-card-suit', 's');
    });

    it('should show revealed cards from showdown', () => {
      const player = createPlayer();
      const revealedCards: [Card, Card] = [
        { rank: 'Q', suit: 'h' },
        { rank: 'J', suit: 'h' },
      ];
      render(
        <Seat player={player} isDealer={false} position="top" revealedCards={revealedCards} />
      );

      const cards = screen.getByTestId('hole-cards').querySelectorAll('[data-testid="card"]');
      expect(cards[0]).toHaveAttribute('data-card-rank', 'Q');
      expect(cards[0]).toHaveAttribute('data-card-suit', 'h');
    });

    it('should hide cards entirely when hideCards=true', () => {
      const player = createPlayer();
      render(<Seat player={player} isDealer={false} position="bottom" hideCards={true} />);
      expect(screen.queryByTestId('hole-cards')).not.toBeInTheDocument();
    });
  });

  describe('current bet', () => {
    it('should display current bet when > 0', () => {
      const player = createPlayer({ currentBet: 10 });
      render(<Seat player={player} isDealer={false} position="bottom" />);
      expect(screen.getByText('10s')).toBeInTheDocument();
    });

    it('should not display bet chip when currentBet = 0', () => {
      const player = createPlayer({ currentBet: 0, timeBank: 300 });
      render(<Seat player={player} isDealer={false} position="bottom" />);
      // The bet chip shows "Xs" for current bet - should not be present
      // Note: Timer also shows time in "Xs" format, so we look for the specific bet chip styling
      const betChips = screen.queryAllByText(/^\d+s$/);
      // Filter to only those in the amber chip container (bet chips, UX §7: amber = chips)
      const amberChips = betChips.filter((el) => el.closest('.bg-amber-500') !== null);
      expect(amberChips).toHaveLength(0);
    });

    it('should render the bet chip in amber (UX §7 color for chips)', () => {
      const player = createPlayer({ currentBet: 10 });
      render(<Seat player={player} isDealer={false} position="bottom" />);
      const chip = screen.getByText('10s').closest('.bg-amber-500');
      expect(chip).not.toBeNull();
      // Must not use yellow (the winning/gold color) for a betting chip.
      expect(screen.getByText('10s').closest('.bg-yellow-500')).toBeNull();
    });

    it('should round bet to nearest integer', () => {
      const player = createPlayer({ currentBet: 5.7 });
      render(<Seat player={player} isDealer={false} position="bottom" />);
      expect(screen.getByText('6s')).toBeInTheDocument();
    });
  });

  describe('folded state', () => {
    it('should apply opacity-50 when folded', () => {
      const player = createPlayer({ folded: true });
      render(<Seat player={player} isDealer={false} position="bottom" />);
      expect(screen.getByTestId('seat-bottom')).toHaveClass('opacity-50');
    });

    it('should not apply opacity-50 when not folded', () => {
      const player = createPlayer({ folded: false });
      render(<Seat player={player} isDealer={false} position="bottom" />);
      expect(screen.getByTestId('seat-bottom')).not.toHaveClass('opacity-50');
    });
  });

  describe('setup mode', () => {
    it('should show name input and ready button in setup mode', () => {
      const player = createPlayer();
      render(<Seat player={player} isDealer={false} position="bottom" isSetupMode={true} />);

      expect(screen.getByPlaceholderText('Player')).toBeInTheDocument();
      expect(screen.getByTestId('ready-button')).toBeInTheDocument();
    });

    it('should call onReady with alias when ready button clicked', () => {
      const player = createPlayer();
      const onReady = vi.fn();
      render(
        <Seat
          player={player}
          isDealer={false}
          position="bottom"
          isSetupMode={true}
          onReady={onReady}
        />
      );

      const input = screen.getByPlaceholderText('Player');
      fireEvent.change(input, { target: { value: 'TestAlias' } });
      fireEvent.click(screen.getByTestId('ready-button'));

      expect(onReady).toHaveBeenCalledWith('TestAlias');
    });

    it('should use default "Player" alias when input is empty', () => {
      const player = createPlayer();
      const onReady = vi.fn();
      render(
        <Seat
          player={player}
          isDealer={false}
          position="bottom"
          isSetupMode={true}
          onReady={onReady}
        />
      );

      fireEvent.click(screen.getByTestId('ready-button'));

      expect(onReady).toHaveBeenCalledWith('Player');
    });

    it('should call onReady when Enter key pressed in input', () => {
      const player = createPlayer();
      const onReady = vi.fn();
      render(
        <Seat
          player={player}
          isDealer={false}
          position="bottom"
          isSetupMode={true}
          onReady={onReady}
        />
      );

      const input = screen.getByPlaceholderText('Player');
      fireEvent.change(input, { target: { value: 'KeyboardAlias' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onReady).toHaveBeenCalledWith('KeyboardAlias');
    });

    it('should display initial time bank setting', () => {
      const player = createPlayer();
      useGameStore.setState({
        settings: {
          smallBlind: 1,
          bigBlind: 2,
          initialTimeBank: 500,
          tickRateHz: 6,
          disconnectGracePeriod: 5000,
          runoutDelayMs: 3000,
          nextHandDelayMs: 6000,
          streetDealDelayMs: 1200,
        },
      });

      render(<Seat player={player} isDealer={false} position="bottom" isSetupMode={true} />);
      expect(screen.getByText('500s')).toBeInTheDocument();
    });
  });

  describe('dealer button', () => {
    it('should display dealer button when isDealer=true', () => {
      const player = createPlayer();
      render(<Seat player={player} isDealer={true} position="bottom" />);
      expect(screen.getByText('D')).toBeInTheDocument();
    });
  });
});
