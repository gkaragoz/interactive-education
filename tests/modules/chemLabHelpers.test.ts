import { describe, expect, it } from 'vitest';
import { EXPERIMENTS } from '../../src/chemlab';
import { FREE_BENCH } from '../../src/scene';
import {
  approach, balanceText, bubbleRate, bubbleRise, crystalCount, fillAt, flameSize, foamHeightCm, glowColor, layerHeightCm, levelY, limitFlash, lumpScale, mixRgb, pourFlow, pourSeconds, pourTilt,
  steamDensity, streamRadius, thermometerTopY, wobbleAmplitude,
} from '../../src/modules/chem-lab/helpers';
import { ANCHORS, layoutBench, shelfSlots, type BenchItem } from '../../src/modules/chem-lab/layout';
import { PROFILE_N, areaAt, profileOf, radiusAt } from '../../src/modules/chem-lab/profile';
import { benchFraming } from '../../src/modules/chem-lab/framing';
import { VESSEL_DEFS } from '../../src/modules/chem-lab/vesselDefs';

describe('volume to height mapping', () => {
  it('maps fill 0..1 onto the usable range of the inner mesh and back', () => {
    expect(levelY(0, 0.21, 7.408)).toBeCloseTo(0.21);
    expect(levelY(1, 0.21, 7.408)).toBeCloseTo(7.408);
    expect(levelY(0.5, 0, 10)).toBeCloseTo(5);
    expect(levelY(2, 0, 10)).toBe(10);
    expect(fillAt(levelY(0.37, 1, 9), 1, 9)).toBeCloseTo(0.37);
  });
  it('settled layers and foam follow mass and cross-section', () => {
    expect(layerHeightCm(0, 2.2, 10)).toBe(0);
    expect(layerHeightCm(2.2, 2.2, 10)).toBeGreaterThan(0);
    expect(layerHeightCm(4, 2.2, 10)).toBeCloseTo(2 * layerHeightCm(2, 2.2, 10));
    expect(foamHeightCm(50, 10)).toBeCloseTo(5);
    expect(foamHeightCm(-3, 10)).toBe(0);
  });
});

describe('colour mixing display', () => {
  it('mixes in linear light: the midpoint of black and white is brighter than sRGB 128', () => {
    const mid = mixRgb([0, 0, 0], [255, 255, 255], 0.5);
    expect(mid[0]).toBeGreaterThan(128);
    expect(mixRgb([10, 20, 30], [200, 100, 50], 0)).toEqual([10, 20, 30]);
    expect(mixRgb([10, 20, 30], [200, 100, 50], 1)).toEqual([200, 100, 50]);
  });
  it('approach is frame-rate independent', () => {
    const one = approach(0, 1, 3, 0.2);
    const two = approach(approach(0, 1, 3, 0.1), 1, 3, 0.1);
    expect(one).toBeCloseTo(two, 10);
    expect(approach(0, 1, 3, 0)).toBe(0);
  });
});

describe('bubbles, steam, flame, glow, flash', () => {
  it('bubble rate grows with intensity and quality and is calm under reduced motion', () => {
    expect(bubbleRate(0, 'high')).toBe(0);
    expect(bubbleRate(1, 'low')).toBeLessThan(bubbleRate(1, 'medium'));
    expect(bubbleRate(1, 'medium')).toBeLessThan(bubbleRate(1, 'high'));
    expect(bubbleRate(1, 'high', true)).toBeLessThanOrEqual(6);
    expect(bubbleRise(1, 0.1)).toBeGreaterThan(bubbleRise(0, 0.1));
  });
  it('steam starts at 55 C and is full at the boiling point; flames and glow are bounded', () => {
    expect(steamDensity(30, 50)).toBe(0);
    expect(steamDensity(100, 50)).toBe(1);
    expect(steamDensity(100, 0)).toBe(0);
    expect(flameSize('bunsen-blue')).toBeGreaterThan(flameSize('alcohol'));
    expect(flameSize(null)).toBe(0);
    for (const g of [0, 0.5, 1, 2]) for (const c of glowColor(g)) expect(c).toBeGreaterThanOrEqual(0);
  });
  it('the flash is rate limited and capped when soft (photosensitivity)', () => {
    let v = 0;
    for (let i = 0; i < 6; i++) v = limitFlash(v, 1, 1 / 60, false);
    expect(v).toBeLessThan(0.7);
    let soft = 0;
    for (let i = 0; i < 600; i++) soft = limitFlash(soft, 1, 1 / 60, true);
    expect(soft).toBeCloseTo(0.35);
    // never more than the allowed rise per second, however the target jumps
    expect(limitFlash(0, 1, 0.1, false) - 0).toBeLessThanOrEqual(0.61);
  });
  it('wobble is zero with reduced motion', () => {
    expect(wobbleAmplitude(true, 1, 1, true)).toBe(0);
    expect(wobbleAmplitude(true, 0, 0, false)).toBeGreaterThan(wobbleAmplitude(false, 0, 0, false));
  });
});

describe('pour curve', () => {
  it('tilts in, holds and tilts back', () => {
    expect(pourTilt(0)).toBe(0);
    expect(pourTilt(1)).toBe(0);
    expect(pourTilt(0.5)).toBeCloseTo(1.25);
    expect(pourTilt(0.1)).toBeLessThan(pourTilt(0.3));
  });
  it('flow and stream radius grow with tilt; the step takes a sensible time', () => {
    expect(pourFlow(1)).toBeGreaterThan(pourFlow(0));
    expect(pourFlow(1, 100)).toBeLessThanOrEqual(pourFlow(1, 4));
    expect(streamRadius(40)).toBeGreaterThan(streamRadius(1));
    expect(pourSeconds(1)).toBeGreaterThanOrEqual(0.45);
    expect(pourSeconds(10_000)).toBeLessThanOrEqual(4);
  });
});

describe('instruments', () => {
  it('thermometer column follows the asset meta (-10 C at 3.2, 110 C at 20)', () => {
    expect(thermometerTopY(-10)).toBeCloseTo(3.2);
    expect(thermometerTopY(110)).toBeCloseTo(20);
    expect(thermometerTopY(500)).toBeCloseTo(20);
    expect(thermometerTopY(50)).toBeGreaterThan(thermometerTopY(20));
  });
  it('balance text uses a decimal comma and two decimals', () => {
    expect(balanceText(12.3456)).toBe('12,35');
    expect(balanceText(0.001)).toBe('0,00');
    expect(balanceText(null)).toBe('-.--');
    expect(balanceText(Number.NaN)).toBe('-.--');
  });
  it('crystals shrink with their mass', () => {
    expect(crystalCount(0, 100, false)).toBe(0);
    expect(crystalCount(0.01, 100, true)).toBeGreaterThanOrEqual(1);
    expect(crystalCount(50, 40, true)).toBe(40);
    expect(lumpScale(0.5, 1)).toBeCloseTo(Math.cbrt(0.5));
    expect(lumpScale(0, 1)).toBe(0);
  });
});

describe('cavity profile', () => {
  const cylinder = (r: number, y0: number, y1: number): number[] => {
    const out: number[] = [];
    for (let k = 0; k <= 30; k++) for (let a = 0; a < 12; a++) out.push(Math.cos((a / 12) * 6.283) * r, y0 + ((y1 - y0) * k) / 30, Math.sin((a / 12) * 6.283) * r);
    return out;
  };
  it('recovers the radius of a cylinder at every height', () => {
    const p = profileOf(cylinder(3, 0, 8), 0, 8);
    expect(p.r.length).toBe(PROFILE_N);
    for (const y of [0, 2, 5, 8]) expect(radiusAt(p, y)).toBeCloseTo(3, 1);
    expect(areaAt(p, 4)).toBeCloseTo(Math.PI * 9, 0);
    expect(p.cx).toBeCloseTo(0, 2);
  });
  it('follows a cone', () => {
    const pts: number[] = [];
    for (let k = 0; k <= 30; k++) for (let a = 0; a < 12; a++) pts.push(Math.cos((a / 12) * 6.283) * (1 + (k / 30) * 3), (k / 30) * 6, Math.sin((a / 12) * 6.283) * (1 + (k / 30) * 3));
    const p = profileOf(pts, 0, 6);
    expect(radiusAt(p, 0)).toBeCloseTo(1, 0);
    expect(radiusAt(p, 6)).toBeCloseTo(4, 0);
    expect(radiusAt(p, 3)).toBeGreaterThan(radiusAt(p, 1));
  });
});

const benches: [string, BenchItem[]][] = [
  ['free bench', FREE_BENCH.vessels.map((v) => ({ id: v.id, kind: v.kind }))],
  ...EXPERIMENTS.map((e) => [e.id, e.bench.vessels.map((v) => ({ id: v.id, kind: v.kind }))] as [string, BenchItem[]]),
];

describe.each(benches)('bench layout: %s', (_name, items) => {
  const layout = layoutBench(items);
  it('places every vessel exactly once', () => {
    for (const it of items) expect(layout.placed[it.id], it.id).toBeDefined();
    expect(Object.keys(layout.placed).sort()).toEqual(items.map((i) => i.id).sort());
  });
  it('keeps vessels apart and on the bench', () => {
    const list = Object.values(layout.placed).filter((p) => p.mount === 'bench' || p.mount === 'trough' || p.mount === 'hofmann');
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!;
        const b = list[j]!;
        const ka = items.find((x) => x.id === a.id)!.kind;
        const kb = items.find((x) => x.id === b.id)!.kind;
        if (Math.abs(a.z - b.z) > 6) continue;
        const need = (VESSEL_DEFS[ka].radius + VESSEL_DEFS[kb].radius) * 0.9;
        expect(Math.abs(a.x - b.x) + (a.mount === 'hofmann' || b.mount === 'hofmann' ? 12 : 0), `${a.id} vs ${b.id}`).toBeGreaterThanOrEqual(need - 1e-6);
      }
    }
    expect(layout.tiles).toBeGreaterThanOrEqual(1);
    for (const p of Object.values(layout.placed)) expect(Math.abs(p.x)).toBeLessThanOrEqual((layout.tiles * ANCHORS.tile) / 2);
  });
  it('is deterministic', () => {
    expect(layoutBench(items)).toEqual(layout);
  });
});

describe('bench layout specifics', () => {
  it('test tubes stand in the rack holes (six per rack)', () => {
    const l = layoutBench(Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, kind: 'testtube' as const })));
    expect(l.units.filter((u) => u.kind === 'rack')).toHaveLength(2);
    expect(l.placed['t0']?.mount).toBe('rack');
  });
  it('a burette claims the flask under it; a funnel claims the beaker that follows it', () => {
    const l = layoutBench([{ id: 'f', kind: 'erlenmeyer250' }, { id: 'b', kind: 'burette25' }]);
    expect(l.placed['f']?.x).toBeCloseTo((l.placed['b']?.x ?? 0), 5);
    const l2 = layoutBench([{ id: 'a', kind: 'beaker250' }, { id: 'fun', kind: 'funnel' }, { id: 'b', kind: 'beaker250' }]);
    expect(l2.placed['fun']?.x).toBeCloseTo(l2.placed['b']?.x ?? -1, 5);
    expect(l2.placed['a']?.x).not.toBeCloseTo(l2.placed['b']?.x ?? -1, 1);
  });
  it('the balance is optional and makes the bench narrower', () => {
    const items: BenchItem[] = [{ id: 'h', kind: 'hofmann' }];
    const a = layoutBench(items, true);
    const b = layoutBench(items, false);
    expect(a.hasBalance).toBe(true);
    expect(b.hasBalance).toBe(false);
    expect(b.width).toBeLessThan(a.width);
    expect(b.tiles).toBe(1);
  });
  it('shelf slots are centred and evenly spaced', () => {
    const xs = shelfSlots(5, 50);
    expect(xs).toHaveLength(5);
    expect(xs.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 6);
    expect(shelfSlots(0, 50)).toEqual([]);
  });
});

describe('bench framing', () => {
  it('frames the tiles and the tallest apparatus and limits the orbit', () => {
    const l = layoutBench([{ id: 'h', kind: 'hofmann' }]);
    const f = benchFraming(l, ['hofmann']);
    expect(f.halfWidth ?? 0).toBeGreaterThan((l.tiles * 56) / 2);
    expect(f.halfHeight ?? 0).toBeGreaterThan(25);
    expect(f.polarMax ?? 9).toBeLessThan(Math.PI / 2);
    expect(f.azimuthMin ?? 0).toBeLessThan(0);
    const flat = benchFraming(layoutBench([{ id: 'b', kind: 'beaker100' }]), ['beaker100']);
    expect(flat.halfHeight ?? 0).toBeLessThan(f.halfHeight ?? 0);
  });
});
