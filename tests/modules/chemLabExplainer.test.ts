import { Plane, Texture, type Object3D, InstancedMesh } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { EXPERIMENTS, mulberry32Compat } from './chemLabTestKit';
import { ELEMENTS, moleculeOf, shapeOf } from '../../src/modules/chem-lab/explainer/molecules';
import { aliveCount, buildPlan, pose, stageAt } from '../../src/modules/chem-lab/explainer/plan';
import { createChemLabExplainer, equationText, findScript } from '../../src/modules/chem-lab/explainer/scene';
import { ModuleAssets, seededRng, type SimContext } from '../../src/scene';

vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 404 })));
vi.setConfig({ testTimeout: 60_000 });

const scripts = EXPERIMENTS.flatMap((e) => e.particles.map((p) => [e.id, p] as const));

describe.each(scripts)('particle plan %s', (_id, script) => {
  const plan = buildPlan(script, mulberry32Compat(5));
  it('keeps the engine counts at the end of every stage (atoms and charge were checked in the engine tests)', () => {
    for (const st of script.stages) {
      const t = st.toS - 0.001;
      for (const sp of script.species) expect(aliveCount(plan, sp.id, t), `${sp.id} at the end of ${st.id}`).toBe(st.counts[sp.id] ?? 0);
    }
  });
  it('starts with the first stage counts', () => {
    const first = script.stages[0]!;
    for (const sp of script.species) expect(aliveCount(plan, sp.id, 0.01)).toBe(first.counts[sp.id] ?? 0);
  });
  it('is a pure function of time and stays inside the box', () => {
    const o1 = { x: 0, y: 0, z: 0, alive: true, scale: 1 };
    const o2 = { x: 0, y: 0, z: 0, alive: true, scale: 1 };
    for (const t of [0.3, script.durationS * 0.4, script.durationS * 0.9]) {
      for (const p of plan.particles) {
        pose(plan, p, t, o1, true);
        pose(plan, p, t, o2, true);
        expect([o1.x, o1.y, o1.z, o1.alive]).toEqual([o2.x, o2.y, o2.z, o2.alive]);
        if (o1.alive) {
          expect(Number.isFinite(o1.x + o1.y + o1.z)).toBe(true);
          expect(Math.abs(o1.x)).toBeLessThan(16);
          expect(Math.abs(o1.y)).toBeLessThan(12);
        }
      }
    }
  });
  it('builds a plan equal for the same seed', () => {
    const again = buildPlan(script, mulberry32Compat(5));
    expect(again.particles.map((p) => [p.sid, p.born, p.died])).toEqual(plan.particles.map((p) => [p.sid, p.born, p.died]));
  });
  it('has a reaction event in every stage that changes counts', () => {
    script.stages.forEach((st, i) => {
      if (i === 0) return;
      const prev = script.stages[i - 1]!.counts;
      const changes = script.species.some((s) => (st.counts[s.id] ?? 0) !== (prev[s.id] ?? 0));
      const evs = plan.events.filter((e) => e.stage === st.id);
      expect(evs.length > 0, st.id).toBe(changes);
    });
  });
  it('maps time to a stage', () => {
    expect(script.stages[stageAt(plan, 0)]).toBe(script.stages[0]);
    expect(script.stages[stageAt(plan, script.durationS - 0.01)]).toBe(script.stages[script.stages.length - 1]);
  });
});

describe('molecules', () => {
  it('every species of every script has a shape with known elements and valid bonds', () => {
    for (const [, script] of scripts) {
      for (const sp of script.species) {
        const m = shapeOf(sp);
        expect(m.atoms.length, sp.id).toBeGreaterThan(0);
        for (const a of m.atoms) expect(ELEMENTS[a.el] ?? { r: 1 }, `${sp.id}:${a.el}`).toBeDefined();
        for (const [i, j] of m.bonds) {
          expect(m.atoms[i]).toBeDefined();
          expect(m.atoms[j]).toBeDefined();
        }
      }
    }
  });
  it('known molecules have the right atom counts', () => {
    const count = (f: string): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const a of moleculeOf(f).atoms) out[a.el] = (out[a.el] ?? 0) + 1;
      return out;
    };
    expect(count('H2O')).toEqual({ O: 1, H: 2 });
    expect(count('CO2')).toEqual({ C: 1, O: 2 });
    expect(count('CH3COOH')).toEqual({ C: 2, O: 2, H: 4 });
    expect(count('H2CO3')).toEqual({ C: 1, O: 3, H: 2 });
    expect(count('HCO3')).toEqual({ C: 1, O: 3, H: 1 });
    expect(count('H3O')).toEqual({ O: 1, H: 3 });
    expect(count('SO4')).toEqual({ S: 1, O: 4 });
  });
});

describe('equation text', () => {
  it('uses the word equation at Temel and state symbols at İleri', () => {
    const f = findScript('e1-particles')!;
    const eq = f.exp.equations.find((e) => e.id === f.script.equationId);
    expect(equationText(eq, 'ileri')).toMatch(/\(aq\)|\(s\)|\(g\)/);
    expect(equationText(eq, 'ileri')).toContain('→');
    expect(equationText(eq, 'temel').length).toBeGreaterThan(5);
    expect(equationText(undefined, 'ileri')).toBe('');
  });
});

let n = 0;
async function open(scriptId: string, quality: 'low' | 'medium' | 'high' = 'medium', reduced = false) {
  const assets = new ModuleAssets(`/nowhere${n++}/`, quality, new Texture(), new Plane(), () => undefined);
  const ctx: SimContext = { assets, quality, level: 'ileri', reducedMotion: reduced, rng: seededRng, experimentId: null, softFlash: true };
  return createChemLabExplainer(ctx, scriptId);
}

const snap = (root: Object3D): number[] => {
  const out: number[] = [];
  root.traverse((o) => {
    if (o instanceof InstancedMesh) out.push(o.count, ...Array.from((o.instanceMatrix.array as Float32Array).subarray(0, Math.min(o.count, 40) * 16)));
  });
  return out;
};

describe.each(scripts)('explainer scene %s', (_id, script) => {
  it('matches the script duration, poses deterministically and labels the equation', async () => {
    const scene = await open(script.id);
    expect(scene.duration).toBe(script.durationS);
    const times = [0, 0.6, script.durationS * 0.3, script.durationS * 0.6, script.durationS];
    const first = times.map((t) => (scene.seek(t), snap(scene.root)));
    [...times].reverse().forEach((t, i) => {
      scene.seek(t);
      expect(snap(scene.root), `t=${t}`).toEqual(first[times.length - 1 - i]);
    });
    scene.seek(script.durationS * 0.5);
    const labels = scene.labelsAt?.(script.durationS * 0.5) ?? [];
    expect(Array.isArray(labels)).toBe(true);
    expect(scene.cameraAt?.(1)).toBeDefined();
    scene.dispose();
  });
});

describe('explainer quality and motion options', () => {
  it('works at low quality and with reduced motion', async () => {
    for (const [q, r] of [['low', false], ['high', true]] as const) {
      const scene = await open('e10-particles', q, r);
      scene.seek(5);
      scene.seek(9);
      scene.dispose();
    }
  });
});
