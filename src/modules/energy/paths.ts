import type { Trip } from './flock';
import type { KindId } from './kinds';
import { Path, type Key } from './math';

/** Shorthand for a trip along timed waypoints. */
export const go = (kind: KindId, station: number, size: number, keys: readonly Key[], o: Partial<Trip> = {}): Trip => ({
  kind,
  station,
  size,
  path: new Path(keys),
  // ATP that has arrived and rests lies flat, chain along x (tidy rows instead of a tangle)
  ...(kind === 'atp' || kind === 'adp' ? { upright: true, spin: o.hold ? 0 : 1.4, phase: o.hold ? 0 : keys[0]![0] * 2.3 } : {}),
  ...o,
});

/** A molecule or protein that stays put (with a slow shimmer) for [t0, t1] and does not shrink at the end. */
export const still = (kind: KindId, station: number, size: number, p: readonly [number, number, number], t0: number, t1: number, o: Partial<Trip> = {}): Trip =>
  go(kind, station, size, [[t0, p[0], p[1], p[2]], [t1, p[0], p[1], p[2]]], { hold: true, ...o });

/** Points of a circle in the XY plane: angle a (radians), centre c, radius r. */
export const ring = (c: readonly [number, number, number], r: number, a: number): [number, number, number] => [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, c[2]];

/** Deterministic pseudo-random in [0,1) from an integer (no state). */
export const hash01 = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
