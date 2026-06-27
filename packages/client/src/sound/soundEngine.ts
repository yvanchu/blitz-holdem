// Lightweight sound effects synthesized with the Web Audio API.
//
// We generate every cue procedurally instead of shipping audio files. This keeps
// the bundle tiny and sidesteps any licensing questions — there are no third-party
// assets to attribute. The tones can later be swapped for CC0 samples if desired.

export type SoundName = 'turn' | 'check' | 'call' | 'bet' | 'fold' | 'deal' | 'win' | 'lose';

const MUTE_STORAGE_KEY = 'bp-sound-muted';

let audioContext: AudioContext | null = null;
let muted = readMutedFromStorage();
let unlockBound = false;

function readMutedFromStorage(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) {
    try {
      audioContext = new Ctor();
    } catch {
      return null;
    }
  }
  return audioContext;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, value ? '1' : '0');
  } catch {
    // localStorage may be unavailable (private mode); mute still works in-memory.
  }
}

/** Toggle mute and return the new muted state. Plays a confirmation blip on unmute. */
export function toggleMuted(): boolean {
  setMuted(!muted);
  if (!muted) {
    unlockAudio();
    playSound('check');
  }
  return muted;
}

/**
 * Resume the AudioContext. Browsers block audio until a user gesture, so this is
 * called from the mute toggle and from the first interaction on the page.
 */
export function unlockAudio(): void {
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume();
  }
}

/** Register a one-shot listener that unlocks audio on the first user interaction. */
function bindUnlock(): void {
  if (unlockBound || typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return;
  }
  unlockBound = true;
  const handler = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', handler);
    window.removeEventListener('touchstart', handler);
  };
  window.addEventListener('pointerdown', handler);
  window.addEventListener('keydown', handler);
  window.addEventListener('touchstart', handler);
}

interface ToneSpec {
  freq: number;
  duration: number;
  type?: OscillatorType;
  /** Start offset from now, in seconds. */
  delay?: number;
  /** Peak gain, 0..1. */
  peak?: number;
  /** Linearly ramp the frequency to this value across the tone. */
  sweepTo?: number;
}

function playTone(ctx: AudioContext, spec: ToneSpec): void {
  const start = ctx.currentTime + (spec.delay ?? 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = spec.type ?? 'sine';
  osc.frequency.setValueAtTime(spec.freq, start);
  if (spec.sweepTo) {
    osc.frequency.linearRampToValueAtTime(spec.sweepTo, start + spec.duration);
  }

  const peak = spec.peak ?? 0.18;
  // Short attack and exponential decay to avoid clicks/pops.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + spec.duration + 0.03);
}

export function playSound(name: SoundName): void {
  if (muted) return;
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();

  switch (name) {
    case 'turn':
      // Rising two-note chime — "it's your action".
      playTone(ctx, { freq: 660, duration: 0.12, type: 'sine', peak: 0.22 });
      playTone(ctx, { freq: 990, duration: 0.17, type: 'sine', peak: 0.22, delay: 0.12 });
      break;
    case 'check':
      playTone(ctx, { freq: 440, duration: 0.1, type: 'sine', peak: 0.16 });
      break;
    case 'call':
      playTone(ctx, { freq: 523, duration: 0.12, type: 'triangle', peak: 0.16 });
      break;
    case 'bet':
      // Upward sweep — putting money in.
      playTone(ctx, { freq: 380, duration: 0.16, type: 'sawtooth', peak: 0.13, sweepTo: 720 });
      break;
    case 'fold':
      // Downward sweep — laying it down.
      playTone(ctx, { freq: 300, duration: 0.22, type: 'triangle', peak: 0.16, sweepTo: 170 });
      break;
    case 'deal':
      // Two soft ticks — cards hitting the felt.
      playTone(ctx, { freq: 880, duration: 0.05, type: 'square', peak: 0.06 });
      playTone(ctx, { freq: 1180, duration: 0.05, type: 'square', peak: 0.05, delay: 0.07 });
      break;
    case 'win':
      // Major arpeggio.
      playTone(ctx, { freq: 523, duration: 0.14, type: 'sine', peak: 0.2 });
      playTone(ctx, { freq: 659, duration: 0.14, type: 'sine', peak: 0.2, delay: 0.13 });
      playTone(ctx, { freq: 784, duration: 0.26, type: 'sine', peak: 0.2, delay: 0.26 });
      break;
    case 'lose':
      // Descending minor — better luck next hand.
      playTone(ctx, { freq: 392, duration: 0.18, type: 'triangle', peak: 0.15 });
      playTone(ctx, { freq: 294, duration: 0.3, type: 'triangle', peak: 0.15, delay: 0.16 });
      break;
  }
}

bindUnlock();
