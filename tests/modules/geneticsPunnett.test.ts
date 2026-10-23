import { describe, expect, it } from 'vitest';
import { genetics as info } from '../../src/data/modules/genetics';
import {
  TRACK_DEFAULT,
  TRACK_KIND,
  TRACK_OPTION,
  chartValues,
  classesOf,
  countsOf,
  crossFor,
  gametesOf,
  genotypeGroups,
  isDefaultCross,
  parseCross,
  parseParent,
  ratioText,
  seriesOf,
  squareOf,
  type CrossKind,
} from '../../src/modules/genetics/punnett';

const square = (kind: CrossKind, cross: string) => squareOf(parseCross(kind, cross));
const counts = (kind: CrossKind, cross: string) => countsOf(kind, square(kind, cross).cells);
const genotypes = (kind: CrossKind, cross: string) => Object.fromEntries(genotypeGroups(kind, square(kind, cross).cells).map((g) => [g.genotype, g.cells.length]));

describe('genetics: parsing and gametes', () => {
  it('parses genotypes of every kind, dominant allele first', () => {
    expect(parseParent('mono', 'aA')).toEqual([['A', 'a']]);
    expect(parseParent('di', 'aAbB')).toEqual([['A', 'a'], ['B', 'b']]);
    expect(parseParent('blood', 'iIB')).toEqual([['IB', 'i']]);
    expect(parseParent('blood', 'IAIB')).toEqual([['IA', 'IB']]);
    expect(parseParent('sex', 'XcXC')).toEqual([['XC', 'Xc']]);
    expect(parseParent('sex', 'XCY')).toEqual([['XC', 'Y']]);
  });

  it('writes gametes in textbook order and repeats the gamete of a homozygote', () => {
    expect(gametesOf(parseParent('mono', 'Aa')).map((g) => g.join(''))).toEqual(['A', 'a']);
    expect(gametesOf(parseParent('mono', 'AA')).map((g) => g.join(''))).toEqual(['A', 'A']);
    expect(gametesOf(parseParent('di', 'AaBb')).map((g) => g.join(''))).toEqual(['AB', 'Ab', 'aB', 'ab']);
    expect(gametesOf(parseParent('di', 'aabb')).map((g) => g.join(''))).toEqual(['ab', 'ab', 'ab', 'ab']);
    expect(gametesOf(parseParent('blood', 'IAi')).map((g) => g.join(''))).toEqual(['IA', 'i']);
    expect(gametesOf(parseParent('sex', 'XCY')).map((g) => g.join(''))).toEqual(['XC', 'Y']);
  });

  it('parses every option choice of the data into two parents with the right number of genes', () => {
    for (const option of info.options) {
      const trackId = Object.keys(TRACK_OPTION).find((t) => TRACK_OPTION[t] === option.id)!;
      const kind = TRACK_KIND[trackId]!;
      expect(option.defaultChoice).toBe(TRACK_DEFAULT[trackId]);
      for (const choice of option.choices) {
        const c = parseCross(kind, choice.id);
        for (const parent of c.parents) expect(parent.length).toBe(kind === 'di' ? 2 : 1);
        expect(squareOf(c).cells.length).toBe(kind === 'di' ? 16 : 4);
      }
    }
  });
});

describe('genetics: Punnett squares and ratios', () => {
  it('monohybrid crosses', () => {
    expect(genotypes('mono', 'Aa-Aa')).toEqual({ AA: 1, Aa: 2, aa: 1 });
    expect(counts('mono', 'Aa-Aa')).toEqual({ 'baskin-fenotip': 3, 'cekinik-fenotip': 1 });
    expect(genotypes('mono', 'Aa-aa')).toEqual({ Aa: 2, aa: 2 });
    expect(counts('mono', 'Aa-aa')).toEqual({ 'baskin-fenotip': 2, 'cekinik-fenotip': 2 });
    expect(genotypes('mono', 'AA-aa')).toEqual({ Aa: 4 });
    expect(genotypes('mono', 'AA-Aa')).toEqual({ AA: 2, Aa: 2 });
    expect(counts('mono', 'AA-AA')).toEqual({ 'baskin-fenotip': 4, 'cekinik-fenotip': 0 });
    expect(counts('mono', 'aa-aa')).toEqual({ 'baskin-fenotip': 0, 'cekinik-fenotip': 4 });
    expect(genotypes('mono', 'aa-Aa')).toEqual({ Aa: 2, aa: 2 });
  });

  it('is symmetric: swapping the parents never changes the ratios', () => {
    const pairs = ['AA', 'Aa', 'aa'];
    for (const a of pairs) for (const b of pairs) expect(genotypes('mono', `${a}-${b}`)).toEqual(genotypes('mono', `${b}-${a}`));
    const di = ['AaBb', 'aabb', 'AABb', 'aaBb'];
    for (const a of di) for (const b of di) expect(counts('di', `${a}-${b}`)).toEqual(counts('di', `${b}-${a}`));
  });

  it('dihybrid crosses', () => {
    expect(counts('di', 'AaBb-AaBb')).toEqual({ 'cift-baskin': 9, 'baskin-cekinik': 3, 'cekinik-baskin': 3, 'cift-cekinik': 1 });
    expect(genotypes('di', 'AaBb-AaBb')).toEqual({ AABB: 1, AABb: 2, AAbb: 1, AaBB: 2, AaBb: 4, Aabb: 2, aaBB: 1, aaBb: 2, aabb: 1 });
    expect(counts('di', 'AaBb-aabb')).toEqual({ 'cift-baskin': 4, 'baskin-cekinik': 4, 'cekinik-baskin': 4, 'cift-cekinik': 4 });
    expect(genotypes('di', 'AaBb-aabb')).toEqual({ AaBb: 4, Aabb: 4, aaBb: 4, aabb: 4 });
    expect(counts('di', 'AABB-aabb')['cift-baskin']).toBe(16);
    expect(counts('di', 'AABb-AABb')).toEqual({ 'cift-baskin': 12, 'baskin-cekinik': 4, 'cekinik-baskin': 0, 'cift-cekinik': 0 });
  });

  it('blood-group crosses (co-dominance, three alleles)', () => {
    expect(counts('blood', 'IAi-IBi')).toEqual({ 'grup-a': 1, 'grup-b': 1, 'grup-ab': 1, 'grup-o': 1 });
    expect(counts('blood', 'IAIB-ii')).toEqual({ 'grup-a': 2, 'grup-b': 2, 'grup-ab': 0, 'grup-o': 0 });
    expect(counts('blood', 'IAi-IAi')).toEqual({ 'grup-a': 3, 'grup-b': 0, 'grup-ab': 0, 'grup-o': 1 });
    expect(counts('blood', 'IAIB-IAIB')).toEqual({ 'grup-a': 1, 'grup-b': 1, 'grup-ab': 2, 'grup-o': 0 });
    expect(counts('blood', 'ii-ii')['grup-o']).toBe(4);
    expect(genotypes('blood', 'IAi-IBi')).toEqual({ IAIB: 1, IAi: 1, IBi: 1, ii: 1 });
    // an O parent can never have an AB child
    expect(counts('blood', 'IAIA-ii')['grup-ab']).toBe(0);
  });

  it('sex-linked crosses (X-linked recessive colour blindness)', () => {
    expect(counts('sex', 'XCXc-XCY')).toEqual({ saglikli: 2, tasiyici: 1, 'renk-koru': 1 });
    expect(genotypes('sex', 'XCXc-XCY')).toEqual({ XCXC: 1, XCXc: 1, XCY: 1, XcY: 1 });
    expect(counts('sex', 'XCXC-XcY')).toEqual({ saglikli: 2, tasiyici: 2, 'renk-koru': 0 });
    expect(counts('sex', 'XCXc-XcY')).toEqual({ saglikli: 1, tasiyici: 1, 'renk-koru': 2 });
    // daughters of a colour blind father are never colour blind unless the mother carries the allele; sons only get X from the mother
    const sq = square('sex', 'XCXC-XcY');
    for (const c of sq.cells.filter((x) => x.genes[0]!.includes('Y'))) expect(c.genotype).toBe('XCY');
  });

  it('every square has n*n cells, classes add up, ratios reduce', () => {
    for (const [kind, ids] of [['mono', ['Aa-Aa', 'Aa-aa', 'AA-aa']], ['di', ['AaBb-AaBb', 'AaBb-aabb']], ['blood', ['IAi-IBi', 'IAIB-ii', 'IAi-IAi']], ['sex', ['XCXc-XCY', 'XCXC-XcY', 'XCXc-XcY']]] as const) {
      for (const id of ids) {
        const sq = square(kind, id);
        expect(sq.cells.length).toBe(sq.n * sq.n);
        expect(Object.values(countsOf(kind, sq.cells)).reduce((a, b) => a + b, 0)).toBe(sq.n * sq.n);
        expect(genotypeGroups(kind, sq.cells).reduce((a, g) => a + g.cells.length, 0)).toBe(sq.n * sq.n);
      }
    }
    expect(ratioText([3, 1])).toBe('3 : 1');
    expect(ratioText([1, 2, 1])).toBe('1 : 2 : 1');
    expect(ratioText([9, 3, 3, 1])).toBe('9 : 3 : 3 : 1');
    expect(ratioText([4, 4, 4, 4])).toBe('1 : 1 : 1 : 1');
    expect(ratioText([0, 8, 8])).toBe('1 : 1');
    expect(ratioText([4, 0])).toBe('1');
  });

  it('crossFor falls back to the default and detects non-default crosses', () => {
    expect(isDefaultCross('monohibrit', {})).toBe(true);
    expect(isDefaultCross('monohibrit', { 'cross-mono': 'Aa-aa' })).toBe(false);
    expect(crossFor('monohibrit', {}).parents[0]).toEqual([['A', 'a']]);
    expect(crossFor('kan-gruplari', { 'cross-blood': 'IAIB-ii' }).parents[1]).toEqual([['i', 'i']]);
  });
});

describe('genetics: chart values', () => {
  const phaseAfterFill: Record<string, [number, number, string]> = {
    monohibrit: [28, 40, 'genotip-orani'],
    dihibrit: [18, 36, 'genotip-orani'],
    'kan-gruplari': [30, 40, 'sonuc'],
    'eseye-bagli': [30, 40, 'sonuc'],
  };

  it('fill windows match the data phases', () => {
    for (const track of info.tracks) {
      const [t0, t1, after] = phaseAfterFill[track.id]!;
      const fill = track.phases.find((p) => p.id === 'punnett')!;
      expect([fill.start, fill.end]).toEqual([t0, t1]);
      expect(track.phases.find((p) => p.id === after)!.start).toBe(t1);
    }
  });

  it('the chart of the default cross equals the data at the phase boundaries, and grows monotonically', () => {
    for (const track of info.tracks) {
      const kind = TRACK_KIND[track.id]!;
      const [t0, t1, after] = phaseAfterFill[track.id]!;
      const sq = squareOf(crossFor(track.id, {}));
      const end = chartValues(kind, sq, t0, t1, t1);
      const expected = track.phases.find((p) => p.id === after)!.chartPoints!;
      for (const [id, v] of Object.entries(expected)) expect(end[id], `${track.id} ${id}`).toBeCloseTo(v, 6);
      const start = chartValues(kind, sq, t0, t1, t0);
      const zero = track.phases.find((p) => p.id === 'punnett')!.chartPoints!;
      for (const [id, v] of Object.entries(zero)) expect(start[id], `${track.id} ${id} start`).toBeCloseTo(v, 6);
      let prev = chartValues(kind, sq, t0, t1, 0);
      for (let t = 0; t <= t1 + 5; t += 0.25) {
        const now = chartValues(kind, sq, t0, t1, t);
        for (const id of Object.keys(now)) expect(now[id]!).toBeGreaterThanOrEqual((prev[id] as number) - 1e-9);
        expect(Object.keys(now).filter((k) => k !== 'dolu-kare').reduce((s, k) => s + (now[k] as number), 0)).toBeCloseTo(now['dolu-kare'] as number, 9);
        prev = now;
      }
    }
  });

  it('every non-default option gives a complete chart with the right totals', () => {
    for (const option of info.options) {
      const trackId = Object.keys(TRACK_OPTION).find((t) => TRACK_OPTION[t] === option.id)!;
      const kind = TRACK_KIND[trackId]!;
      for (const choice of option.choices) {
        const sq = squareOf(crossFor(trackId, { [option.id]: choice.id }));
        const end = chartValues(kind, sq, 0, 10, 10);
        expect(end['dolu-kare']).toBeCloseTo(sq.n * sq.n, 9);
        expect(Object.keys(end).sort()).toEqual([...seriesOf(kind)].sort());
      }
    }
  });

  it('chart series and class colours agree with the data', () => {
    for (const kind of ['mono', 'di', 'blood', 'sex'] as const) {
      for (const c of classesOf(kind)) {
        const series = info.charts.find((s) => s.id === c.id);
        expect(series, c.id).toBeDefined();
        expect(series!.color).toBe(c.color);
      }
      expect(info.charts.some((s) => s.id === 'dolu-kare')).toBe(true);
    }
  });
});
