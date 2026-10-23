/**
 * Equation helpers: text with state symbols, and atom/charge balance checks.
 * Notation (formulas, state symbols (s) (l) (g) (aq)): https://en.wikipedia.org/wiki/Chemical_equation
 * and https://en.wikipedia.org/wiki/State_symbol (no state symbol page is needed for the logic; kept for the reader).
 */
import { IONS } from './ions';
import { atomsOfKey, speciesOf, type Mix } from './species';
import { addAtoms, type Atoms } from './formula';

export type Side = Record<string, number>;

/** 'Cu2+', 'SO42-' style label from a key (ASCII, no state). */
export function formulaLabel(key: string): string {
  const sp = speciesOf(key);
  const ion = IONS[sp.id];
  if (!ion) return sp.formula;
  const q = Math.abs(ion.charge);
  return `${ion.formula}${q > 1 ? q : ''}${ion.charge > 0 ? '+' : '-'}`;
}

export function stateSymbol(key: string): string {
  const sp = speciesOf(key);
  if (sp.phase === 's') return '(s)';
  if (sp.phase === 'g') return '(g)';
  return sp.key === 'water' ? '(l)' : '(aq)';
}

export function speciesText(key: string, coeff = 1): string {
  return `${coeff === 1 ? '' : coeff}${formulaLabel(key)}${stateSymbol(key)}`;
}

const sideText = (s: Side): string => Object.entries(s).map(([k, c]) => speciesText(k, c)).join(' + ');
export const formatEquation = (reactants: Side, products: Side): string => `${sideText(reactants)} -> ${sideText(products)}`;

export function sideAtoms(s: Side): Atoms {
  const t: Atoms = {};
  for (const [k, c] of Object.entries(s)) addAtoms(t, atomsOfKey(k), c);
  return t;
}

export function sideCharge(s: Side): number {
  let q = 0;
  for (const [k, c] of Object.entries(s)) q += speciesOf(k).charge * c;
  return q;
}

export function sideMass(s: Side): number {
  let m = 0;
  for (const [k, c] of Object.entries(s)) m += speciesOf(k).molarMass * c;
  return m;
}

/** Null when balanced in atoms and charge, otherwise a description of the difference. */
export function balanceError(reactants: Side, products: Side): string | null {
  const a = sideAtoms(reactants);
  const b = sideAtoms(products);
  for (const el of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (Math.abs((a[el] ?? 0) - (b[el] ?? 0)) > 1e-9) return `atom ${el}: ${a[el] ?? 0} vs ${b[el] ?? 0}`;
  }
  if (Math.abs(sideCharge(reactants) - sideCharge(products)) > 1e-9) return 'charge';
  return null;
}

export type { Mix };
