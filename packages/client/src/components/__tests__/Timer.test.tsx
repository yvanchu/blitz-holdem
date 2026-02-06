import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Timer from '../Timer';

describe('Timer', () => {
  describe('rendering', () => {
    it('should display time in seconds format', () => {
      render(<Timer timeBank={120} isActive={false} isAllIn={false} />);
      expect(screen.getByText('120s')).toBeInTheDocument();
    });

    it('should round time bank to nearest integer', () => {
      render(<Timer timeBank={99.7} isActive={false} isAllIn={false} />);
      expect(screen.getByText('100s')).toBeInTheDocument();
    });

    it('should show 0s for negative values', () => {
      render(<Timer timeBank={-5} isActive={false} isAllIn={false} />);
      expect(screen.getByText('0s')).toBeInTheDocument();
    });

    it('should have data-testid="timer"', () => {
      render(<Timer timeBank={100} isActive={false} isAllIn={false} />);
      expect(screen.getByTestId('timer')).toBeInTheDocument();
    });
  });

  describe('active state', () => {
    it('should have data-timer-active="true" when active', () => {
      render(<Timer timeBank={100} isActive={true} isAllIn={false} />);
      expect(screen.getByTestId('timer')).toHaveAttribute('data-timer-active', 'true');
    });

    it('should have data-timer-active="false" when not active', () => {
      render(<Timer timeBank={100} isActive={false} isAllIn={false} />);
      expect(screen.getByTestId('timer')).toHaveAttribute('data-timer-active', 'false');
    });
  });

  describe('all-in state', () => {
    it('should have data-timer-allin="true" when all-in', () => {
      render(<Timer timeBank={50} isActive={false} isAllIn={true} />);
      expect(screen.getByTestId('timer')).toHaveAttribute('data-timer-allin', 'true');
    });

    it('should not have data-timer-active when all-in (uses different styling)', () => {
      render(<Timer timeBank={50} isActive={true} isAllIn={true} />);
      // All-in state takes precedence - no data-timer-active attribute
      expect(screen.getByTestId('timer')).not.toHaveAttribute('data-timer-active');
    });
  });

  describe('color coding', () => {
    it('should apply red color class when time <= 10', () => {
      const { container } = render(<Timer timeBank={10} isActive={false} isAllIn={false} />);
      const span = container.querySelector('span');
      expect(span).toHaveClass('text-red-500');
      expect(span).toHaveClass('animate-pulse');
    });

    it('should apply yellow color class when time <= 30', () => {
      const { container } = render(<Timer timeBank={25} isActive={false} isAllIn={false} />);
      const span = container.querySelector('span');
      expect(span).toHaveClass('text-yellow-400');
    });

    it('should apply white color class when time > 30', () => {
      const { container } = render(<Timer timeBank={100} isActive={false} isAllIn={false} />);
      const span = container.querySelector('span');
      expect(span).toHaveClass('text-white');
    });
  });
});
