/**
 * Formula parsing and atomic masses for the chemistry engine.
 *
 * Sources (verified reachable 2026-10-24, see docs/research/kimya-lab-sources.md):
 * - Standard atomic weights (conventional values, 3 decimals): https://en.wikipedia.org/wiki/Standard_atomic_weight
 * - Chemical formula notation: https://en.wikipedia.org/wiki/Chemical_formula
 */

export type Atoms = Record<string, number>;

/** Conventional atomic weights, g/mol. */
export const ATOMIC_MASS: Readonly<Record<string, number>> = {
  H: 1.008, C: 12.011, N: 14.007, O: 15.999, Na: 22.99, Mg: 24.305, Al: 26.982, S: 32.06, Cl: 35.45,
  K: 39.098, Ca: 40.078, Mn: 54.938, Fe: 55.845, Cu: 63.546, Zn: 65.38, Ag: 107.868, I: 126.904, Ba: 137.327,
};

/** Parses 'Ca(OH)2' or 'C12H22O11' into atom counts. Charges are not part of the formula text. */
export function parseFormula(formula: string): Atoms {
  const stack: Atoms[] = [{}];
  let i = 0;
  const readInt = (): number => {
    let s = '';
    while (i < formula.length && /[0-9]/.test(formula.charAt(i))) s += formula.charAt(i++);
    return s === '' ? 1 : parseInt(s, 10);
  };
  while (i < formula.length) {
    const ch = formula.charAt(i);
    if (ch === '(') {
      stack.push({});
      i++;
    } else if (ch === ')') {
      i++;
      const n = readInt();
      const inner = stack.pop();
      const top = stack[stack.length - 1];
      if (!inner || !top) throw new Error(`Unbalanced parentheses in ${formula}`);
      for (const [el, c] of Object.entries(inner)) top[el] = (top[el] ?? 0) + c * n;
    } else if (/[A-Z]/.test(ch)) {
      let el = ch;
      i++;
      while (i < formula.length && /[a-z]/.test(formula.charAt(i))) el += formula.charAt(i++);
      if (ATOMIC_MASS[el] === undefined) throw new Error(`Unknown element ${el} in ${formula}`);
      const n = readInt();
      const top = stack[stack.length - 1];
      if (!top) throw new Error(`Bad formula ${formula}`);
      top[el] = (top[el] ?? 0) + n;
    } else {
      throw new Error(`Unexpected '${ch}' in formula ${formula}`);
    }
  }
  if (stack.length !== 1) throw new Error(`Unbalanced parentheses in ${formula}`);
  return stack[0] ?? {};
}

export function molarMassOf(formula: string): number {
  let m = 0;
  for (const [el, c] of Object.entries(parseFormula(formula))) m += (ATOMIC_MASS[el] ?? 0) * c;
  return m;
}

export function addAtoms(into: Atoms, atoms: Atoms, factor: number): void {
  for (const [el, c] of Object.entries(atoms)) into[el] = (into[el] ?? 0) + c * factor;
}
