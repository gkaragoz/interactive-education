import type { Rng } from '../../core';

/** Sizes in scene units (1 unit ~ 1 um with the explorer's mild exaggeration). */
export const THICK = 0.25;
export const LENGTHS = [3.0, 2.0, 2.5];
export const MATERNAL = '#d4186a';
export const PATERNAL = '#1478b8';
export const MATERNAL_ALT = MATERNAL;
export const PATERNAL_ALT = PATERNAL;
export const INFLATE_ = Math.pow(2, 1 / 5);

export type V3 = [number, number, number];

/** Deterministic points spread inside a sphere (Fibonacci shell with seeded jitter and radius). */
export function nucleusPoints(n: number, radius: number, rng: Rng): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = i * 2.399963 + rng() * 0.6;
    const k = radius * (0.35 + 0.5 * rng());
    out.push([Math.cos(th) * r * k, y * k * 0.95, Math.sin(th) * r * k]);
  }
  return out;
}

/** Ring positions on the equatorial plate: [y, z, angle]. */
export function platePoints(n: number, rho: number, phase = 0): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let k = 0; k < n; k++) {
    const th = ((k + phase) / n) * Math.PI * 2 + 0.25;
    out.push([Math.cos(th) * rho, Math.sin(th) * rho, th]);
  }
  return out;
}

/** Random orientation angles (rx, rz, ry). */
export function randomAngles(rng: Rng): V3 {
  return [rng() * Math.PI * 2, (rng() - 0.5) * 1.6, rng() * Math.PI * 2];
}

export const lenOf = (pair: number): number => LENGTHS[pair % LENGTHS.length] as number;

/** Radius of the lobe `a` channel and the cell extent for a sphere/ellipsoid of radius R. */
export const lobeA = (R: number): number => R / INFLATE_;
