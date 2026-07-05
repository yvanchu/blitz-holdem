import { describe, it, expect } from 'vitest';
import { formatLastAction, type LastAction } from '../lastActionLabel';

function make(overrides: Partial<LastAction> = {}): LastAction {
  return { seatIndex: 1, action: 'check', totalBet: 0, isAllIn: false, ...overrides };
}

describe('formatLastAction', () => {
  it('returns null when there is no last action', () => {
    expect(formatLastAction(null, 0, 'Bob')).toBeNull();
  });

  describe('opponent perspective (viewer is seat 0, actor is seat 1)', () => {
    it('labels a check', () => {
      expect(formatLastAction(make({ action: 'check' }), 0, 'Bob')).toBe('Bob checked');
    });

    it('labels a fold', () => {
      expect(formatLastAction(make({ action: 'fold' }), 0, 'Bob')).toBe('Bob folded');
    });

    it('labels a call', () => {
      expect(formatLastAction(make({ action: 'call' }), 0, 'Bob')).toBe('Bob called');
    });

    it('labels a bet with the total amount', () => {
      expect(formatLastAction(make({ action: 'bet', totalBet: 5 }), 0, 'Bob')).toBe('Bob bet 5s');
    });

    it('labels a raise with the total facing amount', () => {
      expect(formatLastAction(make({ action: 'raise', totalBet: 12 }), 0, 'Bob')).toBe(
        'Bob raised to 12s'
      );
    });

    it('labels an all-in', () => {
      expect(formatLastAction(make({ action: 'all-in', totalBet: 40 }), 0, 'Bob')).toBe(
        'Bob went all-in'
      );
    });

    it('treats a bet/raise flagged all-in as an all-in', () => {
      expect(formatLastAction(make({ action: 'raise', totalBet: 40, isAllIn: true }), 0, 'Bob')).toBe(
        'Bob went all-in'
      );
    });

    it('falls back to "Opponent" when the alias is missing or blank', () => {
      expect(formatLastAction(make({ action: 'check' }), 0, null)).toBe('Opponent checked');
      expect(formatLastAction(make({ action: 'check' }), 0, '   ')).toBe('Opponent checked');
    });
  });

  describe('own perspective (viewer is the actor)', () => {
    it('labels your own action as "You"', () => {
      expect(formatLastAction(make({ seatIndex: 1, action: 'bet', totalBet: 5 }), 1, 'Bob')).toBe(
        'You bet 5s'
      );
    });

    it('labels your own all-in as "You"', () => {
      expect(
        formatLastAction(make({ seatIndex: 0, action: 'all-in', totalBet: 30 }), 0, 'Bob')
      ).toBe('You went all-in');
    });
  });

  it('uses "Opponent" wording when the viewer seat is unknown', () => {
    expect(formatLastAction(make({ action: 'check' }), null, 'Bob')).toBe('Bob checked');
  });
});
