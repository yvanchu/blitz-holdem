import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock router so HomePage can call useNavigate without a real Router.
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

import HomePage from '../HomePage';

describe('HomePage', () => {
  it('renders the core entry points', () => {
    render(<HomePage />);
    expect(screen.getByText('💥 Bullet Poker')).toBeInTheDocument();
    expect(screen.getByTestId('alias-input')).toBeInTheDocument();
    expect(screen.getByTestId('create-table-button')).toBeInTheDocument();
  });

  // The landing page should share the poker-table felt aesthetic (UX §10 "Dark
  // Theme Rationale") rather than sitting on plain gray, so the transition into
  // the table feels cohesive. The table uses `bg-felt`; the home page must too.
  it('uses the felt background to match the table aesthetic', () => {
    render(<HomePage />);
    expect(screen.getByTestId('home-page')).toHaveClass('bg-felt');
  });
});
