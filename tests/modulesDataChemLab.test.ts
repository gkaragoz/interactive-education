import { describe, expect, it } from 'vitest';
import { EXPERIMENTS, type ExperimentDef } from '../src/chemlab';
import { getKazanim, getModule, getSource, sources } from '../src/data';
import { blockedCombos, homeAttemptTable, ppeItems, safetyRules } from '../src/data/chemlabSafety';
import { chemSources } from '../src/data/sources-chem';

// Data tests specific to the chem-lab module (the generic module tests in modulesData.test.ts cover ids, contiguity,
// chart references, check times, correctIndex, sources and kazanımlar for every module including this one).

const m = getModule('chem-lab')!;
const byId = new Map(EXPERIMENTS.map((e) => [e.id, e] as const));

describe('chem-lab module', () => {
  it('has one track per engine experiment, with the same ids and levels, in engine order', () => {
    expect(m).toBeDefined();
    expect(m.tracks.map((t) => t.id)).toEqual(EXPERIMENTS.map((e) => e.id));
    for (const t of m.tracks) expect(t.levels, t.id).toEqual(byId.get(t.id)!.levels);
  });

  it.each(EXPERIMENTS.map((e) => [e.id, e] as const))('%s: three layers aligned with the particle script', (_id, e: ExperimentDef) => {
    const t = m.tracks.find((x) => x.id === e.id)!;
    expect(t.duration).toBeGreaterThanOrEqual(36);
    expect(t.duration).toBeLessThanOrEqual(60);
    // Gözlem first, Denklem last.
    expect(t.phases[0]!.id.startsWith('gozlem-')).toBe(true);
    expect(t.phases[t.phases.length - 1]!.id).toBe('denklem');
    const stages = e.particles[0]!.stages;
    const stagePhases = stages.map((s) => t.phases.find((p) => p.id === s.id));
    for (const p of stagePhases) expect(p, 'particle stage phase exists').toBeDefined();
    const offset = stagePhases[0]!.start;
    stages.forEach((s, i) => {
      expect(stagePhases[i]!.start, `${s.id} start`).toBeCloseTo(offset + s.fromS, 9);
      expect(stagePhases[i]!.end, `${s.id} end`).toBeCloseTo(offset + s.toS, 9);
    });
    // The Gözlem phases fill exactly [0, offset]; Denklem starts when the particle script ends.
    const gozlem = t.phases.filter((p) => p.id.startsWith('gozlem-'));
    expect(gozlem[gozlem.length - 1]!.end).toBeCloseTo(offset, 9);
    expect(t.phases[t.phases.length - 1]!.start).toBeCloseTo(offset + e.particles[0]!.durationS, 9);
  });

  it('chart end values agree with the engine reference run', () => {
    const last = (trackId: string, key: string): number => {
      const t = m.tracks.find((x) => x.id === trackId)!;
      return t.phases[t.phases.length - 1]!.chartPoints![key]!;
    };
    const expected = (expId: string, measurable: string): number => byId.get(expId)!.measurables.find((x) => x.id === measurable)!.expected!;
    expect(last('sirke-kabartma', 'kutle-kaybi')).toBeCloseTo(expected('sirke-kabartma', 'co2-lost-g'), 1);
    expect(last('cokelme-kalsiyum-karbonat', 'cokelek')).toBeCloseTo(expected('cokelme-kalsiyum-karbonat', 'ppt-g'), 1);
    expect(last('demir-bakir', 'bakir-kaplama')).toBeCloseTo(expected('demir-bakir', 'cu-g'), 1);
    expect(last('magnezyum-asit', 'gaz-hacmi')).toBeCloseTo(expected('magnezyum-asit', 'h2-ml'), -1);
    expect(last('magnezyum-yanma', 'magnezyum-oksit')).toBeCloseTo(expected('magnezyum-yanma', 'mgo-g'), 2);
    expect(last('hidrojen-peroksit-katalizor', 'gaz-hacmi')).toBeCloseTo(expected('hidrojen-peroksit-katalizor', 'o2-ml'), -1);
    expect(last('su-elektrolizi', 'hidrojen-hacmi') / last('su-elektrolizi', 'oksijen-hacmi')).toBeCloseTo(expected('su-elektrolizi', 'ratio'), 1);
    expect(last('notrallesme', 'baz-hacmi')).toBeGreaterThan(20);
  });

  it('every engine kazanım is listed on the module and exists', () => {
    for (const e of EXPERIMENTS) for (const k of e.kazanim) expect(m.kazanimIds, `${e.id} ${k}`).toContain(k);
    for (const k of m.kazanimIds) expect(getKazanim(k), k).toBeDefined();
  });

  it('options map onto engine variants and hide where they do not apply', () => {
    const variantFor: Record<string, [string, Record<string, string>]> = {
      'kap-durumu': ['sirke-kabartma', { balon: 'balon' }],
      'cozunme-kosulu': ['cozunme-doygunluk', { 'kno3-oda': 'doygun-oda', 'seker-topak': 'seker-topak', 'seker-toz': 'seker-toz-karisan' }],
      'metal-cifti': ['demir-bakir', { 'cinko-cu-nitrat': 'cinko-bakir-nitrat', 'bakir-feso4': 'bakir-demir-sulfat' }],
      'hiz-etkeni': ['magnezyum-asit', { seyreltik: 'seyreltik', toz: 'toz', sicak: 'sicak' }],
      katalizor: ['hidrojen-peroksit-katalizor', { yok: 'katalizorsuz', iyodur: 'iyodur' }],
      elektrolit: ['su-elektrolizi', { 'saf-su': 'saf-su' }],
    };
    for (const o of m.options) {
      expect(o.trackIds, `${o.id} declares its track`).toHaveLength(1);
      const [expId, map] = variantFor[o.id]!;
      expect(o.trackIds).toEqual([expId]);
      for (const [choice, variant] of Object.entries(map)) {
        expect(o.choices.map((c) => c.id), o.id).toContain(choice);
        expect(Object.keys(byId.get(expId)!.variants ?? {}), `${o.id} ${choice}`).toContain(variant);
      }
      // Choices at levels the track does not have would never be visible.
      const track = m.tracks.find((t) => t.id === expId)!;
      for (const c of o.choices) for (const lv of c.levels ?? []) expect(track.levels).toContain(lv);
    }
  });

  it('keeps Temel texts within the grade limits (no balancing, mole maths, thermochemistry or half equations)', () => {
    for (const t of m.tracks) {
      for (const p of t.phases) {
        const text = p.text.temel?.summary ?? '';
        expect(text, `${t.id}/${p.id}`).not.toMatch(/mmol|kJ|ΔH|\be⁻|KİM\./);
        expect(text, `${t.id}/${p.id}`).not.toMatch(/\d\s?[A-Z][a-z]?[₀-₉]*\s?[+→]/); // no coefficient-style formula equations
      }
    }
  });

  it('has the glossary terms the lead asked for', () => {
    const terms = m.glossary.map((g) => g.termTr.toLocaleLowerCase('tr-TR')).join(' | ');
    for (const needle of ['çözelti', 'çözünen', 'doygun', 'çökelek', 'gaz çıkışı', 'indikatör', 'ph', 'nötralleşme', 'titrasyon', 'katalizör', 'yükseltgenme', 'indirgenme', 'elektroliz', 'yer değiştirme', 'ekzotermik', 'kütlenin korunumu', 'atom', 'iyon', 'molekül']) {
      expect(terms, needle).toContain(needle);
    }
    expect(m.glossary.length).toBeGreaterThanOrEqual(20);
  });

  it('tells the virtual-only magnesium flame apart in notes', () => {
    const t = m.tracks.find((x) => x.id === 'magnezyum-yanma')!;
    expect(t.notes.join(' ')).toContain('yalnızca sanal');
    expect(byId.get('magnezyum-yanma')!.virtualOnly).toBe(true);
  });
});

describe('chem-lab sources', () => {
  it('are https, dated, unique and verified-looking', () => {
    for (const s of chemSources) {
      expect(s.url.startsWith('https://')).toBe(true);
      expect(s.accessed).toBe(s.id === 'meb-kimya-2026' ? '2026-10-24' : s.accessed);
      expect(getSource(s.id)).toBe(s);
    }
    const urls = sources.map((s) => s.url);
    expect(new Set(urls).size, 'no source URL is listed twice').toBe(urls.length);
  });
  it('OpenStax Chemistry is recorded under its real licence', () => {
    for (const s of chemSources.filter((x) => x.kind === 'openstax')) expect(s.license).toBe('CC BY-NC-SA 4.0');
  });
});

describe('chemlab safety data', () => {
  it('has a home-attempt entry for every experiment, exactly once', () => {
    expect(homeAttemptTable.map((h) => h.experimentId).sort()).toEqual(EXPERIMENTS.map((e) => e.id).sort());
  });
  it('the virtual-only experiment is "asla" and hazardous ones are not "gozetimle"', () => {
    for (const h of homeAttemptTable) {
      const e = byId.get(h.experimentId)!;
      expect(h.verdict === 'asla', h.experimentId).toBe(e.virtualOnly);
    }
    for (const id of ['notrallesme', 'demir-bakir', 'magnezyum-asit', 'su-elektrolizi', 'cokelme-kalsiyum-karbonat']) {
      expect(homeAttemptTable.find((h) => h.experimentId === id)!.verdict).toBe('hayir');
    }
  });
  it('every entry has Turkish text and an existing source; ids are unique', () => {
    const all = [...safetyRules, ...ppeItems, ...homeAttemptTable, ...blockedCombos];
    for (const x of all) {
      expect(getSource(x.sourceId), JSON.stringify(x).slice(0, 60)).toBeDefined();
      for (const v of Object.values(x)) if (typeof v === 'string') expect(v.trim().length).toBeGreaterThan(0);
    }
    for (const list of [safetyRules, ppeItems, blockedCombos]) expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    expect(safetyRules.length).toBeGreaterThanOrEqual(8);
    expect(ppeItems.map((p) => p.id)).toEqual(expect.arrayContaining(['gozluk', 'eldiven', 'onluk']));
  });
  it('lesson cards give no quantities or procedures', () => {
    for (const b of blockedCombos) expect(b.lessonTr).not.toMatch(/\d+\s?(mL|g|mol|damla)/i);
  });
  it('blocked combos cover the engine hazard ids', () => {
    const ids = blockedCombos.map((b) => b.id);
    for (const id of ['bleach-acid', 'bleach-ammonia', 'peroxide-vinegar', 'powder-oxidiser', 'heat-closed', 'electrolysis-chloride']) expect(ids).toContain(id);
  });
});
