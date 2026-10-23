// Small pure helpers shared by every track: easing, windows, deterministic noise. No state, no allocation.

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
/** 0 before `a`, 1 after `b`, linear between. */
export const seg = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));
export const smooth = (x: number): number => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};
/** Smoothstep of a time window. */
export const win = (t: number, a: number, b: number): number => smooth((t - a) / (b - a));
export const smoother = (x: number): number => {
  const k = clamp01(x);
  return k * k * k * (k * (k * 6 - 15) + 10);
};
/** Rises over [a,b], falls over [c,d]. */
export const pulse = (t: number, a: number, b: number, c: number, d: number): number => win(t, a, b) * (1 - win(t, c, d));
/**
 * Grows from 0 to 1 with zero speed at both ends and a small overshoot in the middle (a soft "snap" when a part lands).
 * It starts slowly, so a part that appears never pops in at a visible size.
 */
export const easeBack = (x: number): number => {
  const k = clamp01(x);
  return smoother(k) * (1 + 0.16 * Math.sin(Math.PI * k));
};

/** Deterministic pseudo random number in [0,1) from an integer key and a channel (no state). */
export function hash(n: number, channel = 0): number {
  const v = Math.sin(n * 127.1 + channel * 311.7 + 17.13) * 43758.5453;
  return v - Math.floor(v);
}

/** Linear interpolation of a sorted keyframe list `[time, value]` (clamped at the ends). */
export function curve(keys: readonly (readonly [number, number])[], t: number): number {
  const first = keys[0] as readonly [number, number];
  if (t <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i] as readonly [number, number];
    if (t <= b[0]) {
      const a = keys[i - 1] as readonly [number, number];
      return lerp(a[1], b[1], (t - a[0]) / (b[0] - a[0] || 1));
    }
  }
  return (keys[keys.length - 1] as readonly [number, number])[1];
}
