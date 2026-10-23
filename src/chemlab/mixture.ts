/**
 * Mixture arithmetic: mass, volume, heat capacity, charge, atom bookkeeping and solid handling.
 * Volume model: only water and dissolved miscible liquids add volume; dissolved salts add none
 * (the dossier's own assumption for the KNO3 numbers, docs/research/kimya-lab.md section 2/E8).
 * Heat capacity of water 4.18 J/(g K): https://en.wikipedia.org/wiki/Specific_heat_capacity
 */
import { addAtoms, type Atoms } from './formula';
import { atomsOfKey, speciesOf, type Mix } from './species';

export const EPS = 1e-12;

export const amount = (mix: Mix, key: string): number => mix[key] ?? 0;

/** Adds n moles (may be negative); tiny leftovers are removed and a negative result is clamped to zero. */
export function addTo(mix: Mix, key: string, n: number): void {
  const v = (mix[key] ?? 0) + n;
  if (v > EPS) mix[key] = v;
  else delete mix[key];
}

export function cloneMix(mix: Mix): Mix {
  return { ...mix };
}

export function mixMass(mix: Mix): number {
  let m = 0;
  for (const [k, n] of Object.entries(mix)) m += n * speciesOf(k).molarMass;
  return m;
}

export function mixCharge(mix: Mix): number {
  let q = 0;
  for (const [k, n] of Object.entries(mix)) q += n * speciesOf(k).charge;
  return q;
}

export function mixAtoms(mix: Mix): Atoms {
  const t: Atoms = {};
  for (const [k, n] of Object.entries(mix)) addAtoms(t, atomsOfKey(k), n);
  return t;
}

/** Volume of the liquid phase in mL. */
export function liquidVolumeMl(mix: Mix): number {
  let v = 0;
  for (const [k, n] of Object.entries(mix)) {
    const s = speciesOf(k);
    if (s.phase === 'aq' && s.liquidVolume) v += (n * s.molarMass) / s.density;
  }
  return v;
}

export function aqMass(mix: Mix): number {
  let m = 0;
  for (const [k, n] of Object.entries(mix)) {
    const s = speciesOf(k);
    if (s.phase === 'aq') m += n * s.molarMass;
  }
  return m;
}

export function heatCapacity(mix: Mix, extraG: number, glassJperK: number): number {
  let c = glassJperK + extraG * 1.5;
  for (const [k, n] of Object.entries(mix)) {
    const s = speciesOf(k);
    const cp = k === 'water' ? 4.18 : s.phase === 'aq' ? 2.0 : s.heatCap;
    c += n * s.molarMass * cp;
  }
  return c;
}

/** Moles of a solid, lumps and powder together. */
export function solidMol(mix: Mix, id: string): number {
  return amount(mix, `s:${id}`) + amount(mix, `s:${id}:p`);
}

/** Fraction of a solid that is powder (0..1). */
export function powderFraction(mix: Mix, id: string): number {
  const p = amount(mix, `s:${id}:p`);
  const t = solidMol(mix, id);
  return t > 0 ? p / t : 0;
}

/** Removes n mol of a solid, lumps and powder in proportion. Returns the amount actually removed. */
export function takeSolid(mix: Mix, id: string, n: number): number {
  const total = solidMol(mix, id);
  const take = Math.min(total, Math.max(0, n));
  if (take <= 0) return 0;
  const f = take / total;
  addTo(mix, `s:${id}`, -amount(mix, `s:${id}`) * f);
  addTo(mix, `s:${id}:p`, -amount(mix, `s:${id}:p`) * f);
  return take;
}

/** Adds a solid keeping the lump/powder split of `like` (for products that deposit on the same surface). */
export function addSolid(mix: Mix, id: string, n: number, powder: boolean): void {
  addTo(mix, powder ? `s:${id}:p` : `s:${id}`, n);
}

/** Finite check used by tests and the step loop. */
export function isSane(mix: Mix): boolean {
  return Object.values(mix).every((n) => Number.isFinite(n) && n >= 0);
}
