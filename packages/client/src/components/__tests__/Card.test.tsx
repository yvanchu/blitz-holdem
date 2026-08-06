import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card from '../Card';

describe('Card', () => {
  describe('face-down (hidden) card', () => {
    it('should render a hidden card when no card prop', () => {
      render(<Card />);
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('data-card-hidden', 'true');
    });

    it('should render a hidden card when hidden=true', () => {
      render(<Card card={{ rank: 'A', suit: 's' }} hidden={true} />);
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('data-card-hidden', 'true');
    });

    it('should not show rank/suit attributes when hidden', () => {
      render(<Card card={{ rank: 'A', suit: 's' }} hidden={true} />);
      const card = screen.getByTestId('card');
      expect(card).not.toHaveAttribute('data-card-rank');
      expect(card).not.toHaveAttribute('data-card-suit');
    });
  });

  describe('face-up card', () => {
    it('should render card with rank and suit attributes', () => {
      render(<Card card={{ rank: 'A', suit: 's' }} />);
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('data-card-rank', 'A');
      expect(card).toHaveAttribute('data-card-suit', 's');
    });

    it('should display ace of spades correctly', () => {
      render(<Card card={{ rank: 'A', suit: 's' }} />);
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('♠')).toBeInTheDocument();
    });

    it('should display 10 as "10" not "T"', () => {
      render(<Card card={{ rank: 'T', suit: 'h' }} />);
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should display face cards (J, Q, K)', () => {
      const { rerender } = render(<Card card={{ rank: 'J', suit: 'd' }} />);
      expect(screen.getByText('J')).toBeInTheDocument();

      rerender(<Card card={{ rank: 'Q', suit: 'c' }} />);
      expect(screen.getByText('Q')).toBeInTheDocument();

      rerender(<Card card={{ rank: 'K', suit: 'h' }} />);
      expect(screen.getByText('K')).toBeInTheDocument();
    });

    it('should display numeric cards', () => {
      render(<Card card={{ rank: '7', suit: 's' }} />);
      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });

  describe('suit colors', () => {
    it('should apply red color for hearts', () => {
      const { container } = render(<Card card={{ rank: 'K', suit: 'h' }} />);
      const card = container.querySelector('[data-testid="card"]');
      expect(card).toHaveClass('text-red-600');
    });

    it('should apply red color for diamonds', () => {
      const { container } = render(<Card card={{ rank: 'Q', suit: 'd' }} />);
      const card = container.querySelector('[data-testid="card"]');
      expect(card).toHaveClass('text-red-600');
    });

    it('should apply black color for spades', () => {
      const { container } = render(<Card card={{ rank: 'A', suit: 's' }} />);
      const card = container.querySelector('[data-testid="card"]');
      expect(card).toHaveClass('text-gray-900');
    });

    it('should apply black color for clubs', () => {
      const { container } = render(<Card card={{ rank: 'J', suit: 'c' }} />);
      const card = container.querySelector('[data-testid="card"]');
      expect(card).toHaveClass('text-gray-900');
    });
  });

  describe('suit symbols', () => {
    it('should display heart symbol', () => {
      render(<Card card={{ rank: '2', suit: 'h' }} />);
      expect(screen.getByText('♥')).toBeInTheDocument();
    });

    it('should display diamond symbol', () => {
      render(<Card card={{ rank: '3', suit: 'd' }} />);
      expect(screen.getByText('♦')).toBeInTheDocument();
    });

    it('should display club symbol', () => {
      render(<Card card={{ rank: '4', suit: 'c' }} />);
      expect(screen.getByText('♣')).toBeInTheDocument();
    });

    it('should display spade symbol', () => {
      render(<Card card={{ rank: '5', suit: 's' }} />);
      expect(screen.getByText('♠')).toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('should apply normal size classes by default', () => {
      const { container } = render(<Card card={{ rank: 'A', suit: 's' }} />);
      const card = container.querySelector('[data-testid="card"]');
      expect(card).toHaveClass('w-[48px]');
      expect(card).toHaveClass('h-[68px]');
    });

    it('should apply small size classes when size="small"', () => {
      const { container } = render(<Card card={{ rank: 'A', suit: 's' }} size="small" />);
      const card = container.querySelector('[data-testid="card"]');
      expect(card).toHaveClass('w-[44px]');
      expect(card).toHaveClass('h-[62px]');
    });
  });

  describe('highlighting', () => {
    it('should apply highlight ring when highlight=true', () => {
      const { container } = render(<Card card={{ rank: 'A', suit: 's' }} highlight={true} />);
      const card = container.querySelector('[data-testid="card"]');
      expect(card).toHaveClass('ring-2');
      expect(card).toHaveClass('ring-yellow-400');
    });

    it('should not apply highlight ring when highlight=false', () => {
      const { container } = render(<Card card={{ rank: 'A', suit: 's' }} highlight={false} />);
      const card = container.querySelector('[data-testid="card"]');
      expect(card).not.toHaveClass('ring-2');
    });
  });

  describe('accessibility', () => {
    it('should label a face-down card for screen readers', () => {
      render(<Card />);
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('role', 'img');
      expect(card).toHaveAttribute('aria-label', 'Face-down card');
    });

    it('should give face cards a spoken name (Ace of spades)', () => {
      render(<Card card={{ rank: 'A', suit: 's' }} />);
      expect(screen.getByRole('img')).toHaveAccessibleName('Ace of spades');
    });

    it('should spell out ten and suit (10 of hearts)', () => {
      render(<Card card={{ rank: 'T', suit: 'h' }} />);
      expect(screen.getByRole('img')).toHaveAccessibleName('10 of hearts');
    });

    it('should label numeric cards (7 of clubs)', () => {
      render(<Card card={{ rank: '7', suit: 'c' }} />);
      expect(screen.getByRole('img')).toHaveAccessibleName('7 of clubs');
    });

    it('should announce the winning state in the label, not by color alone', () => {
      render(<Card card={{ rank: 'K', suit: 'd' }} highlight={true} />);
      expect(screen.getByRole('img')).toHaveAccessibleName('King of diamonds, winning card');
    });

    it('should not tag a non-winning card as winning', () => {
      render(<Card card={{ rank: 'K', suit: 'd' }} highlight={false} />);
      expect(screen.getByRole('img')).toHaveAccessibleName('King of diamonds');
    });
  });
});
