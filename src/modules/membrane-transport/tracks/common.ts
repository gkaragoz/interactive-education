import { Vector3 } from 'three';
import { mulberry32, type Rng } from '../../../core';
import type { Transit } from '../crossings';
import { lerp, smooth } from '../math';
import { fixedHome, makeWander, Walker, type HomeFn, type Leg } from '../walker';

/** Where molecules live (world units): the cut face of the patch is at z = 0, the cell membrane at y = 0. */
export const BOUNDS = { xHalf: 7.6, zNear: -0.7, zFar: -3.5, outY: [1.6, 5.0] as const, inY: [-5.0, -1.6] as const };

export const CHART_IDS = ['molekul-ic', 'molekul-dis', 'derisim-farki', 'net-gecis', 'hucre-hacmi', 'harcanan-atp'] as const;

export function emptyChart(): Record<string, number> {
  return { 'molekul-ic': 0, 'molekul-dis': 0, 'derisim-farki': 0, 'net-gecis': 0, 'hucre-hacmi': 100, 'harcanan-atp': 0 };
}

/** A resting place on one side of the membrane, optionally near x. */
export function homeOn(rng: Rng, side: 0 | 1, nearX?: number, spread = 3): HomeFn {
  const x = nearX === undefined ? (rng() * 2 - 1) * BOUNDS.xHalf : Math.max(-BOUNDS.xHalf, Math.min(BOUNDS.xHalf, nearX + (rng() - 0.5) * spread));
  const [a, b] = side === 0 ? BOUNDS.outY : BOUNDS.inY;
  return fixedHome(x, lerp(a, b, rng()), lerp(BOUNDS.zNear, BOUNDS.zFar, rng()));
}

/** Straight passage along a gate axis (lipid gap or channel) from one mouth to the other. */
export function passSite(x: number, z: number, tIn: number, tOut: number, dir: 1 | -1, reach = 0.95, dip = 0): Leg['site'] {
  return (t, out) => {
    const u = smooth((t - tIn) / Math.max(tOut - tIn, 1e-6));
    out.set(x, dir > 0 ? lerp(reach, -reach, u) : lerp(-reach, reach, u), z - dip * Math.sin(Math.PI * u));
  };
}

export function legOf(tr: Transit, site: Leg['site']): Leg {
  return { t0: tr.t0, tIn: tr.tIn, tOut: tr.tOut, t1: tr.t1, tCross: (tr.tIn + tr.tOut) / 2, dir: tr.dir, gate: tr.gate.index, site };
}

export interface WalkerSpec {
  side0: 0 | 1;
  /** Initial home; defaults to a random place on the molecule's side. */
  home?: HomeFn;
  amp: number;
  speed: number;
}

/** One Walker per molecule, with the legs of its transits and a new home near each gate it passed. */
export function buildWalkers(specs: readonly WalkerSpec[], transits: readonly Transit[], leg: (tr: Transit) => Leg, seed: number): Walker[] {
  const by = new Map<number, Transit[]>();
  for (const tr of transits) {
    const list = by.get(tr.mol) ?? [];
    list.push(tr);
    by.set(tr.mol, list);
  }
  return specs.map((s, m) => {
    const rng = mulberry32(seed + m * 7919);
    const homes: HomeFn[] = [s.home ?? homeOn(rng, s.side0)];
    const walker = new Walker(makeWander(rng, s.amp), homes, s.speed, s.side0);
    let side = s.side0;
    for (const tr of (by.get(m) ?? []).sort((a, b) => a.t0 - b.t0)) {
      walker.legs.push(leg(tr));
      side = side === 0 ? 1 : 0;
      homes.push(homeOn(rng, side, tr.gate.x));
    }
    return walker;
  });
}

/** Counts of walkers inside at time t. */
export function countInside(walkers: readonly Walker[], t: number): number {
  let n = 0;
  for (const w of walkers) if (w.visible(t) && w.sideAt(t) === 1) n++;
  return n;
}

export function countOutside(walkers: readonly Walker[], t: number): number {
  let n = 0;
  for (const w of walkers) if (w.visible(t) && w.sideAt(t) === 0) n++;
  return n;
}

export const scratch = new Vector3();

/** All crossings of a set of walkers, for flux windows. */
export function allLegs(walkers: readonly Walker[]): Leg[] {
  return walkers.flatMap((w) => w.legs);
}

/** Molecules inside at time t, from the starting count and the transits (a transit counts at the middle of its ride). */
export function insideAt(transits: readonly Transit[], in0: number, t: number): number {
  let n = in0;
  for (const tr of transits) if ((tr.tIn + tr.tOut) / 2 <= t) n += tr.dir;
  return n;
}

/** Keeps the lowest-scoring run of a stochastic simulation over several seeds (a clean trend with some natural noise). */
export function bestBy(tries: number, make: (seed: number) => Transit[], score: (tr: Transit[]) => number): Transit[] {
  let best: Transit[] = [];
  let bestScore = Infinity;
  for (let seed = 0; seed < tries; seed++) {
    const tr = make(seed);
    const sc = score(tr);
    if (sc < bestScore) {
      best = tr;
      bestScore = sc;
    }
  }
  return best;
}

/** Score: largest distance of the inside-count curve from an expected curve. */
export const deviationFrom =
  (in0: number, expected: (t: number) => number, tEnd: number) =>
  (tr: Transit[]): number => {
    let score = 0;
    for (let t = 0; t <= tEnd; t += 1) score = Math.max(score, Math.abs(insideAt(tr, in0, t) - expected(t)));
    return score;
  };

/** Score: how far the inside count falls back from its running maximum (or rises from its running minimum when `up` is false). */
export const drawdown =
  (in0: number, tEnd: number, up = true) =>
  (tr: Transit[]): number => {
    let best = in0;
    let worst = 0;
    for (let t = 0; t <= tEnd; t += 0.5) {
      const n = insideAt(tr, in0, t);
      best = up ? Math.max(best, n) : Math.min(best, n);
      worst = Math.max(worst, up ? best - n : n - best);
    }
    return worst;
  };
