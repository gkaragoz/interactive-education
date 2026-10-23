/**
 * Declarative reaction rules and the per-step evaluator.
 *
 * A rule lists reactants and products (species keys with coefficients), conditions, a rate law-lite and an enthalpy.
 * Each fixed step: extent_max = min(n_i / coeff_i) over reactants (limiting reagent,
 * https://en.wikipedia.org/wiki/Limiting_reagent); the step advances
 *   d_xi = extent_max x (1 - exp(-k_eff x dt)),  k_eff = (k + catalyst terms) x f(T) x f(surface) x f(concentration)
 * where f(T) doubles per +10 K (teaching approximation of https://en.wikipedia.org/wiki/Arrhenius_equation and
 * https://en.wikipedia.org/wiki/Collision_theory), surface counts powder as 12x lump
 * (https://en.wikipedia.org/wiki/Reaction_rate#Factors_influencing_rate), and the concentration factor is a power law
 * (https://en.wikipedia.org/wiki/Rate_equation). Temperature changes by -dH x d_xi / heat capacity.
 * Mass and charge are conserved because every rule is checked atom by atom in the tests.
 * Rules that no rule matches are simply not simulated: the engine never invents a reaction.
 */
import { addSolid, addTo, amount, powderFraction, solidMol, takeSolid } from './mixture';
import { speciesOf } from './species';
import { hasAirAccess, volumeMl, type Vessel } from './vessel';

export type ObsTag = 'gas' | 'precipitate' | 'colour' | 'temperature' | 'light' | 'sound' | 'dissolve' | 'foam' | 'deposit' | 'safety' | 'none';

export interface RuleObs {
  id: string;
  tag: ObsTag;
  textTr: string;
  /** 'start' = first noticeable progress (default), 'end' = limiting reagent used up. */
  when?: 'start' | 'end';
  /** Several rules of one family log this observation only once per vessel. */
  shared?: boolean;
  /** Light flash strength 0..1 given to the renderer (always capped; see photosensitivity note in README). */
  flash?: number;
}

export interface CatalystTerm {
  /** 'cat:yeast' (grams in the vessel), 's:mno2' (grams of solid) or an aq key such as 'I-' (mol/L). */
  key: string;
  k: number;
  half: number;
}

export interface ReactionRule {
  id: string;
  nameTr: string;
  family: string;
  reactants: Record<string, number>;
  products: Record<string, number>;
  /** kJ per mole of reaction as written; negative = exothermic. */
  dH: number;
  /** First-order-lite rate constant at 25 degC, 1/s. */
  k: number;
  surface?: boolean;
  conc?: { key: string; ref: number; order: number };
  catalysts?: readonly CatalystTerm[];
  needs?: { minTempC?: number; ignitionC?: number; dry?: boolean };
  noTemp?: boolean;
  /** Share of the reaction heat that stays in the vessel (rest leaves as light or flame). */
  retention?: number;
  obs: readonly RuleObs[];
  source: string;
  kazanim: readonly string[];
}

export interface EngineCtx {
  fromAir(massG: number): void;
  observe(v: Vessel, id: string, tag: ObsTag, textTr: string, flash?: number): void;
}

export interface ReactionStepResult {
  heatJ: number;
  gasMol: number;
  /** True if at least one rule was active this step. */
  fired: boolean;
}

const isSolid = (k: string): boolean => k.startsWith('s:');
const solidId = (k: string): string => k.slice(2).replace(/:p$/, '');

interface Reactant { key: string; c: number; solid: boolean; lump: string; powder: string }
const compiled = new WeakMap<ReactionRule, Reactant[]>();
function reactantsOf(rule: ReactionRule): Reactant[] {
  let r = compiled.get(rule);
  if (!r) {
    r = Object.entries(rule.reactants).map(([key, c]) => {
      const solid = isSolid(key);
      const id = solid ? solidId(key) : '';
      return { key, c, solid, lump: `s:${id}`, powder: `s:${id}:p` };
    });
    compiled.set(rule, r);
  }
  return r;
}

function catalystAmount(v: Vessel, key: string): number {
  if (key.startsWith('cat:')) return v.catalysts[key.slice(4)] ?? 0;
  if (isSolid(key)) return solidMol(v.mix, solidId(key)) * speciesOf(key.replace(/:p$/, '')).molarMass;
  const vMl = volumeMl(v);
  return vMl > 0 ? amount(v.mix, key) / (vMl / 1000) : 0;
}

export function rateConstant(rule: ReactionRule, v: Vessel): number {
  let k = rule.k;
  for (const c of rule.catalysts ?? []) {
    const a = catalystAmount(v, c.key);
    if (a > 0) k += (c.k * a) / (a + c.half);
  }
  if (!rule.noTemp) k *= Math.min(64, Math.max(1 / 64, Math.pow(2, (v.tempC - 25) / 10)));
  if (rule.surface) {
    const sk = Object.keys(rule.reactants).find(isSolid);
    if (sk) k *= (1 + 11 * powderFraction(v.mix, solidId(sk))) * (v.stirring ? 1.3 : 1);
  }
  if (rule.conc) {
    const vMl = volumeMl(v);
    const c = vMl > 0 ? amount(v.mix, rule.conc.key) / (vMl / 1000) : 0;
    k *= Math.min(25, Math.pow(c / rule.conc.ref, rule.conc.order));
  }
  return k;
}

export function extentMax(rule: ReactionRule, v: Vessel, air: boolean): number {
  let ext = Infinity;
  const mix = v.mix;
  for (const r of reactantsOf(rule)) {
    if (air && r.key === 'g:o2') continue;
    const a = r.solid ? (mix[r.lump] ?? 0) + (mix[r.powder] ?? 0) : (mix[r.key] ?? 0);
    if (a <= 1e-12) return 0;
    const e = a / r.c;
    if (e < ext) ext = e;
  }
  return ext;
}

export function stepReactions(rules: readonly ReactionRule[], v: Vessel, dt: number, ctx: EngineCtx): ReactionStepResult {
  const out: ReactionStepResult = { heatJ: 0, gasMol: 0, fired: false };
  const air = hasAirAccess(v);
  let vMl = -1;
  for (const rule of rules) {
    const ext = extentMax(rule, v, air);
    if (ext <= 1e-12 || !Number.isFinite(ext)) continue;
    const n = rule.needs;
    if (n) {
      if (n.dry && vMl < 0) vMl = volumeMl(v);
      if (n.minTempC !== undefined && v.tempC < n.minTempC) continue;
      if (n.ignitionC !== undefined && v.ignition <= 0 && v.tempC < n.ignitionC) continue;
      if (n.dry && vMl > 0.5) continue;
    }
    if (vMl < 0) vMl = volumeMl(v);
    if (vMl < 0.05 && Object.keys(rule.reactants).some((k) => !isSolid(k) && !k.startsWith('g:'))) continue;
    out.fired = true;
    const kEff = rateConstant(rule, v);
    if (!(kEff > 0)) continue;
    const dxi = ext * (1 - Math.exp(-kEff * dt));
    if (!(dxi > 1e-13)) continue;
    for (const [k, c] of Object.entries(rule.reactants)) {
      const dn = c * dxi;
      if (k === 'g:o2' && air) {
        const have = amount(v.mix, k);
        const fromMix = Math.min(have, dn);
        addTo(v.mix, k, -fromMix);
        if (dn > fromMix) ctx.fromAir((dn - fromMix) * speciesOf(k).molarMass);
      } else if (isSolid(k)) takeSolid(v.mix, solidId(k), dn);
      else addTo(v.mix, k, -dn);
    }
    for (const [k, c] of Object.entries(rule.products)) {
      const dn = c * dxi;
      if (isSolid(k)) addSolid(v.mix, solidId(k), dn, k.endsWith(':p'));
      else addTo(v.mix, k, dn);
      if (k.startsWith('g:')) out.gasMol += dn;
    }
    out.heatJ += -rule.dH * 1000 * dxi * (rule.retention ?? 1);
    const before = v.extent[rule.id] ?? 0;
    const after = before + dxi;
    v.extent[rule.id] = after;
    for (const o of rule.obs) {
      const key = o.shared ? o.id : `${rule.id}:${o.id}`;
      if ((o.when ?? 'start') === 'start' && before < 1e-6 && after >= 1e-6) ctx.observe(v, key, o.tag, o.textTr, o.flash);
      if (o.when === 'end' && ext - dxi <= 1e-9 && after >= 1e-6) ctx.observe(v, key, o.tag, o.textTr, o.flash);
    }
  }
  return out;
}
