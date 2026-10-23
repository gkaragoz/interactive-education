import { describe, expect, it } from 'vitest';
import { getKazanim, getModule, getSource } from '../src/data';
import type { LevelId } from '../src/data';

const m = getModule('membrane-transport')!;
const LEVELS: LevelId[] = ['temel', 'ileri'];
const unique = (ids: string[]): boolean => new Set(ids).size === ids.length;
const TRACKS = ['difuzyon', 'kolaylastirilmis-difuzyon', 'ozmoz', 'aktif-tasima', 'endositoz-ekzositoz'];

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

describe('membrane-transport data (same integrity checks as the mitosis module)', () => {
  it('exists with the planned tracks, kazanımlar and sources', () => {
    expect(m).toBeDefined();
    expect(m.tracks.map((t) => t.id)).toEqual(TRACKS);
    expect(m.kazanimIds).toEqual(['BİY.9.2.2', 'BİY.9.2.3']);
    for (const id of m.kazanimIds) expect(getKazanim(id), id).toBeDefined();
    for (const id of m.sourceIds) expect(getSource(id), id).toBeDefined();
    expect(m.sourceIds.some((id) => getSource(id)?.kind === 'meb')).toBe(true);
    for (const f of m.funFacts) expect(m.sourceIds).toContain(f.sourceId);
    expect(m.funFacts.length).toBeGreaterThanOrEqual(3);
  });

  it('has no empty or padded strings, enough glossary and simplifications', () => {
    for (const s of strings(m)) {
      expect(s.length).toBeGreaterThan(0);
      expect(s).toBe(s.trim());
    }
    expect(m.glossary.length).toBeGreaterThanOrEqual(12);
    expect(unique(m.glossary.map((g) => g.termTr))).toBe(true);
    expect(m.simplifications.length).toBeGreaterThanOrEqual(5);
  });

  it('options have valid defaults; the experiment slider and the İleri-only temperature exist', () => {
    for (const o of m.options) expect(o.choices.map((c) => c.id)).toContain(o.defaultChoice);
    expect(m.options.map((o) => o.id)).toEqual(['derisim-farki', 'hucre-turu', 'sicaklik']);
    expect(m.options[0]!.choices.map((c) => c.id)).toEqual(['kucuk', 'orta', 'buyuk']);
    expect(m.options[2]!.choices.filter((c) => c.levels).every((c) => c.levels!.join() === 'ileri')).toBe(true);
    expect(m.options[2]!.choices.find((c) => c.id === m.options[2]!.defaultChoice)!.levels).toBeUndefined();
  });

  it('chart series are well formed and every phase defines all of them', () => {
    expect(unique(m.charts.map((c) => c.id))).toBe(true);
    for (const c of m.charts) {
      expect(c.max).toBeGreaterThan(c.min);
      expect(c.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
    for (const t of m.tracks) {
      for (const p of t.phases) {
        for (const c of m.charts) {
          const v = p.chartPoints?.[c.id];
          expect(v, `${t.id}/${p.id}/${c.id}`).toBeDefined();
          expect(v!).toBeGreaterThanOrEqual(c.min);
          expect(v!).toBeLessThanOrEqual(c.max);
        }
      }
    }
  });

  describe.each(m.tracks.map((t) => [t.id, t] as const))('track %s', (_id, t) => {
    it.each(LEVELS)('phases at %s are contiguous and cover the whole track', (lv) => {
      const list = t.phases.filter((p) => p.levels.includes(lv)).sort((a, b) => a.start - b.start);
      expect(list.length).toBeGreaterThan(0);
      expect(list[0]!.start).toBe(0);
      for (let i = 1; i < list.length; i++) expect(list[i]!.start).toBeCloseTo(list[i - 1]!.end, 9);
      expect(list[list.length - 1]!.end).toBeCloseTo(t.duration, 9);
    });

    it('Temel text is short and has no detail bullets; İleri has details', () => {
      for (const p of t.phases) {
        expect(p.text.temel?.details).toEqual([]);
        expect(p.text.temel!.summary.length).toBeLessThanOrEqual(220);
        expect(p.text.ileri!.details.length).toBeGreaterThanOrEqual(1);
      }
      expect(t.notes.length).toBeGreaterThanOrEqual(1);
    });

    it('has at least 8 checks (mixed kinds, valid answers, which-phase only at İleri) and 3 predicts', () => {
      const list = m.checks.filter((c) => c.trackId === t.id);
      expect(list.length).toBeGreaterThanOrEqual(8);
      expect(new Set(list.map((c) => c.kind)).size).toBeGreaterThanOrEqual(3);
      expect(new Set(list.map((c) => c.correctIndex)).size).toBeGreaterThanOrEqual(2);
      for (const c of list) {
        expect(c.atTime).toBeGreaterThan(0);
        expect(c.atTime).toBeLessThan(t.duration);
        expect(c.options.length).toBeGreaterThanOrEqual(3);
        expect(c.options.length).toBeLessThanOrEqual(4);
        expect(unique(c.options)).toBe(true);
        expect(c.correctIndex).toBeLessThan(c.options.length);
        if (c.kind === 'which-phase') expect(c.levels).toEqual(['ileri']);
      }
      expect(unique(list.map((c) => String(c.atTime)))).toBe(true);
      const preds = m.predicts.filter((p) => p.trackId === t.id);
      expect(preds.length).toBeGreaterThanOrEqual(3);
      for (const p of preds) expect(p.atTime).toBeLessThan(t.duration);
    });
  });

  it('the answer to each which-phase question is the phase running at that time', () => {
    for (const c of m.checks.filter((x) => x.kind === 'which-phase')) {
      const t = m.tracks.find((x) => x.id === c.trackId)!;
      const phase = t.phases.find((p) => p.start <= c.atTime && c.atTime < p.end)!;
      const wanted = phase.nameTr.toLocaleLowerCase('tr');
      const given = c.options[c.correctIndex]!.toLocaleLowerCase('tr');
      expect(given.split(/[ ,]+/)[0]).toBe(wanted.split(/[ ,]+/)[0]);
    }
  });

  it('chart points follow the physics of the default options', () => {
    const at = (track: string, phase: string): Record<string, number> => m.tracks.find((t) => t.id === track)!.phases.find((p) => p.id === phase)!.chartPoints!;
    expect(at('difuzyon', 'dengesiz-baslangic')['molekul-ic']).toBe(12);
    expect(at('difuzyon', 'dinamik-denge')['derisim-farki']).toBeLessThan(at('difuzyon', 'dengesiz-baslangic')['derisim-farki']!);
    expect(at('aktif-tasima', 'sonuc')['harcanan-atp']).toBe(4);
    expect(at('aktif-tasima', 'sonuc')['derisim-farki']).toBeGreaterThan(at('aktif-tasima', 'derisime-karsi')['derisim-farki']!);
    expect(at('ozmoz', 'karsilastirma')['hucre-hacmi']).toBeLessThan(100);
  });
});
