import { describe, it, expect, beforeEach, vi } from 'vitest';
import { playSound, isMuted, setMuted, toggleMuted, unlockAudio } from '../soundEngine';

// Shared capture arrays — populated by the mock AudioContext below. They are
// cleared (not reassigned) between tests so the module's cached singleton context
// keeps writing into the same arrays.
const oscillators: MockOscillator[] = [];
const contexts: MockAudioContext[] = [];

class MockOscillator {
  type = 'sine';
  frequency = { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockGain {
  gain = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  connect = vi.fn();
}

class MockAudioContext {
  state: 'running' | 'suspended' = 'running';
  currentTime = 0;
  destination = {};
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  createOscillator = vi.fn(() => {
    const osc = new MockOscillator();
    oscillators.push(osc);
    return osc;
  });
  createGain = vi.fn(() => new MockGain());
  constructor() {
    contexts.push(this);
  }
}

vi.stubGlobal('AudioContext', MockAudioContext);

describe('soundEngine', () => {
  beforeEach(() => {
    oscillators.length = 0;
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    setMuted(false);
  });

  it('synthesizes oscillators when a sound plays', () => {
    playSound('turn');
    // The "turn" cue is a two-note chime → two oscillators.
    expect(oscillators.length).toBe(2);
    expect(oscillators[0]!.start).toHaveBeenCalled();
    expect(oscillators[0]!.stop).toHaveBeenCalled();
  });

  it('plays nothing while muted', () => {
    setMuted(true);
    playSound('win');
    expect(oscillators.length).toBe(0);
  });

  it('persists the mute preference to localStorage', () => {
    setMuted(true);
    expect(isMuted()).toBe(true);
    expect(localStorage.getItem('bp-sound-muted')).toBe('1');

    setMuted(false);
    expect(isMuted()).toBe(false);
    expect(localStorage.getItem('bp-sound-muted')).toBe('0');
  });

  it('toggleMuted flips state and returns the new value', () => {
    expect(isMuted()).toBe(false);
    const nowMuted = toggleMuted();
    expect(nowMuted).toBe(true);
    expect(isMuted()).toBe(true);

    const nowUnmuted = toggleMuted();
    expect(nowUnmuted).toBe(false);
    expect(isMuted()).toBe(false);
  });

  it('resumes a suspended context on unlock', () => {
    // Force the singleton context to exist, then suspend it.
    playSound('check');
    const ctx = contexts[contexts.length - 1]!;
    ctx.state = 'suspended';
    ctx.resume.mockClear();

    unlockAudio();
    expect(ctx.resume).toHaveBeenCalled();
  });
});
