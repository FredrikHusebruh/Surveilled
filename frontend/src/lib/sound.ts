import { z } from "zod";
import { readStored, writeStored } from "./storage.ts";

/**
 * The office's sounds, synthesised with Web Audio so there are no files to load: a typewriter
 * keystroke for every cell typed onto the record, a camera shutter when a camera is marked, a
 * rubber stamp's thud when a Party record is stamped False, a soft tick when either is taken back,
 * a desk lamp's click and a breath of air when a number's lines light up, the folder's seal
 * cracking and its cover swinging open, the platen's ratchet when
 * a fresh sheet is fed in, the carriage bell when a
 * record is filed, and the typewriter jamming when the player is seen (with a soft siren when
 * that loses the record). The player can turn it off; that choice is a
 * per-viewer convenience kept in localStorage (the "sound" key, named in the privacy notice).
 */

const STORAGE_KEY = "sound";
/** Keystrokes closer together than this merge into one, so a cascade patters instead of buzzing. */
const MIN_GAP_MS = 18;
/** A cascade's patter never runs to more keystrokes than this. */
const MAX_KEYS = 16;

let on = readStored(STORAGE_KEY, z.boolean(), true);
const listeners = new Set<() => void>();
let context: AudioContext | null = null;
let master: AudioNode | null = null;
let noise: AudioBuffer | null = null;
let longNoise: AudioBuffer | null = null;

/** Whether the sound is on. */
export function soundOn(): boolean {
  return on;
}

/** Turn the sound on or off, and remember it in this browser. */
export function setSoundOn(next: boolean): void {
  on = next;
  writeStored(STORAGE_KEY, next);
  for (const listener of listeners) listener();
}

/** For `useSyncExternalStore`: called whenever the sound is turned on or off. */
export function subscribeSound(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/**
 * Wake the audio inside a tap or key press. Browsers (iOS Safari above all) only let a page start
 * audio from a user gesture, and the sounds play later, once the server has answered.
 */
export function wakeSound(): void {
  if (on) audio();
}

/** One keystroke per typed cell, `delays` (ms from now) matching the cells' animation. */
export function typeKeys(delays: Iterable<number>): void {
  play((ctx, out, now) => {
    let last = -Infinity;
    let count = 0;
    for (const delay of [...delays].sort((a, b) => a - b)) {
      if (delay - last < MIN_GAP_MS || count === MAX_KEYS) continue;
      keystroke(ctx, out, now + delay / 1000, count === 0 ? 1 : 0.6 + Math.random() * 0.3);
      last = delay;
      count += 1;
    }
  });
}

/**
 * One typewriter keystroke, built like the shutter from short, hard clicks: the typebar's impact
 * on the platen, the clack of metal ringing at two narrow resonances (a little different each
 * time, as no two keys sound alike), a small, short knock of the platen, and the escapement's
 * tick as the carriage steps on a space.
 */
function keystroke(ctx: AudioContext, out: AudioNode, at: number, accent: number): void {
  const pitch = 0.9 + Math.random() * 0.2;
  burst(ctx, out, at, { type: "highpass", frequency: 1800, q: 0.7, level: 0.9 * accent, decay: 0.008 });
  burst(ctx, out, at, { type: "bandpass", frequency: 1350 * pitch, q: 9, level: 1.6 * accent, decay: 0.045 });
  burst(ctx, out, at, { type: "bandpass", frequency: 3100 * pitch, q: 10, level: 1 * accent, decay: 0.03 });
  thump(ctx, out, at, { from: 220, to: 110, level: 0.25 * accent, decay: 0.025 });
  burst(ctx, out, at + 0.028, { type: "highpass", frequency: 4500, q: 0.8, level: 0.3 * accent, decay: 0.006 });
}

/** A camera shutter: a camera was marked. Two quick mechanical clicks, open and shut. */
export function shutter(): void {
  play((ctx, out, now) => {
    burst(ctx, out, now, { type: "highpass", frequency: 3200, q: 0.8, level: 0.7, decay: 0.018 });
    thump(ctx, out, now, { from: 260, to: 120, level: 0.25, decay: 0.03 });
    burst(ctx, out, now + 0.055, { type: "bandpass", frequency: 1900, q: 1.2, level: 0.45, decay: 0.03 });
  });
}

/** When the False stamp's thunk (index.css) hits the paper, in seconds after it starts. */
const STAMP_LANDS_S = 0.16;

/**
 * A rubber stamp coming down: a Party record was stamped False. A low thud and a muffled smack,
 * timed to the moment the stamp's animation hits the paper.
 */
export function stampThud(): void {
  play((ctx, out, now) => {
    const at = now + STAMP_LANDS_S;
    thump(ctx, out, at, { from: 120, to: 42, level: 0.85, decay: 0.2 });
    burst(ctx, out, at, { type: "lowpass", frequency: 650, q: 0.7, level: 0.8, decay: 0.09 });
    burst(ctx, out, at, { type: "bandpass", frequency: 3000, q: 2, level: 0.15, decay: 0.012 });
  });
}

/** How many teeth of the platen's ratchet click past as a fresh sheet is fed in. */
const FEED_CLICKS = 7;

/**
 * A fresh sheet fed into the typewriter: the platen knob's ratchet, a quick run of soft clicks
 * over the low roll of the platen. Only once a tap has woken the audio: a sheet that is simply
 * there when the page loads makes no sound, and the browser is never asked to start audio unasked.
 */
export function feedPaper(): void {
  if (context === null || context.state !== "running") return;
  play((ctx, out, now) => {
    thump(ctx, out, now, { from: 140, to: 80, level: 0.12, decay: 0.2 });
    for (let k = 0; k < FEED_CLICKS; k++) {
      const at = now + 0.02 + k * 0.03 + Math.random() * 0.004;
      burst(ctx, out, at, { type: "bandpass", frequency: k % 2 === 0 ? 2600 : 2200, q: 3, level: 0.16, decay: 0.012 });
    }
  });
}

/** A soft tick: a mark or a stamp was taken back. */
export function tick(): void {
  play((ctx, out, now) => {
    burst(ctx, out, now, { type: "bandpass", frequency: 1500, q: 1.5, level: 0.3, decay: 0.02 });
  });
}

/**
 * A number's lines lighting up: the soft click of a desk-lamp switch, then a faint breath of air
 * rising in pitch as the light sweeps outward, lasting `sweepMs`, as long as the sweep on screen.
 * Kept well below the keystroke, since it answers every tap on a number.
 */
export function lightLines(sweepMs: number): void {
  play((ctx, out, now) => {
    burst(ctx, out, now, { type: "bandpass", frequency: 2200, q: 3, level: 0.18, decay: 0.012 });
    thump(ctx, out, now, { from: 320, to: 220, level: 0.06, decay: 0.02 });
    swell(ctx, out, now, { type: "bandpass", from: 700, to: 2600, q: 1.5, level: 0.05, attack: 0.04, length: 0.09 + sweepMs / 1000 });
  });
}

/** When the folder's animations (index.css) start, in seconds after the tap. */
const COVER_SWINGS_S = 0.22;
const COVER_SWING_S = 0.6;
const ORDERS_LIFT_S = 0.75;
const ORDERS_LIFT_LENGTH_S = 0.45;
const WAX_CRUMBS = 5;

/**
 * Opening the sealed folder, timed to its animation: the wax seal cracks (a sharp snap, crumbs
 * of wax and a dull give), the manila cover swings open with a soft flap and a breath of air,
 * then the orders slide out of the folder with a dry paper hiss.
 */
export function openFolder(): void {
  play((ctx, out, now) => {
    burst(ctx, out, now, { type: "highpass", frequency: 2800, q: 0.7, level: 0.55, decay: 0.015 });
    burst(ctx, out, now + 0.012, { type: "bandpass", frequency: 1200, q: 1, level: 0.45, decay: 0.04 });
    thump(ctx, out, now, { from: 180, to: 70, level: 0.3, decay: 0.07 });
    for (let k = 0; k < WAX_CRUMBS; k++) {
      const at = now + 0.025 + Math.random() * 0.09;
      burst(ctx, out, at, { type: "highpass", frequency: 3500, q: 0.8, level: 0.12 + Math.random() * 0.1, decay: 0.008 });
    }
    const cover = now + COVER_SWINGS_S;
    thump(ctx, out, cover, { from: 150, to: 90, level: 0.1, decay: 0.05 });
    swell(ctx, out, cover, { type: "bandpass", from: 320, to: 900, q: 0.8, level: 0.09, attack: 0.25, length: COVER_SWING_S });
    const orders = now + ORDERS_LIFT_S;
    swell(ctx, out, orders, { type: "bandpass", from: 2600, to: 4200, q: 0.7, level: 0.045, attack: 0.1, length: ORDERS_LIFT_LENGTH_S });
  });
}

/** The lamp switched off: a number let go. A softer click than switching it on. */
export function lightsOff(): void {
  play((ctx, out, now) => {
    burst(ctx, out, now, { type: "bandpass", frequency: 1700, q: 3, level: 0.12, decay: 0.01 });
  });
}

/** The carriage bell, `delay` ms from now: the record is filed. */
export function ringBell(delay: number): void {
  play((ctx, out, now) => {
    const at = now + delay / 1000;
    // A bell is inharmonic: a strong fundamental and fainter, faster-dying partials above it.
    for (const [ratio, level, decay] of [
      [1, 0.22, 1.6],
      [2.76, 0.07, 0.7],
      [5.4, 0.03, 0.3],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.frequency.value = 1760 * ratio;
      osc.connect(envelope(ctx, out, at, level, decay));
      osc.start(at);
      osc.stop(at + decay + 0.05);
    }
  });
}

/**
 * The player was seen: a strike, or with `lost` the third, which also sounds the siren. The
 * typewriter jams: four typebars crash together within a few milliseconds, scraping, and the bell
 * is struck sour (two tones a semitone apart).
 */
export function seen(lost: boolean): void {
  play((ctx, out, now) => {
    for (let key = 0; key < 4; key++) keystroke(ctx, out, now + Math.random() * 0.025, 0.8);
    burst(ctx, out, now + 0.02, { type: "bandpass", frequency: 2200, q: 3, level: 0.5, decay: 0.15 });
    for (const frequency of [1760, 1865]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = frequency;
      osc.connect(envelope(ctx, out, now + 0.06, 0.12, 0.8));
      osc.start(now + 0.06);
      osc.stop(now + 0.9);
    }
    if (lost) siren(ctx, out, now);
  });
}

/** Each light of the overlay's siren (AlarmOverlay.tsx) shows for this long. */
const SIREN_HALF_S = 0.4;
/** The siren sounds for the first two of the lights' four cycles, then has faded out. */
const SIREN_STEPS = 4;
const SIREN_HIGH = 700;
const SIREN_LOW = 560;

/**
 * The loss siren, kept in the distance: a soft police two-tone (a rounded triangle wave, low and
 * quiet), high while the red light shows and low while the blue does. It sounds for the first two
 * cycles of the lights and fades out under them; the lights carry on in silence.
 */
function siren(ctx: AudioContext, out: AudioNode, now: number): void {
  const end = now + SIREN_STEPS * SIREN_HALF_S;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(SIREN_HIGH, now);
  for (let step = 1; step < SIREN_STEPS; step++) {
    const at = now + step * SIREN_HALF_S;
    const [held, next] = step % 2 === 0 ? [SIREN_LOW, SIREN_HIGH] : [SIREN_HIGH, SIREN_LOW];
    // Hold the note until just before the light changes, then glide to the next.
    osc.frequency.setValueAtTime(held, at - 0.04);
    osc.frequency.linearRampToValueAtTime(next, at);
  }
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.035, now + 0.12);
  gain.gain.setValueAtTime(0.035, now + 0.8);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(filter).connect(gain).connect(out);
  osc.start(now);
  osc.stop(end + 0.02);
}

/** Run `sound` on the shared audio graph, unless the sound is off or Web Audio is missing. */
function play(sound: (ctx: AudioContext, out: AudioNode, now: number) => void): void {
  const ctx = on ? audio() : null;
  if (ctx === null || master === null) return;
  sound(ctx, master, ctx.currentTime);
}

/** The shared audio graph, created on first use. Null where Web Audio is missing. */
function audio(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (context === null) {
    context = new AudioContext();
    // A compressor keeps a fast cascade from clipping when keystrokes overlap.
    const compressor = context.createDynamicsCompressor();
    const gain = context.createGain();
    gain.gain.value = 0.5;
    compressor.connect(gain).connect(context.destination);
    master = compressor;
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

/** A gain that strikes to `level` at `at` and dies away exponentially over `decay` seconds. */
function envelope(ctx: AudioContext, out: AudioNode, at: number, level: number, decay: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  gain.connect(out);
  return gain;
}

type Burst = { type: BiquadFilterType; frequency: number; q: number; level: number; decay: number };

/** A filtered crack of noise: the hard edge of a strike. */
function burst(ctx: AudioContext, out: AudioNode, at: number, { type, frequency, q, level, decay }: Burst): void {
  noise ??= whiteNoise(ctx, SHORT_NOISE_S);
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  source.connect(filter).connect(envelope(ctx, out, at, level, decay));
  source.start(at);
  source.stop(at + Math.min(decay + 0.02, noise.duration));
}

type Swell = { type: BiquadFilterType; from: number; to: number; q: number; level: number; attack: number; length: number };

/**
 * A breath of filtered noise that swells over `attack` and dies away by `length` seconds, its
 * filter gliding from `from` to `to` Hz: air moving, a lamp's light spreading, paper sliding.
 */
function swell(ctx: AudioContext, out: AudioNode, at: number, { type, from, to, q, level, attack, length }: Swell): void {
  // A long stretch of noise: a short one looped repeats audibly, a flutter under the sound.
  longNoise ??= whiteNoise(ctx, LONG_NOISE_S);
  const source = ctx.createBufferSource();
  source.buffer = longNoise;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(to, at + length);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  source.connect(filter).connect(gain).connect(out);
  source.start(at);
  source.stop(at + length + 0.02);
}

type Thump = { from: number; to: number; level: number; decay: number };

/** A short tone falling in pitch: the body of a blow. */
function thump(ctx: AudioContext, out: AudioNode, at: number, { from, to, level, decay }: Thump): void {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + decay * 0.8);
  osc.connect(envelope(ctx, out, at, level, decay));
  osc.start(at);
  osc.stop(at + decay + 0.02);
}

/** Noise for the bursts: long enough for the longest. */
const SHORT_NOISE_S = 0.12;
/** Noise for the swells: longer than any of them, so the loop never repeats within one. */
const LONG_NOISE_S = 2;

/** `seconds` of white noise. */
function whiteNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}
