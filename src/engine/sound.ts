export type SfxType =
  | 'step'
  | 'hit'
  | 'crit'
  | 'hurt'
  | 'skill'
  | 'essence'
  | 'loot'
  | 'portal'
  | 'levelup'
  | 'warning';

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!sharedCtx) {
    sharedCtx = new AudioCtor();
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  endFreq: number,
  duration: number,
  type: OscillatorType,
  gainVal: number,
  delay = 0
) {
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), start + duration);

  gain.gain.setValueAtTime(gainVal, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

export function playSfx(sfx: SfxType, muted: boolean): void {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    switch (sfx) {
      case 'step':
        playTone(ctx, 130, 85, 0.05, 'triangle', 0.05);
        break;
      case 'hit':
        playTone(ctx, 220, 75, 0.11, 'sawtooth', 0.12);
        break;
      case 'crit':
        playTone(ctx, 360, 110, 0.14, 'sawtooth', 0.16);
        playTone(ctx, 640, 260, 0.14, 'square', 0.1, 0.04);
        break;
      case 'hurt':
        playTone(ctx, 150, 55, 0.16, 'sawtooth', 0.14);
        break;
      case 'skill':
        playTone(ctx, 320, 620, 0.18, 'sine', 0.11);
        break;
      case 'essence':
        playTone(ctx, 420, 840, 0.2, 'sine', 0.12);
        playTone(ctx, 630, 1080, 0.25, 'triangle', 0.09, 0.08);
        break;
      case 'loot':
        playTone(ctx, 560, 880, 0.09, 'triangle', 0.09);
        break;
      case 'portal':
        playTone(ctx, 240, 520, 0.28, 'sine', 0.12);
        break;
      case 'levelup':
        playTone(ctx, 440, 554, 0.12, 'triangle', 0.12, 0);
        playTone(ctx, 554, 659, 0.12, 'triangle', 0.12, 0.1);
        playTone(ctx, 659, 880, 0.22, 'triangle', 0.14, 0.2);
        break;
      case 'warning':
        playTone(ctx, 180, 140, 0.2, 'square', 0.11, 0);
        playTone(ctx, 180, 120, 0.25, 'square', 0.11, 0.22);
        break;
    }
  } catch {
    // Ignore audio errors
  }
}
