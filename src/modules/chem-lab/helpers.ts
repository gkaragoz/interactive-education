/**
 * Pure helpers of the lab render layer (no three.js, no DOM): mappings from engine state to what is drawn.
 * Everything here is unit-tested in `tests/modules/chemLabHelpers.test.ts`.
 */

export type Rgb = readonly [number, number, number];

export const clamp = (x: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, x));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Frame-rate independent exponential approach: `rate` is 1/s (higher = faster). */
export function approach(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.exp(-Math.max(0, rate) * Math.max(0, dt));
}

/** Level of a liquid in a vessel's local space: `fill` 0..1 maps onto the usable range of the `inner` mesh (meta.liquid). */
export const levelY = (fill: number, yMin: number, yMax: number): number => yMin + clamp(fill) * (yMax - yMin);

/** Which fraction of the usable range a given height covers (inverse of `levelY`). */
export const fillAt = (y: number, yMin: number, yMax: number): number => clamp((y - yMin) / Math.max(1e-6, yMax - yMin));

/** Height of a settled layer: grams of solid, its density (g/mL) and the cross-section of the vessel (cm2). */
export function layerHeightCm(massG: number, densityGPerMl: number, areaCm2: number, packing = 0.6): number {
  if (massG <= 0 || areaCm2 <= 0) return 0;
  return massG / densityGPerMl / packing / areaCm2;
}

/** Foam rises above the liquid: foam volume (mL) over the cross-section; cm. */
export const foamHeightCm = (foamMl: number, areaCm2: number): number => (areaCm2 > 0 ? Math.max(0, foamMl) / areaCm2 : 0);

/** Display colour mixing in linear light, so two liquids blend like light and not like a muddy average. */
const toLin = (c: number): number => Math.pow(clamp(c / 255), 2.2);
const fromLin = (c: number): number => Math.round(255 * Math.pow(clamp(c), 1 / 2.2));
export function mixRgb(a: Rgb, b: Rgb, t: number): [number, number, number] {
  const k = clamp(t);
  return [0, 1, 2].map((i) => fromLin(lerp(toLin(a[i] ?? 0), toLin(b[i] ?? 0), k))) as [number, number, number];
}

/**
 * Bubbles per second for one vessel from the engine's 0..1 gas intensity. `quality` thins them out; reduced motion keeps
 * a calm trickle so the learner still sees that gas is produced.
 */
export function bubbleRate(intensity: number, quality: 'low' | 'medium' | 'high', reduced = false): number {
  const k = quality === 'low' ? 14 : quality === 'medium' ? 42 : 70;
  const rate = clamp(intensity) * k;
  return reduced ? Math.min(rate, 6) : rate;
}

/** How fast a bubble of the given radius rises (cm/s): faster for a stronger reaction, never 0. */
export const bubbleRise = (intensity: number, radiusCm: number): number => 2.2 + 5 * clamp(intensity) + 6 * radiusCm;

/** Number of foam/steam/sprite particles allowed by the quality preset. */
export const POOLS = {
  low: { bubbles: 120, steam: 0, crystals: 120, drops: 40 },
  medium: { bubbles: 420, steam: 90, crystals: 360, drops: 120 },
  high: { bubbles: 900, steam: 160, crystals: 600, drops: 200 },
} as const;

/** Tilt (radians) of a pouring vessel by progress 0..1 of the pour: eases in, holds, eases out. `max` is the full tilt. */
export function pourTilt(progress: number, max = 1.25): number {
  const p = clamp(progress);
  const up = smoothstep(0, 0.25, p);
  const down = 1 - smoothstep(0.8, 1, p);
  return max * Math.min(up, down);
}

/** mL per second for a pour: a gentle trickle at small tilt, a full stream when tipped; `scale` is the learner's wheel factor. */
export const pourFlow = (tilt01: number, scale = 1): number => 8 + 52 * clamp(tilt01) * clamp(scale, 0.25, 4);

/** Radius (cm) of the liquid stream for a flow in mL/s. */
export const streamRadius = (mlPerS: number): number => 0.12 + 0.05 * Math.sqrt(Math.max(0, mlPerS));

/** Seconds a single pour step of `ml` takes at a given flow, clamped so it never feels stuck or instant. */
export const pourSeconds = (ml: number, flow = 40): number => clamp(ml / Math.max(1, flow), 0.45, 4);

/** Thermometer: top of the red column in the thermometer asset's local y (meta: -10 C at 3.2, 110 C at 20). */
export const thermometerTopY = (tempC: number): number => 3.2 + ((clamp(tempC, -10, 110) + 10) / 120) * (20 - 3.2);

/** Balance display text, always two decimals with a decimal comma (Turkish). */
export function balanceText(grams: number | null): string {
  if (grams === null || !Number.isFinite(grams)) return '-.--';
  const v = Math.abs(grams) < 0.005 ? 0 : grams;
  return v.toFixed(2).replace('.', ',');
}

/** Flame size 0..1 from the engine's heat state (blue Bunsen biggest, alcohol smallest). */
export function flameSize(source: string | null): number {
  switch (source) {
    case 'bunsen-blue': return 1;
    case 'bunsen-yellow': return 0.8;
    case 'alcohol': return 0.55;
    default: return 0;
  }
}

/** Steam density 0..1 from the liquid temperature: nothing below 55 C, full at the boiling point. */
export const steamDensity = (tempC: number, volumeMl: number): number => (volumeMl <= 0.5 ? 0 : smoothstep(55, 100, tempC));

/** Glow 0..1 to emissive colour of hot metal (dull red, orange, yellow-white). */
export function glowColor(glow: number): [number, number, number] {
  const g = clamp(glow);
  return [1.0 * (0.4 + 0.6 * g), 0.18 + 0.62 * g * g, 0.03 + 0.5 * g * g * g];
}

/** Photosensitivity guard: the flash value actually drawn, rate-limited (max change per second) and capped when soft. */
export function limitFlash(current: number, target: number, dt: number, soft: boolean): number {
  const cap = soft ? 0.35 : 1;
  const want = Math.min(target, cap);
  const maxRise = soft ? 1.6 : 6;
  const maxFall = soft ? 1.2 : 2.5;
  const delta = want - current;
  return current + clamp(delta, -maxFall * dt, maxRise * dt);
}

/** Wobble amplitude (cm) of a liquid surface from stirring, recent pouring and boiling; zero when motion is reduced. */
export function wobbleAmplitude(stirring: boolean, pouring: number, boiling: number, reduced: boolean): number {
  if (reduced) return 0;
  return 0.02 + (stirring ? 0.1 : 0) + 0.12 * clamp(pouring) + 0.08 * clamp(boiling);
}

/** Pending sparkle crystals for a dissolving solid: count from mass, never more than `max`, at least 1 while any is left. */
export function crystalCount(massG: number, max: number, powder: boolean): number {
  if (massG <= 0.0005) return 0;
  const n = powder ? 10 + massG * 24 : 1 + massG * 5;
  return Math.max(1, Math.min(max, Math.round(n)));
}

/** Size factor of a dissolving lump: 1 at `startG`, shrinking with the cube root of the remaining mass. */
export const lumpScale = (massG: number, startG: number): number => (startG <= 0 ? 0 : Math.cbrt(clamp(massG / startG)));

/** GLSL smoothstep that is also defined for reversed edges (the built-in is undefined when edge0 >= edge1). */
export const GLSL_SS = 'float ss(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }';
