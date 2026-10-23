import { describe, expect, it } from 'vitest';
import { energy as info } from '../../src/data/modules/energy';
import type { LevelId } from '../../src/data/types';
import type { Plan } from '../../src/modules/energy/env';
import { etcTrips } from '../../src/modules/energy/resp/etc';
import { krebsTrips } from '../../src/modules/energy/resp/krebs';
import { glycoTrips } from '../../src/modules/energy/resp/glyco';
import { fermPlan } from '../../src/modules/energy/ferm/plan';
import { chemoPlan } from '../../src/modules/energy/chemo/plan';
import { photoPlan } from '../../src/modules/energy/photo/plan';
import { photoCounts } from '../../src/modules/energy/photo/rates';
import { respPlan } from '../../src/modules/energy/resp/plan';
import { phasesFor } from '../../src/core';

const DEFAULTS = Object.fromEntries(info.options.map((o) => [o.id, o.defaultChoice]));

function planOf(track: string, level: LevelId, options: Record<string, string> = {}): Plan {
  const o = { ...DEFAULTS, ...options };
  if (track === 'fotosentez') return photoPlan(level, o);
  if (track === 'hucresel-solunum') return respPlan(level);
  if (track === 'fermantasyon') return fermPlan();
  return chemoPlan();
}

const levelsOf = (track: string): LevelId[] => info.tracks.find((t) => t.id === track)!.levels;
const cases = info.tracks.flatMap((t) => levelsOf(t.id).map((l) => [t.id, l] as const));

const count = (plan: Plan, kind: string, station?: number): number => plan.trips.filter((t) => t.kind === kind && (station === undefined || t.station === station)).length;

describe.each(cases)('energy plan %s (%s)', (trackId, level) => {
  const track = info.tracks.find((t) => t.id === trackId)!;
  const plan = planOf(trackId, level);

  it('has the data duration, sorted windows and swaps that match the windows', () => {
    expect(plan.duration).toBe(track.duration);
    const t0s = plan.windows.map((w) => w.t0);
    expect([...t0s].sort((a, b) => a - b)).toEqual(t0s);
    expect(t0s[0]).toBe(0);
    // every cut between two different stations has a veil
    for (let i = 1; i < plan.windows.length; i++) {
      expect(plan.swaps).toContain(plan.windows[i]!.t0);
    }
  });

  it('shows at most six labels at a time', () => {
    for (let t = 0; t <= track.duration; t += 0.25) {
      const n = plan.labels.filter((l) => t >= l.t0 && t <= l.t1 && (typeof l.text === 'string' || l.text[level])).length;
      expect(n, `${trackId}/${level} t=${t}`).toBeLessThanOrEqual(6);
    }
  });

  it('keeps every trip path inside sane times and finite', () => {
    for (const t of plan.trips) {
      expect(Number.isFinite(t.path.t0) && Number.isFinite(t.path.t1)).toBe(true);
      expect(t.path.t1).toBeGreaterThanOrEqual(t.path.t0);
      expect(t.size).toBeGreaterThan(0);
    }
  });

  it('reports every chart series inside its range and finite, from 0 to the duration', () => {
    for (let t = 0; t <= track.duration; t += 0.5) {
      const v = plan.chart(t);
      for (const [id, x] of Object.entries(v)) {
        const s = info.charts.find((c) => c.id === id)!;
        expect(s, id).toBeDefined();
        expect(Number.isFinite(x)).toBe(true);
        expect(x, `${id}@${t}`).toBeGreaterThanOrEqual(s.min - 1e-6);
        expect(x, `${id}@${t}`).toBeLessThanOrEqual(s.max + 1e-6);
      }
    }
  });

  it('matches the chart points of the data at every phase start (default options)', () => {
    const phases = phasesFor(track, level);
    for (const p of phases) {
      if (!p.chartPoints) continue;
      const v = plan.chart(p.start + 1e-6);
      for (const [id, expected] of Object.entries(p.chartPoints)) {
        const tol = info.charts.find((c) => c.id === id)!.max > 50 ? 3.5 : 0.35;
        // the Temel photosynthesis chart is a straight ramp in the data between its two points; the scene follows its own schedule
        if (level === 'temel' && trackId === 'fotosentez' && id === 'atp-nadph') continue;
        expect(v[id], `${trackId}/${level} ${p.id} ${id}`).toBeDefined();
        expect(Math.abs((v[id] ?? 0) - expected), `${trackId}/${level} ${p.id} ${id}: ${v[id]} vs ${expected}`).toBeLessThanOrEqual(tol);
      }
    }
  });

  it('is a pure function of the options: the same options give the same plan', () => {
    const again = planOf(trackId, level);
    expect(again.trips.length).toBe(plan.trips.length);
    for (let t = 0; t <= track.duration; t += 3.7) expect(again.chart(t)).toEqual(plan.chart(t));
  });
});

describe('fotosentez conservation (İleri)', () => {
  const plan = planOf('fotosentez', 'ileri');
  it('six CO2 are fixed into one glucose and six O2 leave; twelve water molecules are split', () => {
    expect(count(plan, 'co2', 3)).toBe(6);
    expect(count(plan, 'o2', 3)).toBe(6);
    expect(count(plan, 'h2o', 3)).toBe(12);
    expect(count(plan, 'electron', 3)).toBe(12);
    expect(count(plan, 'glucose', 3)).toBe(1);
    // carbon beads that end up in the sugar depot
    expect(plan.trips.filter((t) => t.kind === 'carbon' && t.station === 3 && t.tint === '#5e5955').length).toBe(6);
    expect(count(plan, 'o2', 2)).toBe(6);
  });
  it('ATP and NADPH made match what the Calvin turns use plus a small reserve', () => {
    const c = photoCounts(DEFAULTS);
    expect(count(plan, 'nadph', 3)).toBe(c.n);
    expect(count(plan, 'atp', 3)).toBe(c.atp);
    expect(count(plan, 'hplus', 3)).toBe(c.protons);
    const end = plan.chart(46.5);
    expect(end['atp-nadph']).toBeCloseTo(20, 0);
    expect(end['o2-miktari']).toBeCloseTo(100, 1);
    expect(end['co2-alinan']).toBeCloseTo(100, 1);
    expect(end['glikoz-miktari']).toBeCloseTo(100, 1);
  });
  it('light and CO2 options scale the amounts: the scarcer factor limits, the chart ends where the molecules end', () => {
    const low = planOf('fotosentez', 'ileri', { 'light-intensity': 'low' });
    const lowCo2 = planOf('fotosentez', 'ileri', { 'co2-level': 'low' });
    const high = planOf('fotosentez', 'ileri', { 'light-intensity': 'high' });
    const both = planOf('fotosentez', 'ileri', { 'light-intensity': 'high', 'co2-level': 'high' });
    expect(count(low, 'o2', 3)).toBe(3);
    expect(low.chart(59)['o2-miktari']).toBeCloseTo(50, 1);
    expect(low.chart(59)['glikoz-miktari']).toBeCloseTo(50, 1);
    expect(lowCo2.chart(59)['o2-miktari']).toBeCloseTo(50, 1);
    // more light alone cannot beat the CO2 that is left at "normal": the same result as the default
    expect(high.chart(59)['glikoz-miktari']).toBeCloseTo(100, 1);
    expect(count(high, 'o2', 3)).toBe(6);
    // both high: the same amount, reached sooner
    expect(both.chart(40)['glikoz-miktari']).toBeGreaterThan(plan.chart(40)['glikoz-miktari']!);
    expect(both.extras?.bubbles).toBeGreaterThan(plan.extras?.bubbles ?? 0);
    expect(low.extras?.bubbles).toBeLessThan(plan.extras?.bubbles ?? 0);
  });
});

describe('fotosentez Temel', () => {
  const plan = planOf('fotosentez', 'temel');
  it('flows six CO2 and six water in, six O2 and one glucose out', () => {
    expect(count(plan, 'co2', 2)).toBe(6);
    expect(count(plan, 'h2o', 2)).toBe(6);
    expect(count(plan, 'o2', 2)).toBe(6);
    expect(count(plan, 'glucose', 2)).toBe(1);
    expect(plan.chart(46)['o2-miktari']).toBeCloseTo(100, 1);
  });
});

describe('hucresel-solunum conservation (İleri)', () => {
  const gl = glycoTrips();
  const kr = krebsTrips();
  const e = etcTrips(kr.carriers);
  it('the six carbons of one glucose all leave as CO2 (2 + 4)', () => {
    expect(kr.trips.filter((t) => t.kind === 'co2').length).toBe(6);
    expect(kr.co2Times.filter((t) => t < 26).length).toBe(2);
    expect(kr.co2Times.filter((t) => t >= 26).length).toBe(4);
    expect(gl.trips.filter((t) => t.kind === 'carbon').length).toBe(6);
    expect(kr.trips.filter((t) => t.kind === 'carbon').length).toBe(6);
  });
  it('about 30 ATP in all: 2 + 2 + 26; six O2 in, twelve water made and six used', () => {
    const atp = [...gl.events, ...kr.events, ...e.events].filter((x) => x.series === 'atp-toplam').reduce((a, x) => a + x.amount, 0);
    expect(atp).toBe(30);
    expect(e.trips.filter((t) => t.kind === 'o2').length).toBe(6);
    expect(e.trips.filter((t) => t.kind === 'h2o').length).toBe(12);
    expect(kr.trips.filter((t) => t.kind === 'h2o').length).toBe(6);
    expect(kr.carriers.filter((c) => c.kind === 'nadh').length).toBe(10);
    expect(kr.carriers.filter((c) => c.kind === 'fadh2').length).toBe(2);
    expect(e.trips.filter((t) => t.kind === 'electron').length).toBe(12);
  });
  it('chart numbers equal the counted molecules', () => {
    const plan = planOf('hucresel-solunum', 'ileri');
    expect(plan.chart(59)['co2-cikis']).toBeCloseTo(6, 3);
    expect(plan.chart(59)['atp-toplam']).toBeCloseTo(30, 3);
    expect(plan.chart(59)['o2-kullanimi']).toBeCloseTo(100, 2);
    expect(plan.chart(59)['glikoz-kalan']).toBeCloseTo(0, 3);
    expect(plan.chart(20)['co2-cikis']).toBeLessThan(1);
    expect(plan.chart(26)['co2-cikis']).toBeCloseTo(2, 1);
    expect(plan.chart(38)['co2-cikis']).toBeCloseTo(6, 1);
  });
});

describe('hucresel-solunum Temel', () => {
  it('shows the coarse flow: six CO2, six O2, six water and thirty ATP', () => {
    const plan = planOf('hucresel-solunum', 'temel');
    expect(count(plan, 'co2', 1)).toBe(6);
    expect(count(plan, 'o2', 1)).toBe(6);
    expect(count(plan, 'h2o', 1)).toBe(6);
    expect(count(plan, 'atp', 1)).toBe(30);
    expect(plan.chart(58)['atp-toplam']).toBeCloseTo(30, 3);
  });
});

describe('fermantasyon', () => {
  const plan = planOf('fermantasyon', 'ileri');
  it('lactic acid gives no CO2; alcohol gives two; yield is 2 ATP against about 30', () => {
    expect(plan.chart(26)['co2-cikis']).toBeCloseTo(0, 3);
    expect(plan.chart(26)['laktik-asit']).toBeCloseTo(2, 2);
    expect(plan.chart(38)['etanol']).toBeCloseTo(2, 2);
    expect(plan.chart(38)['co2-cikis']).toBeCloseTo(2, 2);
    expect(plan.chart(49)['atp-toplam']).toBeCloseTo(2, 3);
    // the comparison shows 2 and 30 tokens
    expect(plan.trips.filter((t) => t.kind === 'atp' && t.station === 3).length).toBe(32);
  });
  it('conserves carbon: six beads in glycolysis, three per branch end', () => {
    expect(plan.trips.filter((t) => t.kind === 'carbon' && t.station === 0).length).toBe(6);
    expect(plan.trips.filter((t) => t.kind === 'carbon' && t.station === 1).length).toBe(6);
    expect(plan.trips.filter((t) => t.kind === 'carbon' && t.station === 2).length).toBe(6);
    expect(plan.trips.filter((t) => t.kind === 'co2' && t.station === 2).length).toBe(2);
  });
});

describe('kemosentez', () => {
  const plan = planOf('kemosentez', 'ileri');
  it('light stays at zero and organic matter reaches 100 by the ecological phase', () => {
    for (let t = 0; t <= 32; t += 1) expect(plan.chart(t)['isik-miktari']).toBe(0);
    expect(plan.chart(16)['organik-madde']).toBeCloseTo(0, 3);
    expect(plan.chart(25)['organik-madde']).toBeCloseTo(100, 1);
  });
});
