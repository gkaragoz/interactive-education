import { Vector3 } from 'three';
import type { Vec3 } from '../../scene';

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smooth = (x: number): number => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
/** Smooth 0..1 ramp between `a` and `b`. */
export const ramp = (t: number, a: number, b: number): number => smooth(b === a ? (t >= b ? 1 : 0) : (t - a) / (b - a));

/** A waypoint: time, x, y, z. */
export type Key = readonly [number, number, number, number];

/**
 * A smooth path through timed waypoints (cubic Hermite with finite-difference tangents): a pure function of t,
 * clamped to its first and last time. Used for molecules and camera shots alike.
 */
export class Path {
  readonly t0: number;
  readonly t1: number;
  private readonly k: Float32Array;
  private readonly n: number;

  constructor(keys: readonly Key[]) {
    this.n = keys.length;
    this.k = new Float32Array(this.n * 4);
    keys.forEach((key, i) => this.k.set(key, i * 4));
    this.t0 = keys[0]?.[0] ?? 0;
    this.t1 = keys[this.n - 1]?.[0] ?? 0;
  }

  private tan(i: number, axis: number): number {
    const a = Math.max(i - 1, 0);
    const b = Math.min(i + 1, this.n - 1);
    const dt = this.k[b * 4]! - this.k[a * 4]!;
    return dt > 0 ? (this.k[b * 4 + axis]! - this.k[a * 4 + axis]!) / dt : 0;
  }

  at(t: number, out: Vector3): Vector3 {
    const k = this.k;
    if (this.n === 1 || t <= this.t0) return out.set(k[1]!, k[2]!, k[3]!);
    if (t >= this.t1) return out.set(k[(this.n - 1) * 4 + 1]!, k[(this.n - 1) * 4 + 2]!, k[(this.n - 1) * 4 + 3]!);
    let i = 0;
    while (i < this.n - 2 && t > k[(i + 1) * 4]!) i++;
    const h = k[(i + 1) * 4]! - k[i * 4]!;
    const u = h > 0 ? (t - k[i * 4]!) / h : 0;
    const u2 = u * u;
    const u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1;
    const h10 = u3 - 2 * u2 + u;
    const h01 = -2 * u3 + 3 * u2;
    const h11 = u3 - u2;
    const c = (axis: number): number =>
      h00 * k[i * 4 + axis]! + h10 * h * this.tan(i, axis) + h01 * k[(i + 1) * 4 + axis]! + h11 * h * this.tan(i + 1, axis);
    return out.set(c(1), c(2), c(3));
  }
}

/** One camera shot: both position and target follow paths over [t0, t1]. */
export interface Shot {
  t0: number;
  t1: number;
  pos: Path;
  target: Path;
}

/** Build a shot from `[t, position, target]` keys. */
export function shot(keys: readonly (readonly [number, Vec3, Vec3])[]): Shot {
  const first = keys[0]!;
  const last = keys[keys.length - 1]!;
  return {
    t0: first[0],
    t1: last[0],
    pos: new Path(keys.map(([t, p]) => [t, p[0], p[1], p[2]] as const)),
    target: new Path(keys.map(([t, , g]) => [t, g[0], g[1], g[2]] as const)),
  };
}

const P = new Vector3();
const G = new Vector3();
/** Camera at `t`: the shot that contains it (the last one whose start has passed). */
export function cameraFrom(shots: readonly Shot[], t: number): { position: Vec3; target: Vec3 } {
  let s = shots[0]!;
  for (const c of shots) if (t >= c.t0) s = c;
  s.pos.at(t, P);
  s.target.at(t, G);
  return { position: [P.x, P.y, P.z], target: [G.x, G.y, G.z] };
}
