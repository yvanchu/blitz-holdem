import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';

// These defaults are the game's core "time economy" contract. The initial time
// bank default (300s) is deliberately encoded in the e2e suite
// (settings.spec.ts asserts the settings input defaults to "300", and
// timerDrain.spec.ts asserts play starts near 300s), so pin it here too to keep
// the docs, the code comment, and the tests from drifting apart again.
describe('DEFAULT_SETTINGS', () => {
  it('uses the default initial time bank of 300 seconds', () => {
    expect(DEFAULT_SETTINGS.initialTimeBank).toBe(300);
  });

  it('uses the spec default blinds (SB 1s / BB 2s)', () => {
    expect(DEFAULT_SETTINGS.smallBlind).toBe(1);
    expect(DEFAULT_SETTINGS.bigBlind).toBe(2);
  });

  it('keeps the big blind at twice the small blind', () => {
    expect(DEFAULT_SETTINGS.bigBlind).toBe(DEFAULT_SETTINGS.smallBlind * 2);
  });
});
