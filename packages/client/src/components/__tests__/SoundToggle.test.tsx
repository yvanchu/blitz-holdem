import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SoundToggle } from '../SoundToggle';
import { setMuted } from '../../sound/soundEngine';

describe('SoundToggle', () => {
  beforeEach(() => {
    setMuted(false);
  });

  it('renders as unmuted by default', () => {
    render(<SoundToggle />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('aria-label', 'Mute sound effects');
  });

  it('toggles to muted when clicked', () => {
    render(<SoundToggle />);
    const button = screen.getByRole('button');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('aria-label', 'Unmute sound effects');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('aria-label', 'Mute sound effects');
  });
});
