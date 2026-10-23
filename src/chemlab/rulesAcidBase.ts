/**
 * Proton-transfer rules generated from acid and base tables: neutralisation, acid + carbonate, acid + hydroxide/oxide.
 * An acid HA gives its proton to a base B when pKa(HA) + 1.5 <= pKa(BH+), i.e. the transfer is clearly favourable
 * (https://en.wikipedia.org/wiki/Acid%E2%80%93base_reaction , https://en.wikipedia.org/wiki/Acid_dissociation_constant).
 * Strong acid + strong base: -57.62 kJ/mol of water formed (https://en.wikipedia.org/wiki/Enthalpy_of_neutralization);
 * weak acid + strong base about -55 kJ/mol (our approximation; the real value depends on the acid).
 * Acid + hydrogencarbonate gives CO2 and water (https://en.wikipedia.org/wiki/Sodium_bicarbonate); solid NaHCO3 + acid is
 * written endothermic (+14 kJ/mol, our teaching value that reproduces the cold flask the dossier cites from
 * https://teachchemistry.org/classroom-resources/kitchen-reaction ; magnitude unverified).
 * Acid + calcium carbonate: https://en.wikipedia.org/wiki/Calcium_carbonate
 */
import { formatEquation } from './equation';
import type { ReactionRule, RuleObs } from './reactions';

interface Acid { key: string; conj: string | null; pKa: number; nameTr: string; strength: number }
interface Base {
  key: string;
  /** Protons it takes. */
  n: number;
  /** What forms from the base and the protons (without the acid's conjugate base). */
  gives: Record<string, number>;
  pKaConj: number;
  solid: boolean;
  k: number;
  dH?: number;
  obs?: RuleObs[];
}

const ACIDS: readonly Acid[] = [
  { key: 'H+', conj: null, pKa: -7, nameTr: 'güçlü asit', strength: 1 },
  { key: 'citric-acid', conj: 'citrate-', pKa: 3.13, nameTr: 'sitrik asit', strength: 0.6 },
  { key: 'acetic-acid', conj: 'CH3COO-', pKa: 4.756, nameTr: 'asetik asit', strength: 0.4 },
  { key: 'NH4+', conj: 'nh3', pKa: 9.25, nameTr: 'amonyum', strength: 0.2 },
];

const FIZZ: RuleObs[] = [
  { id: 'fizz-gas', tag: 'gas', shared: true, textTr: 'Gaz kabarcıkları çıkıyor: köpürme oluyor. Çıkan gaz karbondioksittir.' },
];
const GAS_NH3_CAUTION: RuleObs[] = [];

const BASES: readonly Base[] = [
  { key: 'OH-', n: 1, gives: { water: 1 }, pKaConj: 15.7, solid: false, k: 1e4, obs: [{ id: 'neut-warm', tag: 'temperature', shared: true, textTr: 'Karışım hafifçe ısındı: nötralleşme ısı verir.' }] },
  { key: 'HCO3-', n: 1, gives: { 'g:co2': 1, water: 1 }, pKaConj: 6.351, solid: false, k: 1e4, obs: FIZZ },
  { key: 'CO3(2-)', n: 1, gives: { 'HCO3-': 1 }, pKaConj: 10.33, solid: false, k: 1e4 },
  { key: 'CH3COO-', n: 1, gives: { 'acetic-acid': 1 }, pKaConj: 4.756, solid: false, k: 1e4 },
  { key: 'citrate-', n: 1, gives: { 'citric-acid': 1 }, pKaConj: 3.13, solid: false, k: 1e4 },
  { key: 'nh3', n: 1, gives: { 'NH4+': 1 }, pKaConj: 9.25, solid: false, k: 1e4, obs: GAS_NH3_CAUTION },
  { key: 's:nahco3', n: 1, gives: { 'Na+': 1, 'g:co2': 1, water: 1 }, pKaConj: 6.351, solid: true, k: 0.6, dH: 14, obs: FIZZ },
  { key: 's:na2co3', n: 2, gives: { 'Na+': 2, 'g:co2': 1, water: 1 }, pKaConj: 6.351, solid: true, k: 0.4, obs: FIZZ },
  { key: 's:caco3', n: 2, gives: { 'Ca(2+)': 1, 'g:co2': 1, water: 1 }, pKaConj: 6.351, solid: true, k: 0.15, obs: FIZZ },
  { key: 's:cuco3', n: 2, gives: { 'Cu(2+)': 1, 'g:co2': 1, water: 1 }, pKaConj: 6.351, solid: true, k: 0.1, obs: FIZZ },
  { key: 's:mgoh2', n: 2, gives: { 'Mg(2+)': 1, water: 2 }, pKaConj: 15.7, solid: true, k: 0.2, obs: [{ id: 'dis', tag: 'dissolve', textTr: 'Çökelek asitte çözünüyor.' }] },
  { key: 's:cuoh2', n: 2, gives: { 'Cu(2+)': 1, water: 2 }, pKaConj: 15.7, solid: true, k: 0.2, obs: [{ id: 'dis', tag: 'dissolve', textTr: 'Mavi çökelek asitte çözünüyor.' }] },
  { key: 's:znoh2', n: 2, gives: { 'Zn(2+)': 1, water: 2 }, pKaConj: 15.7, solid: true, k: 0.2 },
  { key: 's:feoh3', n: 3, gives: { 'Fe(3+)': 1, water: 3 }, pKaConj: 15.7, solid: true, k: 0.1 },
  { key: 's:caoh2', n: 2, gives: { 'Ca(2+)': 1, water: 2 }, pKaConj: 15.7, solid: true, k: 0.3 },
  { key: 's:mgo', n: 2, gives: { 'Mg(2+)': 1, water: 1 }, pKaConj: 15.7, solid: true, k: 0.05, obs: [{ id: 'dis', tag: 'dissolve', textTr: 'Beyaz kül (magnezyum oksit) asitte çözünüyor.' }] },
];

function make(a: Acid, b: Base): ReactionRule {
  const reactants: Record<string, number> = { [b.key]: 1 };
  reactants[a.key] = (reactants[a.key] ?? 0) + b.n;
  const products: Record<string, number> = { ...b.gives };
  if (a.conj) products[a.conj] = (products[a.conj] ?? 0) + b.n;
  const strongBase = b.key === 'OH-';
  const dH = b.dH !== undefined ? b.dH : strongBase ? (a.key === 'H+' ? -57.62 : -55) : 0;
  const k = b.solid ? b.k * a.strength : b.k;
  const id = `ab:${a.key}+${b.key}`;
  return {
    id, nameTr: `${a.nameTr} + ${b.key}`, family: strongBase ? 'neutralisation' : 'acid-base', reactants, products, dH, k,
    surface: b.solid, conc: b.solid ? { key: a.key, ref: 0.5, order: 0.5 } : undefined,
    obs: b.obs ?? [], source: 'https://en.wikipedia.org/wiki/Acid%E2%80%93base_reaction', kazanim: ['FB.8.5.5', 'KİM.10.1.3', 'KİM.11.2.10'],
  };
}

export const ACID_BASE_RULES: readonly ReactionRule[] = ACIDS.flatMap((a) =>
  BASES.filter((b) => a.key === 'H+' || a.pKa + 1.5 <= b.pKaConj).map((b) => make(a, b)),
).filter((r) => !(r.reactants['NH4+'] && r.reactants['nh3']));

/** Text for the Defter and the explainer. */
export const equationOf = (r: ReactionRule): string => formatEquation(r.reactants, r.products);
