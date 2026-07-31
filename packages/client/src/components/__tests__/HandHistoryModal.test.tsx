import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HandHistoryModal } from '../HandHistoryModal';
import { useHandHistoryStore } from '../../store/handHistoryStore';
import type { Card } from '@bullet-poker/common';

// Drive the real store to produce valid completed-hand records.
function recordHand(handNumber: number) {
  const store = useHandHistoryStore.getState();
  store.startNewHand({
    handNumber,
    roomId: 'test-room',
    dealerSeat: 0,
    heroSeatIndex: 0,
    heroPlayerId: 'hero-123',
    players: [
      { id: 'hero-123', alias: 'Hero', timeBank: 100, seatIndex: 0 },
      { id: 'villain-456', alias: 'Villain', timeBank: 100, seatIndex: 1 },
    ],
    smallBlind: 1,
    bigBlind: 2,
    heroHoleCards: [
      { rank: 'A', suit: 'h' },
      { rank: 'K', suit: 's' },
    ] as [Card, Card],
  });
  useHandHistoryStore.getState().finalizeHand({
    winnerId: 'hero-123',
    winnerHandRank: 'One Pair',
    potAwarded: 4,
    communityCards: [],
  });
}

beforeEach(() => {
  useHandHistoryStore.getState().reset();
});

describe('HandHistoryModal', () => {
  describe('visibility', () => {
    it('does not render when the modal is closed', () => {
      render(<HandHistoryModal />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders an accessible dialog when open', () => {
      useHandHistoryStore.setState({ isModalOpen: true });
      render(<HandHistoryModal />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      // Labelled by the visible title so screen readers announce it.
      expect(dialog).toHaveAttribute('aria-labelledby', 'hand-history-title');
      expect(screen.getByText('Hand History')).toHaveAttribute('id', 'hand-history-title');
    });
  });

  describe('keyboard support', () => {
    it('closes the modal when Escape is pressed', () => {
      useHandHistoryStore.setState({ isModalOpen: true });
      render(<HandHistoryModal />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(useHandHistoryStore.getState().isModalOpen).toBe(false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('navigates between hands with the arrow keys', () => {
      recordHand(1);
      recordHand(2);
      useHandHistoryStore.getState().openModal(); // opens at latest (index 1)
      render(<HandHistoryModal />);

      // Latest hand is shown first.
      expect(screen.getByText('Hand 2 of 2')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(screen.getByText('Hand 1 of 2')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(screen.getByText('Hand 2 of 2')).toBeInTheDocument();
    });

    it('does not navigate past the first or last hand', () => {
      recordHand(1);
      recordHand(2);
      useHandHistoryStore.getState().openModal(); // index 1 (last)
      render(<HandHistoryModal />);

      // Already at the last hand — ArrowRight is a no-op.
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(screen.getByText('Hand 2 of 2')).toBeInTheDocument();

      // Move to the first hand, then ArrowLeft again should stay put.
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(screen.getByText('Hand 1 of 2')).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(screen.getByText('Hand 1 of 2')).toBeInTheDocument();
    });

    it('removes its key listener when unmounted', () => {
      useHandHistoryStore.setState({ isModalOpen: true });
      const { unmount } = render(<HandHistoryModal />);
      unmount();

      // With the modal unmounted its keydown listener is gone, so a stray
      // Escape must not mutate store state.
      useHandHistoryStore.setState({ isModalOpen: true });
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(useHandHistoryStore.getState().isModalOpen).toBe(true);
    });
  });
});
