import { describe, it, expect } from 'vitest';
import { formatLastActionLabel } from '../lastAction';

describe('formatLastActionLabel', () => {
  it('labels a check', () => {
    expect(formatLastActionLabel('check', 0, false)).toBe('Checked');
  });

  it('labels a call', () => {
    expect(formatLastActionLabel('call', 4, false)).toBe('Called');
  });

  it('labels a fold', () => {
    expect(formatLastActionLabel('fold', 0, false)).toBe('Folded');
  });

  it('labels a bet with the absolute amount', () => {
    expect(formatLastActionLabel('bet', 6, false)).toBe('Bet 6s');
  });

  it('labels a raise as "Raised to" the total street bet', () => {
    expect(formatLastActionLabel('raise', 12, false)).toBe('Raised to 12s');
  });

  it('rounds fractional bet amounts', () => {
    expect(formatLastActionLabel('bet', 6.4, false)).toBe('Bet 6s');
    expect(formatLastActionLabel('raise', 11.6, false)).toBe('Raised to 12s');
  });

  it('labels an explicit all-in action', () => {
    expect(formatLastActionLabel('all-in', 0, false)).toBe('All-in');
  });

  it('prefers "All-in" when the player is all-in, even for a raise', () => {
    expect(formatLastActionLabel('raise', 50, true)).toBe('All-in');
    expect(formatLastActionLabel('call', 50, true)).toBe('All-in');
  });
});
