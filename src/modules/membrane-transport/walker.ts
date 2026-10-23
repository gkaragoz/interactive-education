import { Vector3 } from 'three';
import type { Rng } from '../../core';
import { clamp01, smooth } from './math';

/** Brownian-looking jitter as a pure function of time: a few incommensurate sines per axis. */
export interface Wander {
  a: Float32Array;
  f: Float32Array;
  p: Float32Array;
  amp: number;
}
const TERMS = 4;

export function makeWander(rng: Rng, amp: number): Wander {
  const n = 3 * TERMS;
  const w: Wander = { a: new Float32Array(n), f: new Float32Array(n), p: new Float32Array(n), amp };
  for (let i = 0; i < n; i++) {
    const fast = i % TERMS === TERMS - 1;
    w.f[i] = fast ? 5.2 + rng() * 3 : 0.7 + rng() * 2.4;
    w.a[i] = fast ? 0.13 : 0.29;
    w.p[i] = rng() * Math.PI * 2;
  }
  return w;
}

export function wanderAt(w: Wander, t: number, out: Vector3): Vector3 {
  const s = [0, 0, 0];
  for (let axis = 0; axis < 3; axis++) {
    let v = 0;
    for (let k = 0; k < TERMS; k++) {
      const i = axis * TERMS + k;
      v += w.a[i]! * Math.sin(w.f[i]! * t + w.p[i]!);
    }
    s[axis] = v;
  }
  return out.set(s[0]! * w.amp, s[1]! * w.amp, s[2]! * w.amp * 0.6);
}

/** Where a molecule rests (and jitters) between two passages. */
export type HomeFn = (t: number, out: Vector3) => void;
export const fixedHome =
  (x: number, y: number, z: number): HomeFn =>
  (_t, out) => {
    out.set(x, y, z);
  };

/** One passage through a gate: walk to the gate, ride through it, walk to the new home. */
export interface Leg {
  t0: number;
  tIn: number;
  tOut: number;
  t1: number;
  /** Time the molecule counts as having crossed (used for side and flux counts). */
  tCross: number;
  /** +1 outside to inside, -1 inside to outside. */
  dir: 1 | -1;
  gate: number;
  site(t: number, out: Vector3): void;
}

const A = new Vector3();
const B = new Vector3();
const S = new Vector3();

/**
 * A molecule's whole itinerary. `posAt(t)` is a pure function: the segment between legs is `home + wander(t)`, a leg
 * blends from the old home to the gate, rides the gate and blends to the new home. Nothing is accumulated.
 */
export class Walker {
  legs: Leg[] = [];
  /** Hidden before this time (molecules that are added during the animation). */
  from = -Infinity;
  /** Bounce molecules keep off the membrane with an |sin| hop of this height (0 = none). */
  bounce = { period: 0, phase: 0, floor: 0, height: 0 };

  constructor(
    readonly wander: Wander,
    readonly homes: HomeFn[],
    /** Time scale of the jitter (temperature). */
    readonly speed = 1,
    readonly side0: 0 | 1 = 0,
  ) {}

  visible(t: number): boolean {
    return t >= this.from;
  }

  /** 0 = outside, 1 = inside, at time t. */
  sideAt(t: number): 0 | 1 {
    let flips = 0;
    for (const leg of this.legs) if (leg.tCross <= t) flips++;
    return ((this.side0 + flips) & 1) as 0 | 1;
  }

  posAt(t: number, out: Vector3): Vector3 {
    let i = 0;
    while (i < this.legs.length && this.legs[i]!.t0 <= t) i++;
    if (i === 0) {
      this.homes[0]!(t, A);
      out.copy(A).add(wanderAt(this.wander, t * this.speed, S));
    } else {
      const leg = this.legs[i - 1]!;
      if (t >= leg.t1) {
        this.homes[i]!(t, A);
        out.copy(A).add(wanderAt(this.wander, t * this.speed, S));
      } else {
        leg.site(t, S);
        if (t < leg.tOut) {
          const a = leg.tIn - leg.t0;
          const u = a <= 1e-6 ? 1 : smooth((t - leg.t0) / a);
          if (t < leg.tIn && u < 1) {
            this.homes[i - 1]!(t, A);
            A.add(wanderAt(this.wander, t * this.speed, out));
            out.copy(A).lerp(S, u);
          } else out.copy(S);
        } else {
          this.homes[i]!(t, B);
          B.add(wanderAt(this.wander, t * this.speed, out));
          out.copy(S).lerp(B, smooth((t - leg.tOut) / Math.max(leg.t1 - leg.tOut, 1e-6)));
        }
      }
    }
    if (this.bounce.height > 0) {
      const hop = Math.abs(Math.sin((Math.PI * t * this.speed) / this.bounce.period + this.bounce.phase));
      out.y = this.bounce.floor + this.bounce.height * hop;
    }
    return out;
  }
}

export const win = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));
