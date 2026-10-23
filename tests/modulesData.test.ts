import { describe, expect, it } from 'vitest';
import { getKazanim, getModule, getSource, modules } from '../src/data';
import type { LevelId, ModuleInfo } from '../src/data';

const LEVELS: LevelId[] = ['temel', 'ileri'];
const EPS = 1e-9;

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

const unique = (ids: string[]) => new Set(ids).size === ids.length;

describe('module registry', () => {
  it('ids are unique and lookup works', () => {
    expect(unique(modules.map((m) => m.id))).toBe(true);
    for (const m of modules) expect(getModule(m.id)).toBe(m);
    expect(getModule('does-not-exist')).toBeUndefined();
  });
});

describe.each(modules.map((m) => [m.id, m] as const))('module %s', (_id, m: ModuleInfo) => {
  const chartIds = new Set(m.charts.map((c) => c.id));

  it('has no empty or padded strings', () => {
    for (const s of strings(m)) {
      expect(s.trim().length).toBeGreaterThan(0);
      expect(s).toBe(s.trim());
    }
  });

  it('references existing sources and kazanımlar', () => {
    expect(m.sourceIds.length).toBeGreaterThanOrEqual(1);
    expect(m.kazanimIds.length).toBeGreaterThanOrEqual(1);
    for (const id of m.sourceIds) expect(getSource(id), `source ${id}`).toBeDefined();
    for (const id of m.kazanimIds) expect(getKazanim(id), `kazanım ${id}`).toBeDefined();
    for (const f of m.funFacts) {
      expect(m.sourceIds.includes(f.sourceId), `fun fact source ${f.sourceId} listed on module`).toBe(true);
      expect(LEVELS.includes(f.level)).toBe(true);
    }
  });

  it('has simplifications, a glossary, options and fun facts', () => {
    expect(m.simplifications.length).toBeGreaterThanOrEqual(1);
    expect(m.glossary.length).toBeGreaterThanOrEqual(12);
    expect(unique(m.glossary.map((g) => g.termTr))).toBe(true);
    expect(m.funFacts.length).toBeGreaterThanOrEqual(3);
    for (const o of m.options) {
      expect(o.choices.map((c) => c.id)).toContain(o.defaultChoice);
      expect(unique(o.choices.map((c) => c.id))).toBe(true);
    }
  });

  it('chart series are well formed', () => {
    expect(unique(m.charts.map((c) => c.id))).toBe(true);
    for (const c of m.charts) {
      expect(c.max).toBeGreaterThan(c.min);
      expect(c.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('track ids are unique', () => {
    expect(unique(m.tracks.map((t) => t.id))).toBe(true);
    expect(m.tracks.length).toBeGreaterThanOrEqual(1);
  });

  describe.each(m.tracks.map((t) => [t.id, t] as const))('track %s', (_tid, t) => {
    it('has unique phase ids and phases inside the duration', () => {
      expect(unique(t.phases.map((p) => p.id))).toBe(true);
      expect(t.notes.length).toBeGreaterThanOrEqual(1);
      for (const p of t.phases) {
        expect(p.start).toBeGreaterThanOrEqual(0);
        expect(p.end).toBeLessThanOrEqual(t.duration + EPS);
        expect(p.end).toBeGreaterThan(p.start);
        expect(p.levels.length).toBeGreaterThan(0);
        for (const lv of p.levels) expect(t.levels.includes(lv), `${p.id} level ${lv} within track levels`).toBe(true);
      }
    });

    it.each(LEVELS)('phases at %s are contiguous, non-overlapping and cover the whole track', (lv) => {
      const list = t.phases.filter((p) => p.levels.includes(lv)).sort((a, b) => a.start - b.start);
      if (!t.levels.includes(lv)) {
        expect(list).toHaveLength(0);
        return;
      }
      expect(list.length).toBeGreaterThan(0);
      expect(list[0]!.start).toBeCloseTo(0, 9);
      for (let i = 1; i < list.length; i++) expect(list[i]!.start, `${list[i]!.id} follows ${list[i - 1]!.id}`).toBeCloseTo(list[i - 1]!.end, 9);
      expect(list[list.length - 1]!.end).toBeCloseTo(t.duration, 9);
    });

    it('has text exactly for the declared levels; Temel has no detail bullets', () => {
      for (const p of t.phases) {
        for (const lv of LEVELS) expect(Boolean(p.text[lv]), `${p.id} ${lv} text`).toBe(p.levels.includes(lv));
        if (p.text.temel) {
          expect(p.text.temel.details).toEqual([]);
          expect(p.text.temel.summary.length).toBeLessThanOrEqual(220);
        }
        if (p.text.ileri) {
          expect(p.text.ileri.details.length).toBeGreaterThanOrEqual(1);
          expect(p.text.ileri.summary.length).toBeLessThanOrEqual(260);
          p.text.ileri.details.forEach((d) => expect(d.length).toBeLessThanOrEqual(260));
        }
      }
    });

    it('chart points use declared series and stay in range', () => {
      const withPoints = t.phases.filter((p) => p.chartPoints);
      expect(withPoints.length).toBeGreaterThan(0);
      for (const p of withPoints) {
        for (const [key, value] of Object.entries(p.chartPoints!)) {
          expect(chartIds.has(key), `${p.id}: series ${key}`).toBe(true);
          const series = m.charts.find((c) => c.id === key)!;
          expect(value).toBeGreaterThanOrEqual(series.min);
          expect(value).toBeLessThanOrEqual(series.max);
        }
      }
      // The first phase must define every series used later, so the chart has a starting value.
      const used = new Set(withPoints.flatMap((p) => Object.keys(p.chartPoints!)));
      const first = [...t.phases].sort((a, b) => a.start - b.start).find((p) => p.chartPoints);
      for (const key of used) expect(first?.chartPoints?.[key], `first chart point defines ${key}`).toBeDefined();
    });

    it('has at least 8 checks with variety and valid fields', () => {
      const list = m.checks.filter((c) => c.trackId === t.id);
      expect(list.length).toBeGreaterThanOrEqual(8);
      expect(new Set(list.map((c) => c.kind)).size).toBeGreaterThanOrEqual(3);
      for (const c of list) {
        expect(c.atTime, `${c.id} time`).toBeGreaterThanOrEqual(0);
        expect(c.atTime).toBeLessThanOrEqual(t.duration);
        expect(c.options.length).toBeGreaterThanOrEqual(3);
        expect(c.options.length).toBeLessThanOrEqual(4);
        expect(unique(c.options)).toBe(true);
        expect(Number.isInteger(c.correctIndex)).toBe(true);
        expect(c.correctIndex).toBeGreaterThanOrEqual(0);
        expect(c.correctIndex).toBeLessThan(c.options.length);
        expect(c.explanationTr.length).toBeGreaterThan(20);
        for (const lv of c.levels) expect(t.levels.includes(lv)).toBe(true);
        // A which-phase question must not appear at Temel: Temel does not name the phases.
        if (c.kind === 'which-phase') expect(c.levels).toEqual(['ileri']);
      }
      // Correct answers should not always sit in the same slot.
      expect(new Set(list.map((c) => c.correctIndex)).size).toBeGreaterThanOrEqual(2);
    });

    it('has at least 3 predict prompts inside the track', () => {
      const list = m.predicts.filter((p) => p.trackId === t.id);
      expect(list.length).toBeGreaterThanOrEqual(3);
      for (const p of list) {
        expect(p.atTime).toBeGreaterThanOrEqual(0);
        expect(p.atTime).toBeLessThan(t.duration);
        for (const lv of p.levels) expect(t.levels.includes(lv)).toBe(true);
      }
    });
  });

  it('option and chart trackIds name real tracks and match the track data', () => {
    const trackIds = new Set(m.tracks.map((t) => t.id));
    for (const o of m.options) for (const id of o.trackIds ?? []) expect(trackIds.has(id), `option ${o.id} -> ${id}`).toBe(true);
    for (const c of m.charts) {
      for (const id of c.trackIds ?? []) expect(trackIds.has(id), `chart ${c.id} -> ${id}`).toBe(true);
      for (const t of m.tracks) {
        const values = t.phases.flatMap((p) => (p.chartPoints && c.id in p.chartPoints ? [p.chartPoints[c.id]!] : []));
        const applies = !c.trackIds || c.trackIds.includes(t.id);
        // A series that applies to a track must have data there; one that does not may only be flat (e.g. zeros).
        if (applies && c.trackIds) expect(values.length, `${c.id} has chart points in ${t.id}`).toBeGreaterThan(0);
        if (!applies) expect(new Set(values).size, `${c.id} is flat in ${t.id}`).toBeLessThanOrEqual(1);
      }
    }
    // Every track keeps at least one visible series.
    for (const t of m.tracks) expect(m.charts.some((c) => !c.trackIds || c.trackIds.includes(t.id)), `${t.id} has series`).toBe(true);
  });

  it('check ids are unique and belong to a real track', () => {
    expect(unique(m.checks.map((c) => c.id))).toBe(true);
    const trackIds = new Set(m.tracks.map((t) => t.id));
    for (const c of m.checks) expect(trackIds.has(c.trackId)).toBe(true);
    for (const p of m.predicts) expect(p.trackId !== undefined && trackIds.has(p.trackId), `predict ${p.atTime} has a valid trackId`).toBe(true);
  });
});

describe('mitosis-meiosis specifics', () => {
  const m = getModule('mitosis-meiosis')!;
  it('exists with the planned tracks and kazanımlar', () => {
    expect(m.tracks.map((t) => t.id)).toEqual(['mitoz', 'mayoz-1', 'mayoz-2', 'mayoz-1-ayrilmama']);
    for (const id of ['FB.8.3.3', 'BİY.12.1.1', 'BİY.12.1.3', 'BİY.12.1.4', 'BİY.12.1.5']) expect(m.kazanimIds).toContain(id);
  });
  it('non-disjunction is İleri only (BİY.12.1.4 is grade 12)', () => {
    const t = m.tracks.find((x) => x.id === 'mayoz-1-ayrilmama')!;
    expect(t.levels).toEqual(['ileri']);
  });
  it('chart values follow the 2n=4 model', () => {
    const mitoz = m.tracks.find((t) => t.id === 'mitoz')!;
    const at = (id: string) => mitoz.phases.find((p) => p.id === id)!.chartPoints!;
    expect(at('metafaz')['chromosome-count']).toBe(4);
    expect(at('anafaz')['chromosome-count']).toBe(8);
    expect(at('g1')['dna-amount']).toBe(2);
    expect(at('g2')['dna-amount']).toBe(4);
    expect(at('sonuc')['cell-count']).toBe(2);
  });
  it('has the metafaz I assortment option, visible at İleri only', () => {
    expect(m.options.find((x) => x.id === 'assortment')!.trackIds).toEqual(['mayoz-1']);
    expect(m.options.find((x) => x.id === 'chromosome-set')!.trackIds).toBeUndefined();
    const o = m.options.find((x) => x.id === 'assortment')!;
    expect(o.labelTr).toBe('Metafaz I dizilişi');
    expect(o.choices.map((c) => c.id)).toEqual(['karisik', 'a', 'b']);
    expect(o.defaultChoice).toBe('karisik');
    for (const c of o.choices) expect(c.levels).toEqual(['ileri']);
    // An option with no choice visible at a level is hidden at that level.
    const visible = (lv: 'temel' | 'ileri') => o.choices.filter((c) => !c.levels || c.levels.includes(lv));
    expect(visible('temel')).toHaveLength(0);
    expect(visible('ileri')).toHaveLength(3);
    // The glossary explains the 2^2 = 4 orientations of the 2n=4 model.
    expect(m.glossary.find((g) => g.termTr === 'Bağımsız dağılım')!.definitionTr).toContain('2² = 4');
    expect(m.simplifications.some((x) => x.includes('Metafaz I dizilişi'))).toBe(true);
  });
  it('offers a 2n=6 choice at İleri only', () => {
    const o = m.options.find((x) => x.id === 'chromosome-set')!;
    expect(o.defaultChoice).toBe('2n4');
    expect(o.choices.find((c) => c.id === '2n6')?.levels).toEqual(['ileri']);
  });
});

describe('genetics chart labels', () => {
  it('counts colour blind daughters too: renk-koru is labelled "Renk körü birey"', () => {
    const g = getModule('genetics')!;
    expect(g.charts.find((c) => c.id === 'renk-koru')!.labelTr).toBe('Renk körü birey');
  });
});
