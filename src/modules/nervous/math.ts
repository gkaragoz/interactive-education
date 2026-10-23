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
/** 1 inside [a, b] with smooth edges of width `e` (a pulse in time). */
export const window01 = (t: number, a: number, b: number, e = 0.4): number => ramp(t, a - e, a) - ramp(t, b, b + e);

/**
 * Monotone cubic (Fritsch-Carlson) curve through `points` (sorted by x): passes through every point, never
 * overshoots, and has a flat tangent at local extremes and at both ends.
 */
export function pchip(points: readonly (readonly [number, number])[]): (x: number) => number {
  const n = points.length;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1]! - ys[i]!) / (xs[i + 1]! - xs[i]!));
  const m: number[] = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const a = d[i - 1]!;
    const b = d[i]!;
    if (a * b <= 0) m[i] = 0;
    else {
      const h0 = xs[i]! - xs[i - 1]!;
      const h1 = xs[i + 1]! - xs[i]!;
      const w1 = 2 * h1 + h0;
      const w2 = h1 + 2 * h0;
      m[i] = (w1 + w2) / (w1 / a + w2 / b);
    }
  }
  return (x) => {
    if (x <= xs[0]!) return ys[0]!;
    if (x >= xs[n - 1]!) return ys[n - 1]!;
    let i = 0;
    while (x > xs[i + 1]!) i++;
    const h = xs[i + 1]! - xs[i]!;
    const t = (x - xs[i]!) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i]! + (t3 - 2 * t2 + t) * h * m[i]! + (-2 * t3 + 3 * t2) * ys[i + 1]! + (t3 - t2) * h * m[i + 1]!;
  };
}

/** Piecewise camera keys with smooth moves in between. */
export interface CamKey {
  t: number;
  pos: Vec3;
  target: Vec3;
}
export function cameraPath(keys: readonly CamKey[]): (t: number) => { position: Vec3; target: Vec3 } {
  return (t) => {
    const first = keys[0]!;
    if (t <= first.t) return { position: first.pos, target: first.target };
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1]!;
      const b = keys[i]!;
      if (t <= b.t) {
        const u = smooth((t - a.t) / (b.t - a.t));
        return {
          position: [lerp(a.pos[0], b.pos[0], u), lerp(a.pos[1], b.pos[1], u), lerp(a.pos[2], b.pos[2], u)],
          target: [lerp(a.target[0], b.target[0], u), lerp(a.target[1], b.target[1], u), lerp(a.target[2], b.target[2], u)],
        };
      }
    }
    const last = keys[keys.length - 1]!;
    return { position: last.pos, target: last.target };
  };
}
