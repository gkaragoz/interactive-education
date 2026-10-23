import type { Vec3 } from '../../scene';

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Smoothstep ease between 0 and 1. */
export const smooth = (x: number): number => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
/** Smooth 0 to 1 ramp between `a` and `b`. */
export const ramp = (t: number, a: number, b: number): number => smooth(b === a ? (t >= b ? 1 : 0) : (t - a) / (b - a));

/** Key (time, value) pairs; values ease with a smoothstep between neighbouring keys (flat tangents at every key). */
export type Keys = ReadonlyArray<readonly [number, number]>;
export function evalKeys(keys: Keys, t: number): number {
  const first = keys[0]!;
  if (t <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]!;
    const b = keys[i]!;
    if (t <= b[0]) return lerp(a[1], b[1], smooth((t - a[0]) / (b[0] - a[0])));
  }
  return keys[keys.length - 1]![1];
}

/** Cheap deterministic hash in [0, 1) of an integer (per-head phase offsets, jitter). */
export function hash01(n: number): number {
  let x = (n + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** Decimal comma, one decimal: 2.4 -> "2,4". */
export const fmt1 = (v: number): string => v.toFixed(1).replace('.', ',');

export const v3 = (x: number, y: number, z: number): Vec3 => [x, y, z];
