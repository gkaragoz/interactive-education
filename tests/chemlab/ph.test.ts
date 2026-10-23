import { describe, expect, it } from 'vitest';
import { INDICATORS, REAGENTS, getReagent, indicatorColor, indicatorStrength, phOfMix, titrationCurve, equivalenceMl, colourNameTr } from '../../src/chemlab';
import { solution } from '../../src/chemlab/reagents';

const ph = (volMl: number, solutes: Array<[string, number]>): number => phOfMix(solution(volMl, solutes).mix) ?? NaN;

describe('pH solver', () => {
  it('pure water is 7', () => {
    expect(ph(100, [])).toBeCloseTo(7, 2);
  });
  it('0.1 M HCl is pH 1 and 1 M HCl is pH 0', () => {
    expect(ph(100, [['H+', 0.1], ['Cl-', 0.1]])).toBeCloseTo(1, 2);
    expect(ph(100, [['H+', 1], ['Cl-', 1]])).toBeCloseTo(0, 1);
  });
  it('0.1 M NaOH is pH 13', () => {
    expect(ph(100, [['Na+', 0.1], ['OH-', 0.1]])).toBeCloseTo(13, 2);
  });
  it('0.001 M strong acid is pH 3, 1e-8 M strong acid stays just below 7', () => {
    expect(ph(100, [['H+', 0.001], ['Cl-', 0.001]])).toBeCloseTo(3, 2);
    const v = ph(100, [['H+', 1e-8], ['Cl-', 1e-8]]);
    expect(v).toBeLessThan(7);
    expect(v).toBeGreaterThan(6.8);
  });
  it('vinegar (0.84 M acetic acid) is about pH 2.4', () => {
    expect(ph(100, [['acetic-acid', 0.84]])).toBeCloseTo(2.4, 1);
  });
  it('weak acid is less acidic than a strong acid of the same concentration', () => {
    expect(ph(100, [['acetic-acid', 0.1]])).toBeGreaterThan(ph(100, [['H+', 0.1], ['Cl-', 0.1]]) + 1);
  });
  it('acetic acid / acetate buffer follows Henderson-Hasselbalch (pH = pKa at 1:1)', () => {
    expect(ph(100, [['acetic-acid', 0.1], ['CH3COO-', 0.1], ['Na+', 0.1]])).toBeCloseTo(4.756, 2);
    expect(ph(100, [['acetic-acid', 0.01], ['CH3COO-', 0.1], ['Na+', 0.1]])).toBeCloseTo(5.756, 2);
  });
  it('baking soda solution is about pH 8.3 (ampholyte: (pKa1+pKa2)/2)', () => {
    expect(ph(100, [['Na+', 0.1], ['HCO3-', 0.1]])).toBeCloseTo(8.34, 1);
  });
  it('washing soda 0.1 M is strongly basic (about 11.6)', () => {
    expect(ph(100, [['Na+', 0.2], ['CO3(2-)', 0.1]])).toBeGreaterThan(11.3);
    expect(ph(100, [['Na+', 0.2], ['CO3(2-)', 0.1]])).toBeLessThan(11.9);
  });
  it('ammonia 0.5 M is about pH 11.5 and ammonium chloride is weakly acidic', () => {
    expect(ph(100, [['nh3', 0.5]])).toBeGreaterThan(11.2);
    expect(ph(100, [['nh3', 0.5]])).toBeLessThan(11.8);
    const salt = ph(100, [['NH4+', 0.1], ['Cl-', 0.1]]);
    expect(salt).toBeGreaterThan(4.8);
    expect(salt).toBeLessThan(5.4);
  });
  it('sodium acetate solution is weakly basic', () => {
    const v = ph(100, [['Na+', 0.1], ['CH3COO-', 0.1]]);
    expect(v).toBeGreaterThan(8.6);
    expect(v).toBeLessThan(9.2);
  });
  it('bleach (hypochlorite) is basic', () => {
    expect(ph(100, [['Na+', 0.7], ['ClO-', 0.7]])).toBeGreaterThan(10.5);
  });
  it('lemon juice (citric acid 0.3 M) is about pH 2', () => {
    const v = ph(100, [['citric-acid', 0.3]]);
    expect(v).toBeGreaterThan(1.8);
    expect(v).toBeLessThan(2.3);
  });
  it('mixed strong acid and base: excess decides the pH', () => {
    // 10 mmol H+ with 4 mmol OH- left as spectators Cl-/Na+: 6 mmol H+ in 100 mL
    expect(ph(100, [['H+', 0.06], ['Cl-', 0.1], ['Na+', 0.04]])).toBeCloseTo(1.22, 1);
  });
  it('returns null without liquid', () => {
    expect(phOfMix({ 's:nacl': 1 })).toBeNull();
  });
  it('is monotonic with added base', () => {
    let prev = -1;
    for (let b = 0; b <= 0.2; b += 0.02) {
      const v = ph(100, [['H+', 0.1 - Math.min(b, 0.1) * 1], ['Cl-', 0.1], ['Na+', Math.min(b, 0.1)], ['OH-', Math.max(0, b - 0.1)]]);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });
  it('household shelf liquids sit in plausible ranges', () => {
    const phOf = (id: string): number => phOfMix(getReagent(id)?.build(50).mix ?? {}) ?? NaN;
    expect(phOf('vinegar')).toBeLessThan(3);
    expect(phOf('lemon-juice')).toBeLessThan(vinegarPh() + 0.8);
    expect(phOf('baking-soda-solution')).toBeGreaterThan(8);
    expect(phOf('soap-solution')).toBeGreaterThan(7.5);
    expect(phOf('soap-solution')).toBeLessThan(9.5);
    expect(phOf('water')).toBeCloseTo(7, 1);
    function vinegarPh(): number {
      return phOfMix(getReagent('vinegar')?.build(50).mix ?? {}) ?? NaN;
    }
  });
});

describe('titration curve', () => {
  const strong = titrationCurve({ flask: { volumeMl: 20, solutes: [['H+', 0.1], ['Cl-', 0.1]] }, titrant: [['Na+', 0.1], ['OH-', 0.1]], maxMl: 30, stepMl: 0.5 });
  it('strong acid / strong base starts near 1 and ends near 12.5', () => {
    expect(strong[0]?.ph).toBeCloseTo(1, 1);
    expect(strong[strong.length - 1]?.ph).toBeGreaterThan(12);
  });
  it('is exactly neutral at the equivalence point (20.0 mL)', () => {
    expect(strong.find((p) => p.ml === 20)?.ph).toBeCloseTo(7, 1);
  });
  it('jumps steeply around the equivalence point', () => {
    const at = (ml: number): number => strong.find((p) => p.ml === ml)?.ph ?? NaN;
    expect(at(19.5)).toBeLessThan(4);
    expect(at(20.5)).toBeGreaterThan(10);
  });
  it('estimates the equivalence volume from the steepest point', () => {
    expect(equivalenceMl(strong)).toBeCloseTo(20, 0);
  });
  it('is monotonically increasing', () => {
    for (let i = 1; i < strong.length; i++) expect((strong[i]?.ph ?? 0) >= (strong[i - 1]?.ph ?? 0) - 1e-9).toBe(true);
  });
  it('weak acid / strong base: starts higher, pH = pKa at half equivalence, equivalence above 7', () => {
    const weak = titrationCurve({ flask: { volumeMl: 20, solutes: [['acetic-acid', 0.1]] }, titrant: [['Na+', 0.1], ['OH-', 0.1]], maxMl: 30, stepMl: 0.5 });
    expect(weak[0]?.ph).toBeGreaterThan(2.5);
    expect(weak.find((p) => p.ml === 10)?.ph).toBeCloseTo(4.756, 1);
    expect(weak.find((p) => p.ml === 20)?.ph).toBeGreaterThan(8);
    expect(equivalenceMl(weak)).toBeCloseTo(20, 0);
  });
  it('strong acid titrated with base volume of 10 mL is half way (pH about 1.5)', () => {
    expect(strong.find((p) => p.ml === 10)?.ph).toBeCloseTo(1.48, 1);
  });
});

describe('indicators', () => {
  it('red cabbage: red in acid, purple near neutral, blue-green in base, yellow-green when very basic', () => {
    const acid = indicatorColor('red-cabbage', 2);
    const neutral = indicatorColor('red-cabbage', 7);
    const base = indicatorColor('red-cabbage', 10);
    const strongBase = indicatorColor('red-cabbage', 12);
    expect(acid[0]).toBeGreaterThan(acid[2] + 100);
    expect(neutral[2]).toBeGreaterThan(neutral[1]);
    expect(base[1]).toBeGreaterThan(base[0]);
    expect(strongBase[1]).toBeGreaterThan(strongBase[2] + 80);
  });
  it('phenolphthalein is colourless below 8.3 and pink above', () => {
    expect(indicatorColor('phenolphthalein', 5)).toEqual([255, 255, 255]);
    expect(indicatorColor('phenolphthalein', 8.0)).toEqual([255, 255, 255]);
    const pink = indicatorColor('phenolphthalein', 10);
    expect(pink[0]).toBeGreaterThan(pink[1] + 100);
    expect(colourNameTr(pink)).toMatch(/pembe|kırmızı/);
  });
  it('phenolphthalein fades again in very strong base', () => {
    expect(indicatorColor('phenolphthalein', 14)).toEqual([255, 255, 255]);
  });
  it('universal indicator: red at pH 2, green at 7, violet at 11 (documented ladder)', () => {
    expect(colourNameTr(indicatorColor('universal', 2))).toBe('kırmızı');
    expect(colourNameTr(indicatorColor('universal', 7))).toBe('yeşil');
    expect(indicatorColor('universal', 9)[2]).toBeGreaterThan(150);
    expect(indicatorColor('universal', 11)[0]).toBeGreaterThan(100);
  });
  it('litmus is red in acid and blue in base', () => {
    expect(indicatorColor('litmus', 3)[0]).toBeGreaterThan(200);
    expect(indicatorColor('litmus', 10)[2]).toBeGreaterThan(200);
  });
  it('unknown indicators give no colour', () => {
    expect(indicatorColor('nope', 7)).toEqual([255, 255, 255]);
  });
  it('colour strength grows with the amount of stock and saturates', () => {
    const a = indicatorStrength('phenolphthalein', 0.05, 40);
    const b = indicatorStrength('phenolphthalein', 0.5, 40);
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThanOrEqual(1);
    expect(indicatorStrength('phenolphthalein', 0, 40)).toBe(0);
  });
  it('every indicator has ordered stops and a source', () => {
    for (const ind of Object.values(INDICATORS)) {
      expect(ind.source).toMatch(/^https:\/\//);
      for (let i = 1; i < ind.stops.length; i++) expect((ind.stops[i]?.[0] ?? 0) > (ind.stops[i - 1]?.[0] ?? 0)).toBe(true);
    }
  });
  it('the shelf has the four required indicators', () => {
    const ids = REAGENTS.filter((r) => r.category === 'indicator').map((r) => Object.keys(r.build(1).indicators)[0]);
    expect(ids.sort()).toEqual(['litmus', 'phenolphthalein', 'red-cabbage', 'universal']);
  });
});
