import type { Rng } from '../../core';
import { KeyTrack } from './keys';
import type { Plan } from './plan';

/** Everything the meiosis builders share. Times are canonical: meiosis I is 0..50, meiosis II is 50..90. */
export interface MCtx {
  plan: Plan;
  np: number;
  /** Bit p set: homolog 1 (paternal) of pair p is the one that goes to the left pole. */
  assort: number;
  /** Non-disjunction: the last pair stays together and goes to the right pole. */
  nd: boolean;
  warp: (t: number) => number;
  rng: (seed: number) => Rng;
}

export const R_CELL = 4.0;
export const E_ANA1 = 1.35 * R_CELL;
/** Radius of a daughter cell after meiosis I (sphere with half the volume of the elongated cell). */
export const AF1 = Math.cbrt((E_ANA1 * R_CELL * R_CELL) / 2);
export const GAP1 = 0.4;
/** Centre of a daughter after meiosis I: the second division's cells sit here. */
export const XC = AF1 + GAP1;
export const E_ANA2 = 1.3 * AF1;
export const AF2 = Math.cbrt((E_ANA2 * AF1 * AF1) / 2);
export const GAP2 = 0.35;
export const XC2 = AF2 + GAP2;
export const NUC_R = 1.7;
/** How far from a lobe centre the pole sits while the cell rests (centrosome beside the nucleus). */
export const POLE_REST = 2.6;

export const mk = (c: MCtx, names: readonly string[], init: Record<string, number> = {}): KeyTrack => {
  const t = new KeyTrack(names, init);
  t.warp = c.warp;
  return t;
};

/** Which homolog of pair p goes left. */
export const leftHomolog = (c: MCtx, p: number): number => (c.assort >> p) & 1;

/** 0 = left daughter cell, 1 = right daughter cell. */
export function cellOf(c: MCtx, p: number, h: number): 0 | 1 {
  if (c.nd && p === c.np - 1) return 1;
  return h === leftHomolog(c, p) ? 0 : 1;
}

/** Chromatid index in the plan: pair, homolog (0 maternal / 1 paternal), sister. */
export const cid = (p: number, h: number, s: number): number => 4 * p + 2 * h + s;

export function rotX(phi: number, x: number, y: number, z: number): [number, number, number] {
  return [x, y * Math.cos(phi) - z * Math.sin(phi), y * Math.sin(phi) + z * Math.cos(phi)];
}
