import { InstancedMesh, Plane, Texture, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { nervous as info } from '../../src/data/modules/nervous';
import { ModuleAssets, seededRng, type ModuleContext, type ModuleScene } from '../../src/scene';
import { createNervousScene } from '../../src/modules/nervous/scene';
import {
  K_PUMP,
  NA_PUMP,
  NA_IN,
  K_OUT,
  SITES,
  WAVE_X0,
  ionCounts,
  kGate,
  kState,
  lagAt,
  localTime,
  naActivation,
  naInactivation,
  naState,
  vmAt,
  vmLocal,
} from '../../src/modules/nervous/action/model';
import { LEGS, flexAt, contractionAt, legAmount, legProgress } from '../../src/modules/nervous/reflex/timing';
import { mainBeadState } from '../../src/modules/nervous/reflex/reflex';
import { PLAN, boundCount, channelOpen, ntPercent, presence, pspAt, tf } from '../../src/modules/nervous/synapse/model';
import { ntPos } from '../../src/modules/nervous/synapse/motion';
import { pchip } from '../../src/modules/nervous/math';

// No network in tests: every model request is a quick 404, so the framework substitutes its placeholders.
vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 404 })));
vi.setConfig({ testTimeout: 60_000 });

let opened = 0;
async function open(trackId: string, level: 'temel' | 'ileri' = 'ileri', quality: 'low' | 'medium' | 'high' = 'medium'): Promise<ModuleScene> {
  const assets = new ModuleAssets(`/nowhere${opened++}/`, quality, new Texture(), new Plane(), () => undefined);
  const ctx: ModuleContext = {
    assets,
    quality,
    level,
    reducedMotion: false,
    trackId,
    options: {},
    rng: seededRng,
  };
  return createNervousScene(ctx);
}

/** Every instance matrix of the scene plus the pose of loose objects: the "picture" at the current time. */
function snapshot(scene: ModuleScene): number[] {
  const out: number[] = [];
  scene.root.traverse((o) => {
    if (o instanceof InstancedMesh) {
      out.push(...Array.from(o.instanceMatrix.array as Float32Array));
      if (o.instanceColor) out.push(...Array.from(o.instanceColor.array as Float32Array));
    } else out.push(...o.position.toArray(), o.rotation.x, o.rotation.y, o.rotation.z, ...o.scale.toArray(), o.visible ? 1 : 0);
  });
  return out;
}

const track = (id: string) => info.tracks.find((t) => t.id === id)!;

describe('action potential model', () => {
  it('passes through the data value at every phase start (-70, -70, -55, +30, -70, -80, -70)', () => {
    const t = track('aksiyon-potansiyeli');
    for (const p of t.phases) expect(vmAt(p.start), p.id).toBeCloseTo(p.chartPoints!['membran-potansiyeli']!, 6);
  });

  it('peaks at +30 exactly at 15 s, never above, and undershoots to -80 at 29 s, never below', () => {
    let max = -Infinity;
    let min = Infinity;
    for (let t = 0; t <= 36; t += 0.01) {
      max = Math.max(max, vmAt(t));
      min = Math.min(min, vmAt(t));
    }
    expect(max).toBeCloseTo(30, 6);
    expect(min).toBeCloseTo(-80, 6);
    expect(vmAt(15)).toBeCloseTo(30, 6);
    expect(vmAt(29)).toBeCloseTo(-80, 6);
    expect(vmAt(5)).toBe(-70);
  });

  it('rises monotonically 6 -> 15 s and falls monotonically 15 -> 29 s (a single spike)', () => {
    for (let t = 6; t < 15; t += 0.05) expect(vmAt(t + 0.05)).toBeGreaterThanOrEqual(vmAt(t) - 1e-9);
    for (let t = 15; t < 29; t += 0.05) expect(vmAt(t + 0.05)).toBeLessThanOrEqual(vmAt(t) + 1e-9);
  });

  it('the wave only travels forward: delay grows with x, none left of the start', () => {
    expect(lagAt(WAVE_X0 - 3)).toBe(0);
    for (let i = 1; i < SITES.length; i++) expect(lagAt(SITES[i]!)).toBeGreaterThan(lagAt(SITES[i - 1]!));
    expect(vmLocal(SITES[3]!, 20)).toBe(vmAt(localTime(SITES[3]!, 20)));
    // threshold (-55 mV) is reached later the further right you look
    const reach = (x: number): number => {
      let t = 0;
      while (vmLocal(x, t) < -55) t += 0.01;
      return t;
    };
    expect(reach(SITES[0]!)).toBeCloseTo(9, 1);
    for (let i = 1; i < SITES.length; i++) expect(reach(SITES[i]!)).toBeGreaterThan(reach(SITES[i - 1]!));
  });

  it('channel states: Na+ closed -> open at threshold -> inactivated at the peak -> closed; K+ opens after the peak', () => {
    expect(naState(8.9)).toBe('closed');
    expect(naState(9)).toBe('open');
    expect(naState(14.9)).toBe('open');
    expect(naState(15)).toBe('inactivated');
    expect(naState(28.9)).toBe('inactivated');
    expect(naState(29)).toBe('closed');
    expect(kState(15.4)).toBe('closed');
    expect(kState(16)).toBe('open');
    expect(kState(27.5)).toBe('closed');
    // the drawn gates agree with the states
    expect(naActivation(5)).toBe(0);
    expect(naActivation(12)).toBe(1);
    expect(naInactivation(12)).toBe(0);
    expect(naInactivation(20)).toBe(1);
    expect(kGate(12)).toBe(0);
    expect(kGate(20)).toBe(1);
    for (let t = 0; t <= 36; t += 0.1)
      for (const g of [naActivation(t), naInactivation(t), kGate(t)]) {
        expect(g).toBeGreaterThanOrEqual(-1e-9);
        expect(g).toBeLessThanOrEqual(1 + 1e-9);
      }
  });

  it('Na+ only crosses while the Na+ channel is open; K+ only while the K+ channel is open', () => {
    for (const tr of NA_IN) {
      expect(naState(tr.t0)).toBe('open');
      expect(naState(tr.t1)).toBe('open');
    }
    for (const tr of K_OUT) {
      expect(kState(tr.t0)).toBe('open');
      expect(kState(tr.t1)).toBe('open');
    }
  });

  it('ion bookkeeping: Na+ inside rises while the channels are open, K+ outside later, the pump restores both in the ratio 3:2', () => {
    expect(NA_PUMP.length * 2).toBe(K_PUMP.length * 3);
    let prev = ionCounts(0);
    expect(prev).toEqual({ naInside: 0, kOutside: 0, naPumped: 0, kPumped: 0 });
    let peakNa = 0;
    let peakK = 0;
    for (let t = 0.5; t <= 36; t += 0.5) {
      const c = ionCounts(t);
      expect(c.naInside).toBeGreaterThanOrEqual(0);
      expect(c.kOutside).toBeGreaterThanOrEqual(0);
      expect(c.naPumped).toBeGreaterThanOrEqual(prev.naPumped);
      expect(c.kPumped).toBeGreaterThanOrEqual(prev.kPumped);
      peakNa = Math.max(peakNa, c.naInside);
      peakK = Math.max(peakK, c.kOutside);
      prev = c;
    }
    expect(peakNa).toBe(SITES.length * 2 * NA_IN.length);
    expect(peakK).toBe(SITES.length * 2 * K_OUT.length);
    expect(ionCounts(36).naInside).toBeLessThan(peakNa);
  });
});

describe('reflex timing', () => {
  const ph = (id: string) => track('refleks-yayi').phases.find((p) => p.id === id)!;

  it('the impulse legs coincide with the data phases: sensory 9-16, motor 22-29', () => {
    const s = LEGS.find((l) => l.id === 'sensory')!;
    const m = LEGS.find((l) => l.id === 'motor')!;
    expect([s.t0, s.t1]).toEqual([ph('duyu-noronu').start, ph('duyu-noronu').end]);
    expect([m.t0, m.t1]).toEqual([ph('motor-noron').start, ph('motor-noron').end]);
    const i = LEGS.find((l) => l.id === 'inter')!;
    expect(i.t0).toBeGreaterThanOrEqual(ph('ara-noron').start);
    expect(i.t1).toBeLessThanOrEqual(ph('ara-noron').end);
  });

  it('pulse travel is monotonic and ordered: sensory, then interneuron, then motor; the brain branch is slower and arrives last', () => {
    const order = ['sensory', 'inter', 'motor'] as const;
    const legs = order.map((id) => LEGS.find((l) => l.id === id)!);
    for (let k = 1; k < legs.length; k++) expect(legs[k]!.t0).toBeGreaterThanOrEqual(legs[k - 1]!.t1);
    for (const l of LEGS) {
      let prev = -1;
      for (let t = 0; t <= 40; t += 0.1) {
        const u = legProgress(l, t);
        expect(u).toBeGreaterThanOrEqual(prev);
        expect(u).toBeGreaterThanOrEqual(0);
        expect(u).toBeLessThanOrEqual(1);
        prev = u;
      }
    }
    const brain = LEGS.find((l) => l.id === 'brain')!;
    const motor = legs[2]!;
    expect(brain.t1).toBeGreaterThan(motor.t1);
    expect(brain.t1 - brain.t0).toBeGreaterThan(motor.t1 - motor.t0);
  });

  it('the bead walks sensory -> gap -> interneuron -> gap -> motor with progress never going back', () => {
    const seen: string[] = [];
    let lastRank = -1;
    let lastU = -1;
    const rank = { sensory: 0, gap1: 1, inter: 2, gap2: 3, motor: 4 } as const;
    for (let t = 8; t <= 31; t += 0.05) {
      const s = mainBeadState(t);
      if (s.neuron === null) continue;
      if (seen[seen.length - 1] !== s.neuron) seen.push(s.neuron);
      const r = rank[s.neuron];
      expect(r).toBeGreaterThanOrEqual(lastRank);
      if (r === lastRank) expect(s.u).toBeGreaterThanOrEqual(lastU - 1e-9);
      lastRank = r;
      lastU = s.u;
    }
    expect(seen).toEqual(['sensory', 'gap1', 'inter', 'gap2', 'motor']);
  });

  it('the hand is pulled away only after the impulse reaches the muscle; contraction is monotone', () => {
    expect(contractionAt(28.9)).toBe(0);
    expect(flexAt(29)).toBeCloseTo(0, 6);
    expect(flexAt(34)).toBeLessThan(flexAt(29) - 0.5);
    for (let t = 29; t < 40; t += 0.1) expect(contractionAt(t + 0.1)).toBeGreaterThanOrEqual(contractionAt(t) - 1e-9);
    for (let t = 2.4; t < 29; t += 0.2) expect(flexAt(t)).toBeCloseTo(0, 6);
    expect(legAmount(LEGS[0]!, 5)).toBe(0);
  });
});

describe('synapse model', () => {
  const t = track('sinaps');

  it('transmitter amount and postsynaptic potential match the data at every phase start', () => {
    for (const p of t.phases) {
      expect(ntPercent(p.start), `${p.id} nt`).toBeCloseTo(p.chartPoints!['nt-miktari']!, 6);
      expect(pspAt(p.start), `${p.id} psp`).toBeCloseTo(p.chartPoints!['postsinaptik-potansiyel']!, 6);
    }
  });

  it('nothing is released before the first vesicle fuses, everything is out by 16 s and gone by 33 s', () => {
    expect(ntPercent(10.4)).toBe(0);
    expect(ntPercent(16)).toBeCloseTo(100, 6);
    expect(ntPercent(33)).toBe(0);
    for (const n of PLAN) {
      expect(n.tRel).toBeGreaterThan(tf(n.v));
      expect(n.tRel + 0.5).toBeLessThanOrEqual(16);
      expect(n.tRem).toBeLessThanOrEqual(33 - 0.3);
      expect(n.tRem - 1.4).toBeGreaterThanOrEqual(n.tRel + 2);
    }
  });

  it('receptor bookkeeping: 8 molecules bind in the binding phase, a channel opens after its first binding and closes after its last release', () => {
    expect(boundCount(20)).toBe(0);
    expect(boundCount(26)).toBe(8);
    expect(boundCount(33)).toBe(0);
    const binds = PLAN.filter((n) => n.bind).map((n) => n.bind!.t);
    expect(Math.min(...binds)).toBeGreaterThanOrEqual(21);
    expect(Math.max(...binds)).toBeLessThanOrEqual(27);
    for (let k = 0; k < 4; k++) {
      expect(channelOpen(k, 20)).toBe(0);
      expect(channelOpen(k, 27)).toBeGreaterThan(0.99);
      expect(channelOpen(k, 33)).toBe(0);
    }
  });

  it('a molecule is continuous in space: no jump bigger than 0.4 units in 0.05 s', () => {
    const a = new Vector3();
    const b = new Vector3();
    for (const i of [0, 7, 14, 22, 31, 36, 45, 49]) {
      ntPos(i, 0, 0.3, a);
      for (let s = 0.05; s <= 36; s += 0.05) {
        ntPos(i, s, 0.3, b);
        expect(b.distanceTo(a), `molecule ${i} at ${s.toFixed(2)}`).toBeLessThan(0.4);
        a.copy(b);
      }
    }
    expect(presence(PLAN[0]!, 5)).toBe(0);
  });
});

describe('pchip', () => {
  it('interpolates its points and stays monotone between them', () => {
    const f = pchip([
      [0, 0],
      [1, 1],
      [2, 5],
      [3, 5.5],
    ]);
    expect([0, 1, 2, 3].map(f)).toEqual([0, 1, 5, 5.5]);
    for (let x = 0; x < 3; x += 0.01) expect(f(x + 0.01)).toBeGreaterThanOrEqual(f(x) - 1e-9);
  });
});

describe.each(info.tracks.map((tr) => [tr.id, tr.duration] as const))('nervous scene %s', (trackId, duration) => {
  it('matches the data duration and poses deterministically (seek twice, out of order, backwards)', async () => {
    const scene = await open(trackId);
    expect(scene.duration).toBe(duration);
    const times = [0, duration * 0.31, duration * 0.62, duration];
    const first = times.map((t) => (scene.seek(t), snapshot(scene)));
    [...times].reverse().forEach((t, i) => {
      scene.seek(t);
      const again = snapshot(scene);
      const ref = first[times.length - 1 - i]!;
      expect(again.length).toBe(ref.length);
      expect(again.every((v, k) => v === ref[k])).toBe(true);
    });
    expect(snapshot(scene).every((v) => Number.isFinite(v))).toBe(true);
    scene.dispose();
  });

  it('is identical across two builds', async () => {
    const a = await open(trackId);
    const b = await open(trackId);
    a.seek(duration * 0.5);
    b.seek(duration * 0.5);
    const sa = snapshot(a);
    const sb = snapshot(b);
    expect(sa.length).toBe(sb.length);
    expect(sa.findIndex((v, k) => v !== sb[k])).toBe(-1);
    a.dispose();
    b.dispose();
  });

  it('chart values stay in range, labels are at most 6, camera is finite, and phase starts match the data', async () => {
    const scene = await open(trackId);
    const tr = track(trackId);
    for (let t = 0; t <= duration; t += duration / 60) {
      const chart = scene.chartAt!(t);
      for (const [id, v] of Object.entries(chart)) {
        const c = info.charts.find((x) => x.id === id)!;
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(c.min - 1e-6);
        expect(v).toBeLessThanOrEqual(c.max + 1e-6);
      }
      const labels = scene.labelsAt!(t);
      expect(labels.length).toBeLessThanOrEqual(6);
      for (const l of labels) expect(l.world.every(Number.isFinite)).toBe(true);
      const cam = scene.cameraAt!(t);
      expect([...cam.position, ...cam.target].every(Number.isFinite)).toBe(true);
    }
    for (const p of tr.phases) {
      const chart = scene.chartAt!(p.start);
      for (const [id, v] of Object.entries(chart)) if (p.chartPoints?.[id] !== undefined) expect(v, `${p.id} ${id}`).toBeCloseTo(p.chartPoints[id]!, 6);
    }
    scene.dispose();
  });

  it('has no pops: no object moves more than 1.6 units between two poses 0.1 s apart', async () => {
    const scene = await open(trackId);
    let prev: number[] | null = null;
    let worst = 0;
    let where = '';
    for (let t = 0; t <= duration; t += 0.1) {
      scene.seek(t);
      const cur: number[] = [];
      scene.root.traverse((o) => {
        if (o instanceof InstancedMesh) {
          const m = o.instanceMatrix.array as Float32Array;
          for (let i = 0; i < o.count; i++) {
            const sc = Math.abs(m[i * 16]!);
            // hidden or vanishing instances do not count as moving
            cur.push(sc < 0.02 ? NaN : m[i * 16 + 12]!, sc < 0.02 ? NaN : m[i * 16 + 13]!);
          }
        }
      });
      if (prev && prev.length === cur.length) {
        for (let k = 0; k < cur.length; k++) {
          const d = Math.abs(cur[k]! - prev[k]!);
          if (Number.isFinite(d) && d > worst) {
            worst = d;
            where = `index ${k} at t=${t.toFixed(1)}`;
          }
        }
      }
      prev = cur;
    }
    expect(worst, where).toBeLessThan(1.6);
    scene.dispose();
  });

  it('builds at low quality and at temel and poses without errors', async () => {
    const scene = await open(trackId, 'temel', 'low');
    scene.seek(duration * 0.4);
    scene.seek(duration * 0.8);
    expect(snapshot(scene).every(Number.isFinite)).toBe(true);
    expect(scene.labelsAt!(duration * 0.5)).toEqual([]);
    scene.dispose();
  });
});

describe('nervous framing', () => {
  it('Temel names fewer parts than Ileri (no interneuron or receptor label at Temel)', async () => {
    const t = await open('refleks-yayi', 'temel');
    const i = await open('refleks-yayi', 'ileri');
    const names = (s: ModuleScene): string[] => [...Array(41).keys()].flatMap((x) => s.labelsAt!(x).map((l) => l.text));
    const tn = names(t);
    const inn = names(i);
    expect(tn.some((x) => x.includes('Ara nöron'))).toBe(false);
    expect(inn.some((x) => x.includes('Ara nöron'))).toBe(true);
    expect(tn.some((x) => x.includes('Reseptör'))).toBe(false);
    expect(inn.some((x) => x.includes('Reseptör'))).toBe(true);
    for (const needed of ['Duyu nöronu', 'Omurilik', 'Motor nöron'])
      expect(
        tn.some((x) => x.includes(needed)),
        needed,
      ).toBe(true);
  });
});
