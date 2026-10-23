import { Vector3 } from 'three';
import type { Rng } from '../../core';
import { smooth } from './math';

/** Brownian-looking jitter as a pure function of time: a few incommensurate sines per axis. */
export interface Wander {
  a: Float32Array;
  f: Float32Array;
  p: Float32Array;
}
const TERMS = 3;

export function makeWander(rng: Rng): Wander {
  const n = 3 * TERMS;
  const w: Wander = {
    a: new Float32Array(n),
    f: new Float32Array(n),
    p: new Float32Array(n),
  };
  for (let i = 0; i < n; i++) {
    const fast = i % TERMS === TERMS - 1;
    w.f[i] = fast ? 4.6 + rng() * 2.6 : 0.6 + rng() * 2.0;
    w.a[i] = fast ? 0.12 : 0.3;
    w.p[i] = rng() * Math.PI * 2;
  }
  return w;
}

export function wanderAt(w: Wander, t: number, amp: number, out: Vector3): Vector3 {
  const s = [0, 0, 0];
  for (let axis = 0; axis < 3; axis++) {
    let v = 0;
    for (let k = 0; k < TERMS; k++) {
      const i = axis * TERMS + k;
      v += w.a[i]! * Math.sin(w.f[i]! * t + w.p[i]!);
    }
    s[axis] = v;
  }
  return out.set(s[0]! * amp, s[1]! * amp, s[2]! * amp * 0.5);
}

/** One passage through a gate: enters the mouth `a` at `t0`, leaves the mouth `b` at `t1`, then rests at `home`. */
export interface Leg {
  t0: number;
  t1: number;
  a: Vector3;
  b: Vector3;
  home: Vector3;
}

/** A particle that rests near a home, jitters, and crosses gates along straight legs. Pure in t. */
export interface Walker {
  wander: Wander;
  home0: Vector3;
  legs: Leg[];
  /** Radius multiplier (1 = base). */
  radius: number;
}

const APPROACH = 0.7;
const SETTLE = 0.8;
const tmp = new Vector3();

/** Position of a walker at time t; `amp` is the jitter amplitude. Writes into `out`. */
export function walkerAt(w: Walker, t: number, amp: number, out: Vector3): Vector3 {
  let home = w.home0;
  for (const leg of w.legs) {
    if (t < leg.t0 - APPROACH) break;
    if (t < leg.t0) {
      const u = smooth((t - (leg.t0 - APPROACH)) / APPROACH);
      wanderAt(w.wander, t, amp * (1 - u), tmp);
      return out.copy(home).lerp(leg.a, u).add(tmp);
    }
    if (t < leg.t1) {
      const u = smooth((t - leg.t0) / (leg.t1 - leg.t0));
      return out.copy(leg.a).lerp(leg.b, u);
    }
    if (t < leg.t1 + SETTLE) {
      const u = smooth((t - leg.t1) / SETTLE);
      wanderAt(w.wander, t, amp * u, tmp);
      return out.copy(leg.b).lerp(leg.home, u).add(tmp);
    }
    home = leg.home;
  }
  wanderAt(w.wander, t, amp, tmp);
  return out.copy(home).add(tmp);
}

/** True while the walker is between a gate's mouths. */
export function inGate(w: Walker, t: number): boolean {
  return w.legs.some((l) => t >= l.t0 && t < l.t1);
}
