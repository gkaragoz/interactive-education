/**
 * Protic families: groups of species that differ by protons, used for pH and for the proton-transfer rules.
 * Levels run from most protonated to least. Ghost species (never stored in a mixture) are listed too so that the
 * equilibrium split is right (e.g. NaHCO3 solution has pH about 8.3 because H2CO3 is part of the family).
 * pKa values (25 degC): acetic acid 4.756 https://en.wikipedia.org/wiki/Acetic_acid ; carbonic acid 6.35 / 10.33
 * https://en.wikipedia.org/wiki/Carbonic_acid and https://en.wikipedia.org/wiki/Sodium_carbonate ; ammonium 9.24-9.25
 * https://en.wikipedia.org/wiki/Ammonium_chloride ; citric acid pKa1 3.13 https://en.wikipedia.org/wiki/Citric_acid ;
 * hypochlorous acid 7.53 https://en.wikipedia.org/wiki/Sodium_hypochlorite ; laurate 5.3 is our teaching value.
 * Kw = 1e-14 at 25 degC: https://en.wikipedia.org/wiki/Self-ionization_of_water
 */
export interface FamilyLevel {
  /** Key of the species when stored in a mixture (aq key). */
  key: string;
  charge: number;
}
export interface ProticFamily {
  id: string;
  levels: readonly FamilyLevel[];
  /** pKa of each step, length = levels - 1. */
  pKas: readonly number[];
}

export const KW = 1e-14;

export const FAMILIES: readonly ProticFamily[] = [
  { id: 'acetate', levels: [{ key: 'acetic-acid', charge: 0 }, { key: 'CH3COO-', charge: -1 }], pKas: [4.756] },
  { id: 'carbonate', levels: [{ key: 'ghost:H2CO3', charge: 0 }, { key: 'HCO3-', charge: -1 }, { key: 'CO3(2-)', charge: -2 }], pKas: [6.35, 10.33] },
  { id: 'ammonium', levels: [{ key: 'NH4+', charge: 1 }, { key: 'nh3', charge: 0 }], pKas: [9.25] },
  { id: 'citrate', levels: [{ key: 'citric-acid', charge: 0 }, { key: 'citrate-', charge: -1 }], pKas: [3.13] },
  { id: 'laurate', levels: [{ key: 'ghost:lauric', charge: 0 }, { key: 'laurate-', charge: -1 }], pKas: [5.3] },
  { id: 'hypochlorite', levels: [{ key: 'ghost:HOCl', charge: 0 }, { key: 'ClO-', charge: -1 }], pKas: [7.53] },
];

/** Family that a species key belongs to, if any. */
export function familyOf(key: string): ProticFamily | undefined {
  return FAMILIES.find((f) => f.levels.some((l) => l.key === key));
}

/** Fractions alpha_i of each level at hydrogen-ion concentration h (mol/L). */
export function alphas(f: ProticFamily, h: number): number[] {
  const w: number[] = [1];
  for (let i = 1; i < f.levels.length; i++) {
    const ka = Math.pow(10, -(f.pKas[i - 1] ?? 7));
    w.push((w[i - 1] ?? 1) * (ka / h));
  }
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / sum);
}
