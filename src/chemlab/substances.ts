/**
 * Substance database: about 60 school-level substances with the numbers the engine needs.
 *
 * Every row carries a Wikipedia page (the `wp` title becomes the source URL) from which the density, solubility, melting
 * point and pKa were read on 2026-10-24 (raw wikitext infobox), plus kazanım codes from docs/research/kimya.md.
 * Where a number is not on the cited page it is marked in `note` and listed as unverified in
 * docs/research/kimya-lab-sources.md. Solubility is g of anhydrous solute per 100 mL of water; this treats 1 mL of water
 * as 1 g and ignores the volume change on dissolving (simplification stated in the README).
 * Pages: https://en.wikipedia.org/wiki/<wp> for each row; hazards follow GHS pictograms
 * (https://en.wikipedia.org/wiki/Globally_Harmonized_System_of_Classification_and_Labelling_of_Chemicals).
 */
import { molarMassOf } from './formula';
import type { Rgb } from './ions';
import { SUBSTANCE_ROWS, type Row } from './substancesData';

export type Phase = 'solid' | 'liquid' | 'gas';
export type Hazard = 'corrosive' | 'flammable' | 'oxidiser' | 'toxic' | 'irritant';
/** [temperature in degC, g per 100 mL water] */
export type SolPoint = readonly [number, number];

export interface Substance {
  id: string;
  nameTr: string;
  formula: string;
  molarMass: number;
  phase: Phase;
  /** g/cm3 for solids and liquids, null for gases. */
  density: number | null;
  /** Colour as a solid (or as a liquid for liquids). */
  rgb: Rgb;
  solubility?: readonly SolPoint[];
  /** kJ/mol, positive = cools the solution (endothermic). */
  dissolveEnthalpy?: number;
  /** Ions released when it dissolves (ion id, count per formula unit). Absent = stays as molecules. */
  ions?: ReadonlyArray<readonly [string, number]>;
  /** A liquid that mixes with water in every ratio (kept as molecules in solution, adds volume). */
  miscible?: boolean;
  acid?: 'strong' | 'weak';
  base?: 'strong' | 'weak';
  pKa?: number;
  hazards: readonly Hazard[];
  virtualOnly?: boolean;
  /** Specific heat capacity, J/(g K); defaults by phase. */
  heatCap: number;
  meltC?: number;
  boilC?: number;
  source: string;
  note?: string;
  kazanim: readonly string[];
}

const WHITE: Rgb = [250, 250, 248];

function build(r: Row): Substance {
  const { id, nameTr, formula, phase, density, wp, kz, o = {} } = r;
  return {
    id, nameTr, formula, phase, density, molarMass: molarMassOf(formula), rgb: o.rgb ?? WHITE,
    solubility: o.sol, dissolveEnthalpy: o.dH, ions: o.ions, miscible: o.misc, acid: o.acid, base: o.base, pKa: o.pKa,
    hazards: o.haz ?? [], virtualOnly: o.virt, heatCap: o.cp ?? (phase === 'solid' ? 0.8 : phase === 'liquid' ? 2.4 : 1.0),
    meltC: o.mp, boilC: o.bp, source: `https://en.wikipedia.org/wiki/${wp}`, note: o.note, kazanim: kz ?? ['KİM.10.1.3'],
  };
}

export const SUBSTANCES: readonly Substance[] = SUBSTANCE_ROWS.map(build);
const BY_ID = new Map(SUBSTANCES.map((s) => [s.id, s] as const));

export function getSubstance(id: string): Substance | undefined {
  return BY_ID.get(id);
}

export function requireSubstance(id: string): Substance {
  const s = BY_ID.get(id);
  if (!s) throw new Error(`Unknown substance ${id}`);
  return s;
}

/** Solubility in g/100 mL at tC by log-linear interpolation between table points (clamped at the ends). */
export function solubilityAt(s: Substance, tC: number): number {
  const pts = s.solubility;
  if (!pts || pts.length === 0) return 0;
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return 0;
  if (tC <= first[0]) return first[1];
  if (tC >= last[0]) return last[1];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (!a || !b || tC > b[0]) continue;
    const f = (tC - a[0]) / (b[0] - a[0]);
    return a[1] > 0 && b[1] > 0 ? Math.exp(Math.log(a[1]) + f * (Math.log(b[1]) - Math.log(a[1]))) : a[1] + f * (b[1] - a[1]);
  }
  return last[1];
}
