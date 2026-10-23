import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/core';
import { mitosisMeiosis } from '../../src/data/modules/mitosis-meiosis';
import { KeyTrack } from '../../src/modules/mitosis-meiosis/keys';
import { CHR_CH, type Plan } from '../../src/modules/mitosis-meiosis/plan';
import { buildPlan } from '../../src/modules/mitosis-meiosis/plans';

const TRACKS = ['mitoz', 'mayoz-1', 'mayoz-2', 'mayoz-1-ayrilmama'];
const plan = (track: string, np = 2): Plan => buildPlan(track, np, 2, (s) => mulberry32(s));
const info = (id: string) => mitosisMeiosis.tracks.find((t) => t.id === id)!;

type V = Float32Array;
const frame = (p: Plan, t: number) => {
  const cells = p.cells.map((c) => {
    const v = new Float32Array(8);
    c.eval(t, v);
    return v;
  });
  return cells;
};
function world(cells: V[], cell: number, lx: number, ly: number, lz: number): [number, number, number] {
  const c = cells[cell === 1 ? 1 : 0] as V;
  const cs = Math.cos(c[3] as number);
  const sn = Math.sin(c[3] as number);
  return [(c[1] as number) + lx * cs - ly * sn, (c[2] as number) + lx * sn + ly * cs, lz];
}
/** World position of every chromatid (the cell transform is part of the pose, so frame swaps must not show). */
function chromWorld(p: Plan, t: number): number[][] {
  const cells = frame(p, t);
  const v = new Float32Array(CHR_CH.length);
  return p.chr.map((tr) => {
    tr.eval(t, v);
    return world(cells, Math.round(v[1] as number), v[3] as number, v[4] as number, v[5] as number);
  });
}
function chromState(p: Plan, t: number): number[][] {
  const v = new Float32Array(CHR_CH.length);
  return p.chr.map((tr) => {
    tr.eval(t, v);
    return Array.from(v);
  });
}
function poleWorld(p: Plan, t: number): number[][] {
  const cells = frame(p, t);
  const v = new Float32Array(6);
  return p.poles.map((tr) => {
    tr.eval(t, v);
    return world(cells, Math.round(v[1] as number), Math.cos(v[2] as number) * (v[3] as number), Math.sin(v[2] as number) * (v[3] as number), v[4] as number);
  });
}

const poleSize = (p: Plan, t: number, i: number): number => {
  const v = new Float32Array(6);
  (p.poles[i] as KeyTrack).eval(t, v);
  return v[0] as number;
};

/** Centromeres in the picture: sister chromatids that are still joined count once. */
function centromeres(p: Plan, t: number): number {
  const w = chromWorld(p, t);
  const st = chromState(p, t);
  let n = 0;
  for (let i = 0; i < p.chr.length; i += 2) {
    const a = w[i] as number[];
    const b = w[i + 1] as number[];
    const vis = (st[i]![0] as number) > 0.5 && (st[i + 1]![0] as number) > 0.5;
    const joined = vis && Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!) < 1.2;
    n += !vis ? (st[i]![0]! > 0.5 ? 1 : 0) + (st[i + 1]![0]! > 0.5 ? 1 : 0) : joined ? 1 : 2;
  }
  return n;
}

describe('KeyTrack', () => {
  it('holds, ramps and jumps as keyed', () => {
    const k = new KeyTrack(['a', 'b'], { a: 0 });
    k.to(2, { a: 0 }).to(4, { a: 10 }, 'linear').jump(6, { b: 5 });
    const o = new Float32Array(2);
    k.eval(-3, o);
    expect(o[0]).toBe(0);
    k.eval(3, o);
    expect(o[0]).toBeCloseTo(5, 5);
    k.eval(5.9, o);
    expect(o[1]).toBe(0);
    k.eval(6.1, o);
    expect(o[1]).toBe(5);
  });
});

describe.each(TRACKS)('plan %s', (id) => {
  const p = plan(id);
  const track = info(id);

  it('lasts as long as the data says', () => {
    expect(p.duration).toBe(track.duration);
  });

  it('is a pure function of t: same time, same state; seeking backwards works', () => {
    const times = [0, 3.3, 12.1, 21, 27.5, 33, 38.2, 44, track.duration];
    const first = times.map((t) => JSON.stringify([chromState(p, t), poleWorld(p, t)]));
    const rev = [...times].reverse().map((t) => JSON.stringify([chromState(p, t), poleWorld(p, t)])).reverse();
    expect(rev).toEqual(first);
    const again = buildPlan(id, 2, 2, (s) => mulberry32(s));
    expect(JSON.stringify(chromState(again, 21))).toBe(JSON.stringify(chromState(p, 21)));
  });

  it('has no pops at phase boundaries (world poses are continuous)', () => {
    const eps = 2e-3;
    const edges = new Set<number>();
    for (const ph of track.phases) {
      edges.add(ph.start);
      edges.add(ph.end);
    }
    for (const b of edges) {
      if (b <= eps || b >= track.duration - eps) continue;
      const a = chromWorld(p, b - eps);
      const c = chromWorld(p, b + eps);
      a.forEach((pa, i) => {
        const d = Math.hypot(pa[0]! - c[i]![0]!, pa[1]! - c[i]![1]!, pa[2]! - c[i]![2]!);
        expect(d, `chromatid ${i} at t=${b}`).toBeLessThan(0.08);
      });
      // every centrosome that is drawn before the edge is drawn at the same place after it (a carried centrosome may change slot)
      const before = poleWorld(p, b - eps).filter((_, i) => poleSize(p, b - eps, i) > 0.5);
      const after = poleWorld(p, b + eps).filter((_, i) => poleSize(p, b + eps, i) > 0.5);
      for (const x of before) {
        const nearest = Math.min(...after.map((y) => Math.hypot(x[0]! - y[0]!, x[1]! - y[1]!, x[2]! - y[2]!)));
        expect(nearest, `pole at t=${b}`).toBeLessThan(0.08);
      }
    }
  });

  it('chart values equal the data at the start of each phase', () => {
    for (const ph of track.phases) {
      if (!ph.chartPoints) continue;
      const v = p.chart(ph.start + 1e-6);
      for (const [key, want] of Object.entries(ph.chartPoints)) expect(v[key], `${ph.id}:${key}`).toBeCloseTo(want, 3);
    }
  });
});

describe('chromosome counts (poses vs chart)', () => {
  const perCell = (p: Plan, t: number): number => centromeres(p, t) / (p.chart(t)['cell-count'] as number);
  it('mitosis: 4 until anaphase, 8 in anaphase and telophase, 4 per daughter cell', () => {
    const p = plan('mitoz');
    for (const t of [2, 9, 14, 23, 28.8, 30.5, 35, 40, 43.5]) expect(perCell(p, t), `t=${t}`).toBe(p.chart(t)['chromosome-count']);
  });
  it('mitosis with 2n=6 scales the chart and the scene by 1.5', () => {
    const p = plan('mitoz', 3);
    expect(p.chart(10)['chromosome-count']).toBe(6);
    expect(p.chr.length).toBe(12);
    expect(centromeres(p, 23)).toBe(6);
    expect(centromeres(p, 30.5)).toBe(12);
  });
  it('meiosis I keeps the sister chromatids joined and halves the number per cell at the end', () => {
    const p = plan('mayoz-1');
    for (const t of [3, 13, 24, 31, 40, 47]) expect(perCell(p, t), `t=${t}`).toBe(p.chart(t)['chromosome-count']);
  });
  it('meiosis II splits the sister chromatids once, in anaphase II', () => {
    const p = plan('mayoz-2');
    for (const t of [2, 8, 14, 20, 23, 30, 37]) expect(perCell(p, t), `t=${t}`).toBe(p.chart(t)['chromosome-count']);
  });
  it('non-disjunction: one cell gets 3 chromosomes, the other 1, and the gametes are n+1 and n-1', () => {
    const p = plan('mayoz-1-ayrilmama');
    // at the end the four cells hold 3, 3, 1 and 1 chromosomes
    const w = chromWorld(p, 54);
    // chromatids are chromosomes by now: 1 + 1 on the left (n-1 gametes), 3 + 3 on the right (n+1 gametes)
    expect(w.filter((x) => x[0]! < 0).length).toBe(2);
    expect(w.filter((x) => x[0]! > 0).length).toBe(6);
    expect(p.chart(54)['chromosome-count']).toBe(3);
  });
});

describe('biology of the choreography', () => {
  it('meiosis I: homologs of a pair end up in different cells, sisters stay in one', () => {
    const p = plan('mayoz-1');
    const w = chromWorld(p, 49);
    for (let pair = 0; pair < 2; pair++) {
      const side = (h: number, s: number): number => Math.sign((w[4 * pair + 2 * h + s] as number[])[0] as number);
      expect(side(0, 0)).toBe(side(0, 1));
      expect(side(1, 0)).toBe(side(1, 1));
      expect(side(0, 0)).not.toBe(side(1, 0));
    }
  });
  it('mitosis: sister chromatids end in different daughters', () => {
    const p = plan('mitoz');
    const w = chromWorld(p, 44);
    for (let k = 0; k < 4; k++) expect(Math.sign((w[2 * k] as number[])[0] as number)).not.toBe(Math.sign((w[2 * k + 1] as number[])[0] as number));
  });
  it('crossing over exchanges a segment between non-sister chromatids only', () => {
    const p = plan('mayoz-1');
    const st = chromState(p, 20);
    const seg = (id: number): number => st[id]![13] as number;
    expect(seg(1)).toBeGreaterThan(0.2);
    expect(seg(2)).toBeGreaterThan(0.2);
    expect(seg(0)).toBe(0);
    expect(seg(3)).toBe(0);
    expect(p.meta[1]!.alt).not.toBe(p.meta[1]!.tint);
  });
  it('independent assortment: the assortment code flips which homolog goes left', () => {
    const a = buildPlan('mayoz-1', 2, 0, (s) => mulberry32(s));
    const b = buildPlan('mayoz-1', 2, 3, (s) => mulberry32(s));
    const wa = chromWorld(a, 49);
    const wb = chromWorld(b, 49);
    expect(Math.sign((wa[0] as number[])[0] as number)).not.toBe(Math.sign((wb[0] as number[])[0] as number));
  });
});
