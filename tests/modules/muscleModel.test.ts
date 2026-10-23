import { describe, expect, it } from 'vitest';
import { muscle as info } from '../../src/data/modules/muscle';
import { ANGLE_KEYS, angleForBicepsRatio, armAt, bicepsBelly, tricepsBelly } from '../../src/modules/muscle/armModel';
import { evalKeys } from '../../src/modules/muscle/math';
import { A_LEN, FULL_L, headPose, REST_L, SITE, THIN_LEN, sarcAt } from '../../src/modules/muscle/sarcModel';
import { levelWeight, zoomAt } from '../../src/modules/muscle/zoom';

const times = (end: number, step: number): number[] => Array.from({ length: Math.round(end / step) + 1 }, (_, i) => i * step);
const track = (id: string) => info.tracks.find((t) => t.id === id)!;

describe('sarcomere band bookkeeping', () => {
  it('keeps the A band constant and splits the rest into I and H consistently', () => {
    for (const t of times(40, 0.25)) {
      const s = sarcAt(t);
      expect(s.A).toBe(A_LEN);
      expect(s.I).toBeCloseTo(s.L - A_LEN, 12);
      expect(s.L).toBeGreaterThanOrEqual(FULL_L - 1e-9);
      expect(s.L).toBeLessThanOrEqual(REST_L + 1e-9);
      // the thin filaments (length 1.0) overlap the A band by THIN - I/2 on each side; the rest of the A band is the H zone
      expect(s.H).toBeCloseTo(Math.max(0, A_LEN - 2 * (THIN_LEN - s.I / 2)), 12);
    }
  });

  it('shortens from 2.4 to 2.0 while I and H shrink and lengthens back', () => {
    expect(sarcAt(0).L).toBe(REST_L);
    expect(sarcAt(24).L).toBe(FULL_L);
    expect(sarcAt(24).H).toBe(0);
    expect(sarcAt(10).H).toBeCloseTo(0.4, 12);
    expect(sarcAt(10).I).toBeCloseTo(0.8, 12);
    expect(sarcAt(24).I).toBeCloseTo(0.4, 12);
    let prev = sarcAt(10);
    for (const t of times(14, 0.1).map((x) => x + 10)) {
      const s = sarcAt(t);
      expect(s.L).toBeLessThanOrEqual(prev.L + 1e-12);
      expect(s.I).toBeLessThanOrEqual(prev.I + 1e-12);
      expect(s.H).toBeLessThanOrEqual(prev.H + 1e-12);
      prev = s;
    }
    prev = sarcAt(28);
    for (const t of times(10, 0.1).map((x) => x + 28)) {
      const s = sarcAt(t);
      expect(s.L).toBeGreaterThanOrEqual(prev.L - 1e-12);
      prev = s;
    }
    expect(sarcAt(38).L).toBe(REST_L);
  });

  it('matches the chart points of the data at every phase start', () => {
    for (const trackId of ['kasilma']) {
      for (const p of track(trackId).phases) {
        if (!p.chartPoints) continue;
        const s = sarcAt(p.start);
        const own: Record<string, number> = { 'sarkomer-boyu': s.L, 'a-bandi': s.A, 'i-bandi': s.I, 'h-bandi': s.H };
        for (const [id, v] of Object.entries(p.chartPoints)) expect(own[id], `${p.id} ${id}`).toBeCloseTo(v, 9);
      }
    }
  });
});

describe('myosin heads', () => {
  it('are continuous in the slide (no pops, also across the cycle wrap)', () => {
    for (const offset of [0, 0.31, 0.77]) {
      let prev = headPose(0, offset, 1);
      for (let slide = 0.001; slide <= 0.2; slide += 0.001) {
        const h = headPose(slide, offset, 1);
        expect(Math.abs(h.delta - prev.delta)).toBeLessThan(0.0045);
        expect(Math.abs(h.lift - prev.lift)).toBeLessThan(0.006);
        prev = h;
      }
    }
  });

  it('keep an attached head on the same actin site: its tip moves exactly with the thin filament', () => {
    let checked = 0;
    for (let slide = 0; slide < 0.2; slide += 0.003) {
      const a = headPose(slide, 0.13, 1);
      const b = headPose(slide + 0.0004, 0.13, 1);
      if (!a.attached || !b.attached) continue;
      expect(b.delta - a.delta).toBeCloseTo(-0.0004, 9);
      checked++;
    }
    expect(checked).toBeGreaterThan(10);
    expect(SITE).toBeGreaterThan(0);
  });

  it('pull toward the centre (delta falls) while attached and swing back while detached', () => {
    const attached = [headPose(0.001, 0, 1), headPose(0.02, 0, 1)];
    expect(attached[0]!.attached && attached[1]!.attached).toBe(true);
    expect(attached[1]!.delta).toBeLessThan(attached[0]!.delta);
    const back = [headPose(0.08, 0, 1), headPose(0.1, 0, 1)];
    expect(back[0]!.attached).toBe(false);
    expect(back[1]!.delta).toBeGreaterThan(back[0]!.delta);
  });
});

describe('elbow model', () => {
  it('follows the data values at every phase start of eklem-hareketi', () => {
    for (const p of track('eklem-hareketi').phases) {
      if (!p.chartPoints) continue;
      const s = armAt(p.start);
      expect(s.angle, `${p.id} angle`).toBeCloseTo(p.chartPoints['dirsek-acisi']!, 6);
      expect(s.biceps, `${p.id} biceps`).toBeCloseTo(p.chartPoints['biseps']!, 6);
      expect(s.triceps, `${p.id} triceps`).toBeCloseTo(p.chartPoints['triseps']!, 6);
    }
  });

  it('is antagonistic: one muscle works while the other is (nearly) relaxed', () => {
    for (const t of times(36, 0.1)) {
      const s = armAt(t);
      expect(Math.min(s.biceps, s.triceps), `t=${t}`).toBeLessThanOrEqual(40);
    }
    // bending: biceps on, triceps off, angle falling; opening: the other way round
    for (const t of [6, 8, 10, 12]) {
      const s = armAt(t);
      expect(s.biceps).toBeGreaterThan(s.triceps);
      expect(armAt(t + 0.1).angle).toBeLessThanOrEqual(s.angle);
    }
    for (const t of [24, 26, 28]) {
      const s = armAt(t);
      expect(s.triceps).toBeGreaterThan(s.biceps);
      expect(armAt(t + 0.1).angle).toBeGreaterThanOrEqual(s.angle);
    }
  });

  it('shortens the biceps and stretches the triceps when the elbow bends', () => {
    expect(bicepsBelly(45)).toBeLessThan(bicepsBelly(160) * 0.75);
    expect(tricepsBelly(45)).toBeGreaterThan(tricepsBelly(160));
  });

  it('is smooth: angle and activities never jump', () => {
    let prev = armAt(0);
    for (const t of times(36, 0.02).slice(1)) {
      const s = armAt(t);
      expect(Math.abs(s.angle - prev.angle)).toBeLessThan(2.5);
      expect(Math.abs(s.biceps - prev.biceps)).toBeLessThan(3);
      expect(Math.abs(s.triceps - prev.triceps)).toBeLessThan(3);
      prev = s;
    }
    expect(evalKeys(ANGLE_KEYS, 22)).toBeLessThan(55); // the "about 45 degrees" of the check question at 22 s
  });

  it('ties the whole-muscle shortening to the sarcomere shortening', () => {
    for (const c of [0, 0.25, 0.5, 1]) {
      const ratio = 1 - (c * (REST_L - FULL_L)) / REST_L;
      const angle = angleForBicepsRatio(ratio);
      expect(bicepsBelly(angle) / bicepsBelly(160)).toBeCloseTo(ratio, 3);
    }
  });
});

describe('zoom', () => {
  it('always shows something: the level weights never fade out together', () => {
    for (const t of times(40, 0.05)) {
      const z = zoomAt(t);
      const total = [0, 1, 2, 3, 4, 5].reduce((s, k) => s + levelWeight(k, z), 0);
      expect(total, `t=${t} z=${z}`).toBeGreaterThan(0.6);
    }
  });
  it('starts at the arm, rests at the sarcomere through the contraction, and returns to the arm', () => {
    expect(zoomAt(0)).toBe(0);
    expect(zoomAt(10)).toBe(5);
    expect(zoomAt(24)).toBe(5);
    expect(zoomAt(40)).toBe(0);
  });
});
