import { describe, expect, it } from 'vitest';
import { ATOMIC_MASS, IONS, SUBSTANCES, getSubstance, molarMassOf, parseFormula, requireSubstance, solubilityAt, REAGENTS, getReagent } from '../../src/chemlab';

describe('formula parser', () => {
  it('parses simple formulas', () => {
    expect(parseFormula('H2O')).toEqual({ H: 2, O: 1 });
    expect(parseFormula('NaCl')).toEqual({ Na: 1, Cl: 1 });
  });
  it('parses parentheses', () => {
    expect(parseFormula('Ca(OH)2')).toEqual({ Ca: 1, O: 2, H: 2 });
    expect(parseFormula('Fe(OH)3')).toEqual({ Fe: 1, O: 3, H: 3 });
    expect(parseFormula('Cu(NO3)2')).toEqual({ Cu: 1, N: 2, O: 6 });
  });
  it('parses larger organics', () => {
    expect(parseFormula('C12H22O11')).toEqual({ C: 12, H: 22, O: 11 });
    expect(parseFormula('CH3COOH')).toEqual({ C: 2, H: 4, O: 2 });
  });
  it('rejects unknown elements and unbalanced parentheses', () => {
    expect(() => parseFormula('Xx2')).toThrow();
    expect(() => parseFormula('Ca(OH')).toThrow();
    expect(() => parseFormula('Ca)OH(')).toThrow();
  });
  it('returns an empty object for the empty formula (electrons, catalysts)', () => {
    expect(parseFormula('')).toEqual({});
  });
  it.each([
    ['H2O', 18.015, 0.01],
    ['NaCl', 58.44, 0.02],
    ['NaHCO3', 84.0, 0.02],
    ['CaCO3', 100.09, 0.02],
    ['CH3COOH', 60.05, 0.02],
    ['C12H22O11', 342.3, 0.1],
    ['MgO', 40.3, 0.02],
    ['KNO3', 101.1, 0.02],
    ['CuSO4', 159.6, 0.1],
    ['H2O2', 34.01, 0.02],
  ])('molar mass of %s is about %f', (f, m, tol) => {
    expect(Math.abs(molarMassOf(f) - m)).toBeLessThan(tol);
  });
  it('has masses for every element used', () => {
    for (const s of SUBSTANCES) for (const el of Object.keys(parseFormula(s.formula))) expect(ATOMIC_MASS[el]).toBeGreaterThan(0);
  });
});

describe('substance database', () => {
  it('has about 60 substances with unique ids', () => {
    expect(SUBSTANCES.length).toBeGreaterThanOrEqual(58);
    expect(new Set(SUBSTANCES.map((s) => s.id)).size).toBe(SUBSTANCES.length);
  });
  it.each(SUBSTANCES.map((s) => [s.id, s] as const))('%s has a source URL, kazanım, Turkish name and sane numbers', (_id, s) => {
    expect(s.source).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
    expect(s.kazanim.length).toBeGreaterThan(0);
    expect(s.nameTr.length).toBeGreaterThan(1);
    expect(s.molarMass).toBeGreaterThan(1);
    if (s.phase !== 'gas') expect(s.density ?? 0).toBeGreaterThan(0.5);
    else expect(s.density).toBeNull();
    for (const rgbv of s.rgb) expect(rgbv >= 0 && rgbv <= 255).toBe(true);
  });
  it.each(SUBSTANCES.filter((s) => s.ions).map((s) => [s.id, s] as const))('%s dissolves into charge-balanced, atom-balanced ions', (_id, s) => {
    let charge = 0;
    const atoms: Record<string, number> = {};
    for (const [ion, n] of s.ions ?? []) {
      const info = IONS[ion];
      expect(info, `ion ${ion}`).toBeDefined();
      charge += (info?.charge ?? 0) * n;
      for (const [el, c] of Object.entries(parseFormula(info?.formula ?? ''))) atoms[el] = (atoms[el] ?? 0) + c * n;
    }
    expect(charge).toBe(0);
    expect(atoms).toEqual(parseFormula(s.formula));
  });
  it.each(SUBSTANCES.filter((s) => s.solubility).map((s) => [s.id, s] as const))('%s solubility table is in ascending temperature order and positive', (_id, s) => {
    const pts = s.solubility ?? [];
    for (let i = 1; i < pts.length; i++) expect((pts[i]?.[0] ?? 0) > (pts[i - 1]?.[0] ?? 0)).toBe(true);
    for (const p of pts) expect(p[1]).toBeGreaterThan(0);
  });
  it('flags the dangerous or toxic ones as virtual only', () => {
    for (const id of ['bacl2', 'agno3', 'naclo', 'cl2', 'hno3']) expect(requireSubstance(id).virtualOnly).toBe(true);
    expect(getSubstance('nacl')?.virtualOnly).toBeFalsy();
  });
  it('carries the right hazard tags', () => {
    expect(requireSubstance('kno3').hazards).toContain('oxidiser');
    expect(requireSubstance('hcl').hazards).toContain('corrosive');
    expect(requireSubstance('ethanol').hazards).toContain('flammable');
    expect(requireSubstance('h2').hazards).toContain('flammable');
    expect(requireSubstance('cuso4').hazards).toContain('toxic');
    expect(requireSubstance('mgcl2').hazards).toEqual([]);
  });
  it('requireSubstance throws on unknown ids', () => {
    expect(() => requireSubstance('nope')).toThrow();
    expect(getSubstance('nope')).toBeUndefined();
  });
  it('KNO3 solubility matches the cited page (133, 316, 2439 g/L at 0, 20, 100 C)', () => {
    const k = requireSubstance('kno3');
    expect(solubilityAt(k, 0)).toBeCloseTo(13.3, 5);
    expect(solubilityAt(k, 20)).toBeCloseTo(31.6, 5);
    expect(solubilityAt(k, 100)).toBeCloseTo(243.9, 5);
  });
  it('solubility interpolates monotonically for KNO3 and clamps outside the table', () => {
    const k = requireSubstance('kno3');
    let prev = 0;
    for (let t = 0; t <= 100; t += 5) {
      const s = solubilityAt(k, t);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
    expect(solubilityAt(k, -10)).toBe(13.3);
    expect(solubilityAt(k, 200)).toBe(243.9);
  });
  it('NaCl barely changes with temperature, sugar is far more soluble than salt', () => {
    const nacl = requireSubstance('nacl');
    expect(solubilityAt(nacl, 100) / solubilityAt(nacl, 0)).toBeLessThan(1.15);
    expect(solubilityAt(requireSubstance('sucrose'), 20)).toBeGreaterThan(solubilityAt(nacl, 20) * 5);
  });
  it('Ca(OH)2 shows retrograde solubility (less soluble when hot)', () => {
    const c = requireSubstance('caoh2');
    expect(solubilityAt(c, 100)).toBeLessThan(solubilityAt(c, 20));
  });
  it('sparingly soluble compounds are tiny', () => {
    for (const id of ['caco3', 'agcl', 'baso4', 'cuoh2', 'mgoh2', 'feoh3']) expect(solubilityAt(requireSubstance(id), 25)).toBeLessThan(0.01);
  });
  it('substances without a table report zero solubility', () => {
    expect(solubilityAt(requireSubstance('mg'), 25)).toBe(0);
  });
  it('dissolution enthalpy signs: NaOH exothermic, NH4NO3 and KNO3 endothermic', () => {
    expect(requireSubstance('naoh').dissolveEnthalpy).toBeLessThan(0);
    expect(requireSubstance('nh4no3').dissolveEnthalpy).toBeGreaterThan(0);
    expect(requireSubstance('kno3').dissolveEnthalpy).toBeGreaterThan(0);
  });
  it('pKa values for the shelf acids and bases match the cited pages', () => {
    expect(requireSubstance('acetic-acid').pKa).toBeCloseTo(4.756, 3);
    expect(requireSubstance('citric-acid').pKa).toBeCloseTo(3.13, 2);
    expect(requireSubstance('nahco3').pKa).toBeCloseTo(6.351, 3);
  });
});

describe('reagent shelf', () => {
  it('has unique ids and the experiment bottles', () => {
    expect(new Set(REAGENTS.map((r) => r.id)).size).toBe(REAGENTS.length);
    for (const id of ['vinegar', 'hcl-0.1M', 'hcl-1M', 'naoh-0.1M', 'cabbage-extract', 'phenolphthalein', 'h2o2-3pct', 'cuso4-0.1M', 'fe-nail', 'mg-ribbon', 'yeast', 'cacl2-0.5M', 'na2co3-0.5M', 'kno3']) {
      expect(getReagent(id), id).toBeDefined();
    }
  });
  it('every solution has water and at least a solvent', () => {
    for (const r of REAGENTS.filter((x) => x.unit === 'mL')) {
      const p = r.build(37);
      expect(p.mix['water']).toBeGreaterThan(0);
    }
  });
  it('lists virtual-only bottles', () => {
    expect(getReagent('bleach')?.virtualOnly).toBe(true);
    expect(getReagent('agno3-0.05M')?.virtualOnly).toBe(true);
  });
});
