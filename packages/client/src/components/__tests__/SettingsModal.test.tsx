import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsModal from '../SettingsModal';
import { useGameStore } from '../../store/gameStore';

// Reset zustand store before each test
beforeEach(() => {
  useGameStore.setState({
    settings: {
      smallBlind: 1,
      bigBlind: 2,
      initialTimeBank: 300,
      tickRateHz: 6,
      disconnectGracePeriod: 5000,
      runoutDelayMs: 3000,
      nextHandDelayMs: 6000,
    },
  });
});

afterEach(() => {
  useGameStore.getState().reset();
});

describe('SettingsModal', () => {
  const mockSend = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('should not render when isOpen=false', () => {
      render(<SettingsModal isOpen={false} onClose={mockOnClose} send={mockSend} />);
      expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
    });

    it('should render when isOpen=true', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} send={mockSend} />);
      expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
    });
  });

  describe('inputs', () => {
    it('should display current settings from store', () => {
      useGameStore.setState({
        settings: {
          smallBlind: 5,
          bigBlind: 10,
          initialTimeBank: 600,
          tickRateHz: 6,
          disconnectGracePeriod: 5000,
          runoutDelayMs: 3000,
          nextHandDelayMs: 6000,
        },
      });

      render(<SettingsModal isOpen={true} onClose={mockOnClose} send={mockSend} />);

      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs[0]).toHaveValue(5); // Small blind
      expect(inputs[1]).toHaveValue(10); // Big blind
      expect(inputs[2]).toHaveValue(600); // Time bank
    });

    it('should allow changing small blind', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} send={mockSend} />);

      const smallBlindInput = screen.getAllByRole('spinbutton')[0]!;
      fireEvent.change(smallBlindInput, { target: { value: '3' } });
      expect(smallBlindInput).toHaveValue(3);
    });

    it('should allow changing big blind', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} send={mockSend} />);

      const bigBlindInput = screen.getAllByRole('spinbutton')[1]!;
      fireEvent.change(bigBlindInput, { target: { value: '6' } });
      expect(bigBlindInput).toHaveValue(6);
    });

    it('should allow changing time bank', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} send={mockSend} />);

      const timeBankInput = screen.getAllByRole('spinbutton')[2]!;
      fireEvent.change(timeBankInput, { target: { value: '500' } });
      expect(timeBankInput).toHaveValue(500);
    });

    it('should auto-adjust big blind when small blind exceeds it', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} send={mockSend} />);

      const smallBlindInput = screen.getAllByRole('spinbutton')[0]!;
      const bigBlindInput = screen.getAllByRole('spinbutton')[1]!;

      // Big blind starts at 2
      expect(bigBlindInput).toHaveValue(2);

      // Set small blind higher than big blind
      fireEvent.change(smallBlindInput, { target: { value: '5' } });

      // Big blind should auto-adjust to 2x small blind
      expect(bigBlindInput).toHaveValue(10);
    });
  });

  describe('save functionality', () => {
    it('should call send with UPDATE_SETTINGS message on save', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} send={mockSend} />);

      // Change values
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0]!, { target: { value: '2' } }); // small blind
      fireEvent.change(inputs[1]!, { target: { value: '4' } }); // big blind
      fireEvent.change(inputs[2]!, { target: { value: '400' } }); // time bank

      // Click save
      fireEvent.click(screen.getByTestId('settings-save-button'));

      expect(mockSend).toHaveBeenCalledWith({
        type: 'UPDATE_SETTINGS',
        settings: {
          smallBlind: 2,
          bigBlind: 4,
          initialTimeBank: 400,
        },
      });
    });

    it('should call onClose after saving', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} send={mockSend} />);

      fireEvent.click(screen.getByTestId('settings-save-button'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should enforce minimum small blind of 1', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} send={mockSend} />);

      const smallBlindInput = screen.getAllByRole('spinbutton')[0]!;
      fireEvent.change(smallBlindInput, { target: { value: '0' } });

      fireEvent.click(screen.getByTestId('settings-save-button'));

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            smallBlind: 1,
          }),
        })
      );
    });

    it('should enforce big blind >= small blind', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} send={mockSend} />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0]!, { target: { value: '5' } }); // small blind = 5
      fireEvent.change(inputs[1]!, { target: { value: '3' } }); // try to set big blind < small

      fireEvent.click(screen.getByTestId('settings-save-button'));

      // Big blind should be clamped to at least small blind
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            smallBlind: 5,
            bigBlind: 5, // Clamped to small blind minimum
          }),
        })
      );
    });

    it('should enforce time bank >= 10x big blind', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} send={mockSend} />);

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[1]!, { target: { value: '10' } }); // big blind = 10
      fireEvent.change(inputs[2]!, { target: { value: '50' } }); // time bank = 50 (should be at least 100)

      fireEvent.click(screen.getByTestId('settings-save-button'));

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            initialTimeBank: 100, // 10 * big blind
          }),
        })
      );
    });
  });

  describe('close functionality', () => {
    it('should call onClose when X button clicked', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} send={mockSend} />);

      // Find the X button by its text content
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking backdrop', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} send={mockSend} />);

      // Click the backdrop (the outer div)
      const backdrop = screen.getByTestId('settings-modal').parentElement;
      fireEvent.click(backdrop!);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not call onClose when clicking inside modal', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} send={mockSend} />);

      // Click inside the modal
      fireEvent.click(screen.getByTestId('settings-modal'));

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('syncing with store', () => {
    it('should update local state when store settings change', () => {
      const { rerender } = render(
        <SettingsModal isOpen={true} onClose={mockOnClose} send={mockSend} />
      );

      // Initial values
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs[0]!).toHaveValue(1);

      // Update store
      useGameStore.setState({
        settings: {
          smallBlind: 10,
          bigBlind: 20,
          initialTimeBank: 1000,
          tickRateHz: 6,
          disconnectGracePeriod: 5000,
          runoutDelayMs: 3000,
          nextHandDelayMs: 6000,
        },
      });

      // Rerender to trigger useEffect
      rerender(<SettingsModal isOpen={true} onClose={mockOnClose} send={mockSend} />);

      // Values should update
      expect(inputs[0]!).toHaveValue(10);
      expect(inputs[1]!).toHaveValue(20);
      expect(inputs[2]!).toHaveValue(1000);
    });
  });
});
