/**
 * Dissolution, precipitation and crystallisation by solubility.
 *
 * One rule covers all three: for every salt (or molecular solid) in the database whose solid or whose ions are present,
 * the dissolved amount is compared with the capacity solubility(T) x volume. Above capacity the excess leaves as a solid
 * (precipitate when the compound is sparingly soluble, crystals otherwise; unseeded crystals need 12 % supersaturation,
 * which is why cooling can give a clear supersaturated solution); below capacity a present solid dissolves at a rate that
 * is proportional to the solid present and to the distance from saturation, and grows with surface (powder), stirring and
 * temperature (doubling per +10 K, collision-theory-shaped, our simplification).
 * Solubility rules for the classic precipitates (chlorides, sulfates, carbonates, hydroxides) fall out of the table:
 * https://en.wikipedia.org/wiki/Solubility_chart , https://en.wikipedia.org/wiki/Precipitation_(chemistry) ,
 * https://en.wikipedia.org/wiki/Supersaturation , https://en.wikipedia.org/wiki/Crystallization
 * Common-ion effect and activity are ignored (simplification).
 */
import { addTo, amount, powderFraction, solidMol, takeSolid } from './mixture';
import { SUBSTANCES, solubilityAt, type Substance } from './substances';
import { solidKey } from './species';
import { volumeMl, type Vessel } from './vessel';

interface SaltInfo {
  sub: Substance;
  ions: ReadonlyArray<readonly [string, number]>;
}

interface SaltIndexed extends SaltInfo {
  lump: string;
  powder: string;
}
const SALTS: readonly SaltIndexed[] = SUBSTANCES.filter((s) => s.solubility && s.phase === 'solid').map((sub) => ({
  sub,
  ions: sub.ions && sub.ions.length > 0 ? sub.ions : ([[sub.id, 1]] as const),
  lump: `s:${sub.id}`,
  powder: `s:${sub.id}:p`,
}));

export const NUCLEATION_RATIO = 1.12;
const SPARINGLY = 0.1; // g/100 mL below which a compound counts as a precipitate-former

export interface EquilibriumResult {
  /** Heat released into the vessel in joules (negative = absorbed). */
  heatJ: number;
  dissolved: string[];
  precipitated: string[];
  crystallised: string[];
}

/** Moles of formula units currently dissolved (limited by the scarcest ion). */
export function dissolvedUnits(v: Vessel, ions: ReadonlyArray<readonly [string, number]>): number {
  let m = Infinity;
  for (const [k, c] of ions) m = Math.min(m, amount(v.mix, k) / c);
  return Number.isFinite(m) ? m : 0;
}

/** Capacity in mol of formula units for the current volume and temperature. */
export function capacityUnits(sub: Substance, vMl: number, tC: number): number {
  return (solubilityAt(sub, tC) * vMl) / 100 / sub.molarMass;
}

export function equilibrate(v: Vessel, dt: number): EquilibriumResult {
  const res: EquilibriumResult = { heatJ: 0, dissolved: [], precipitated: [], crystallised: [] };
  const vMl = volumeMl(v);
  const cands: SaltIndexed[] = [];
  for (const s of SALTS) {
    if ((v.mix[s.lump] ?? 0) > 0 || (v.mix[s.powder] ?? 0) > 0) cands.push(s);
    else {
      let all = true;
      for (const ion of s.ions) if (!((v.mix[ion[0]] ?? 0) > 0)) { all = false; break; }
      if (all) cands.push(s);
    }
  }
  if (cands.length === 0) return res;
  cands.sort((a, b) => solubilityAt(a.sub, v.tempC) - solubilityAt(b.sub, v.tempC) || (a.sub.id < b.sub.id ? -1 : 1));
  const stirFactor = v.stirring || v.agitation > 0.5 ? 4 : 1;
  const tFactor = Math.min(32, Math.max(1 / 32, Math.pow(2, (v.tempC - 20) / 10)));
  const dH = (s: Substance): number => (s.dissolveEnthalpy ?? 0) * 1000;
  for (const { sub, ions } of cands) {
    const sol = solubilityAt(sub, v.tempC);
    const cap = capacityUnits(sub, vMl, v.tempC);
    const dis = dissolvedUnits(v, ions);
    const solid = solidMol(v.mix, sub.id);
    const seeded = solid > 1e-6;
    const thr = seeded || sol < SPARINGLY || vMl < 0.05 ? 1 : NUCLEATION_RATIO;
    if (dis > cap * thr + 1e-12) {
      const k = vMl < 0.05 || sol < SPARINGLY ? 60 : (seeded ? 0.3 : 0.08) * (v.stirring ? 1.5 : 1);
      const d = (dis - cap) * (1 - Math.exp(-k * dt));
      if (d <= 1e-12) continue;
      for (const [ion, c] of ions) addTo(v.mix, ion, -c * d);
      addTo(v.mix, solidKey(sub.id, sol < SPARINGLY), d);
      res.heatJ += dH(sub) * d;
      (sol < SPARINGLY ? res.precipitated : res.crystallised).push(sub.id);
    } else if (solid > 0 && dis < cap) {
      const surf = 1 + 9 * powderFraction(v.mix, sub.id);
      const sat = cap > 0 ? Math.min(1, dis / cap) : 1;
      const kd = 0.01 * surf * stirFactor * tFactor * (1 - sat);
      let d = Math.min(solid, cap - dis, solid * (1 - Math.exp(-kd * dt)));
      if (solid - d < 1e-7 && cap - dis >= solid) d = solid; // the last crumbs go (no invisible seed crystals)
      if (d <= 1e-12) continue;
      takeSolid(v.mix, sub.id, d);
      for (const [ion, c] of ions) addTo(v.mix, ion, c * d);
      res.heatJ -= dH(sub) * d;
      res.dissolved.push(sub.id);
    }
  }
  return res;
}

/** Fraction (0..1) of the capacity that is used by what is dissolved; >= 0.995 with solid left means saturated. */
export function saturation(v: Vessel, subId: string): number {
  const s = SALTS.find((x) => x.sub.id === subId);
  if (!s) return 0;
  const cap = capacityUnits(s.sub, volumeMl(v), v.tempC);
  return cap > 0 ? dissolvedUnits(v, s.ions) / cap : 0;
}
