import { describe, expect, it } from 'vitest';
import { LabSim, REAGENTS, type Op, type VesselKind } from '../../src/chemlab';
import { mulberry32 } from '../../src/core';

const KINDS: VesselKind[] = ['beaker100', 'beaker250', 'erlenmeyer250', 'testtube', 'cylinder100', 'burette25', 'crucible', 'gas-tube', 'hofmann', 'funnel'];
const LIQUIDS = REAGENTS.filter((r) => r.unit === 'mL').map((r) => r.id);
const SOLIDS = REAGENTS.filter((r) => r.unit === 'g').map((r) => r.id);
const SOURCES = ['hotplate', 'bunsen-blue', 'bunsen-yellow', 'alcohol', null] as const;

/** A deterministic random op sequence over a fixed 6-vessel bench. */
function randomOps(seed: number, n: number): Op[] {
  const rnd = mulberry32(seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)] as T;
  const vessels = ['v0', 'v1', 'v2', 'v3', 'v4', 'v5'];
  const ops: Op[] = [];
  for (let i = 0; i < n; i++) {
    const r = rnd();
    const v = pick(vessels);
    const w = pick(vessels);
    if (r < 0.2) ops.push({ op: 'pour', from: pick(LIQUIDS), to: v, ml: 0.1 + rnd() * 80 });
    else if (r < 0.35) ops.push({ op: 'add', reagent: pick(SOLIDS), to: v, g: 0.01 + rnd() * 6, powder: rnd() < 0.3 });
    else if (r < 0.42) ops.push({ op: 'pour', from: v, to: w, ml: rnd() * 60 });
    else if (r < 0.46) ops.push({ op: 'drop', reagent: pick(LIQUIDS), to: v, n: 1 + Math.floor(rnd() * 20) });
    else if (r < 0.52) ops.push({ op: 'heat', vessel: v, source: pick(SOURCES) });
    else if (r < 0.55) ops.push({ op: 'cool', vessel: v, on: rnd() < 0.5 });
    else if (r < 0.6) ops.push({ op: 'stir', vessel: v, on: rnd() < 0.6 });
    else if (r < 0.63) ops.push({ op: 'close', vessel: v, closure: pick(['none', 'balloon', 'stopper'] as const) });
    else if (r < 0.65) ops.push({ op: 'lid', vessel: v, open: rnd() < 0.5 });
    else if (r < 0.68) ops.push({ op: 'gasline', from: v, to: rnd() < 0.8 ? w : null });
    else if (r < 0.7) ops.push({ op: 'electrodes', vessel: v, volts: rnd() < 0.3 ? null : 1 + rnd() * 20 });
    else if (r < 0.73) ops.push({ op: 'filter', from: v, to: w });
    else if (r < 0.75) ops.push({ op: 'testgas', vessel: v, test: pick(['flame', 'glowing-splint', 'limewater'] as const) });
    else if (r < 0.77) ops.push({ op: 'ignite', vessel: v });
    else if (r < 0.79) ops.push({ op: 'place', vessel: v });
    else if (r < 0.8) ops.push({ op: 'dip', strip: 'universal-strip', vessel: v });
    else ops.push({ op: 'wait', s: 0.1 + rnd() * 40 });
  }
  return ops;
}

const newBench = (): LabSim =>
  new LabSim({ bench: { vessels: KINDS.slice(0, 6).concat([]).map((kind, i) => ({ id: `v${i}`, kind })) } });

/** Mixed bench so every kind appears across seeds. */
const benchFor = (seed: number): LabSim => {
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  const kinds = Array.from({ length: 6 }, () => KINDS[Math.floor(rnd() * KINDS.length)] as VesselKind);
  return new LabSim({ seed, bench: { vessels: kinds.map((kind, i) => ({ id: `v${i}`, kind })) } });
};

function assertSane(s: LabSim): void {
  expect(Number.isFinite(s.massBalanceError())).toBe(true);
  expect(Math.abs(s.massBalanceError())).toBeLessThan(1e-6);
  for (const id of s.vesselIds()) {
    const v = s.vessel(id);
    expect(Number.isFinite(v?.tempC ?? NaN)).toBe(true);
    expect(v?.tempC ?? 0).toBeGreaterThan(-60);
    expect(v?.tempC ?? 0).toBeLessThan(3300);
    expect(s.view().volumeMl(id)).toBeGreaterThanOrEqual(0);
    for (const [k, n] of Object.entries(v?.mix ?? {})) {
      expect(Number.isFinite(n), `${id} ${k}`).toBe(true);
      expect(n, `${id} ${k}`).toBeGreaterThanOrEqual(0);
    }
    const ph = s.ph(id);
    if (ph !== null) expect(Number.isFinite(ph)).toBe(true);
    expect(Number.isFinite(s.view().mass(id))).toBe(true);
    const vis = s.visuals(id);
    expect(Number.isFinite(vis?.fillLevel ?? NaN)).toBe(true);
    expect(vis?.fillLevel ?? 0).toBeLessThanOrEqual(1 + 1e-9);
    for (const c of vis?.liquidRgb ?? []) expect(c >= 0 && c <= 255 && Number.isFinite(c)).toBe(true);
  }
  for (const m of s.measurements()) if (typeof m.value === 'number') expect(Number.isFinite(m.value), m.id).toBe(true);
}

describe('property tests with seeded random op sequences', () => {
  const seeds = Array.from({ length: 40 }, (_, i) => i + 1);
  it.each(seeds)('seed %i: mass is conserved and nothing goes negative or NaN', (seed) => {
    const s = benchFor(seed);
    const ops = randomOps(seed, 90);
    for (const op of ops) {
      s.apply(op);
      if (op.op === 'wait' || op.op === 'testgas') assertSane(s);
    }
    assertSane(s);
  });
  it('mass balance holds after every single op, not only after waits', () => {
    const s = benchFor(777);
    for (const op of randomOps(777, 150)) {
      s.apply(op);
      expect(Math.abs(s.massBalanceError())).toBeLessThan(1e-6);
    }
  });
  it('refused ops change nothing (hash is identical before and after)', () => {
    const s = benchFor(5);
    s.pour('bleach', 'v0', 5);
    const before = s.stateHash();
    const r = s.pour('vinegar', 'v0', 5);
    if (r.blocked) expect(s.stateHash()).toBe(before);
    expect(s.add('nope', 'v0', 1).ok).toBe(false);
    expect(s.stateHash()).toBe(before);
  });
  it('really long idle runs stay stable (one simulated day of a mixed bench)', () => {
    const s = benchFor(11);
    for (const op of randomOps(11, 60)) s.apply(op);
    s.advance(86400, 10);
    assertSane(s);
  });
  it('tiny and huge time steps both behave (dt = 1 ms and dt = 5 s)', () => {
    for (const dt of [0.001, 5]) {
      const s = benchFor(3);
      for (const op of randomOps(3, 40)) {
        if (op.op === 'wait') s.advance(Math.min(op.s, 5), dt);
        else s.apply(op);
      }
      assertSane(s);
    }
  });
  it('the empty bench is stable', () => {
    const s = newBench();
    s.advance(100);
    assertSane(s);
    expect(s.journal).toHaveLength(0);
  });
});

describe('determinism, snapshot and reset', () => {
  it('the same seed and ops give the same state hash and the same journal', () => {
    const a = benchFor(21);
    const b = benchFor(21);
    const ops = randomOps(21, 80);
    ops.forEach((op) => {
      a.apply(op);
      b.apply(op);
    });
    expect(a.stateHash()).toBe(b.stateHash());
    expect(a.journal).toEqual(b.journal);
    expect(a.measurements()).toEqual(b.measurements());
  });
  it('different seeds change the drop size and therefore the state', () => {
    const a = new LabSim({ seed: 1, bench: { vessels: [{ id: 'x', kind: 'beaker250' }] } });
    const b = new LabSim({ seed: 2, bench: { vessels: [{ id: 'x', kind: 'beaker250' }] } });
    a.drop('phenolphthalein', 'x', 20);
    b.drop('phenolphthalein', 'x', 20);
    expect(a.view().volumeMl('x')).not.toBe(b.view().volumeMl('x'));
  });
  it('snapshot then restore continues exactly like the original', () => {
    const ops = randomOps(33, 100);
    const a = benchFor(33);
    for (const op of ops.slice(0, 50)) a.apply(op);
    const snap = a.snapshot();
    for (const op of ops.slice(50)) a.apply(op);
    const b = benchFor(33);
    b.restore(snap);
    for (const op of ops.slice(50)) b.apply(op);
    expect(b.stateHash()).toBe(a.stateHash());
    expect(b.journal.length).toBe(a.journal.length);
  });
  it('restore rewinds (scrub back): state returns to the snapshot hash', () => {
    const s = benchFor(8);
    const ops = randomOps(8, 60);
    for (const op of ops.slice(0, 30)) s.apply(op);
    const hash = s.stateHash();
    const snap = s.snapshot();
    for (const op of ops.slice(30)) s.apply(op);
    expect(s.stateHash()).not.toBe(hash);
    s.restore(snap);
    expect(s.stateHash()).toBe(hash);
  });
  it('snapshots are plain JSON', () => {
    const s = benchFor(2);
    for (const op of randomOps(2, 40)) s.apply(op);
    const snap = s.snapshot();
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
  });
  it('restoring does not alias the snapshot (mutating later does not change it)', () => {
    const s = benchFor(4);
    s.pour('water', 'v1', 5);
    const snap = JSON.stringify(s.snapshot());
    const raw = s.snapshot();
    s.restore(raw);
    s.pour('water', 'v1', 5);
    expect(JSON.stringify(raw)).toBe(snap);
  });
  it('reset returns to the bench as loaded (empty vessels, time zero, empty journal)', () => {
    const s = new LabSim({ bench: { vessels: [{ id: 'a', kind: 'beaker100' }] } });
    s.pour('water', 'a', 50);
    s.advance(10);
    s.reset();
    expect(s.time).toBe(0);
    expect(s.journal).toHaveLength(0);
    expect(s.view().volumeMl('a')).toBe(0);
    expect(s.ledger.supplied).toBe(0);
  });
  it('reset with a new ambient temperature uses it', () => {
    const s = new LabSim({ bench: { vessels: [{ id: 'a', kind: 'beaker100' }] } });
    s.reset({ ambientC: 30 });
    expect(s.vessel('a')?.tempC).toBe(30);
  });
  it('a bench with preloaded containers starts with an empty journal', () => {
    const s = new LabSim({ bench: { vessels: [{ id: 'a', kind: 'beaker100' }], preload: [{ op: 'pour', from: 'water', to: 'a', ml: 20 }] } });
    expect(s.view().volumeMl('a')).toBeCloseTo(20, 6);
    expect(s.journal).toHaveLength(0);
    expect(s.view().did('pour')).toBe(false);
    s.reset();
    expect(s.view().volumeMl('a')).toBeCloseTo(20, 6);
  });
  it('duplicate vessel ids are rejected', () => {
    const s = new LabSim({ bench: { vessels: [{ id: 'a', kind: 'beaker100' }] } });
    expect(() => s.addVessel('a', 'beaker100')).toThrow();
  });
  it('a script is the same as applying the ops one by one', () => {
    const ops = randomOps(60, 50);
    const a = benchFor(60);
    const b = benchFor(60);
    a.runScript(ops);
    ops.forEach((op) => b.apply(op));
    expect(a.stateHash()).toBe(b.stateHash());
  });
});

describe('performance budget', () => {
  it('one step with six loaded vessels takes at most 0.5 ms on average', () => {
    const s = new LabSim({ bench: { vessels: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, kind: 'beaker250' as const })) } });
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) {
      s.pour('cuso4-0.1M', id, 50);
      s.add('fe-nail', id, 3);
    }
    s.add('kno3', 'a', 10);
    s.pour('vinegar', 'b', 20);
    s.add('nahco3', 'b', 3);
    s.heat('c', 'hotplate');
    for (let i = 0; i < 300; i++) s.step(1 / 60);
    const n = 3000;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) s.step(1 / 60);
    const per = (performance.now() - t0) / n;
    expect(per).toBeLessThan(0.5);
  });
  it('idle vessels cost almost nothing', () => {
    const s = new LabSim({ bench: { vessels: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, kind: 'beaker250' as const })) } });
    const t0 = performance.now();
    for (let i = 0; i < 5000; i++) s.step(1 / 60);
    expect((performance.now() - t0) / 5000).toBeLessThan(0.05);
  });
});
