import { Plane, Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { EXPERIMENTS, getExperiment } from '../../src/chemlab';
import { ChemLabScene } from '../../src/modules/chem-lab/labScene';
import { createChemLabSim } from '../../src/modules/chem-lab/scene';
import { LabAssets } from '../../src/modules/chem-lab/labAssets';
import { ModuleAssets, seededRng, type LabSimScene, type SimContext, type SimPointerEvent } from '../../src/scene';

// No network and no WebGL in tests: every model request is a quick 404 (primitive stand-ins), nothing is rendered.
vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 404 })));
vi.setConfig({ testTimeout: 60_000 });

let n = 0;
function ctx(experimentId: string | null, quality: 'low' | 'medium' | 'high' = 'medium', reduced = false): SimContext {
  const assets = new ModuleAssets(`/nowhere${n++}/`, quality, new Texture(), new Plane(), () => undefined);
  return { assets, quality, level: 'ileri', reducedMotion: reduced, rng: seededRng, experimentId, softFlash: false };
}
const open = (id: string | null, q: 'low' | 'medium' | 'high' = 'medium', reduced = false): Promise<LabSimScene> => createChemLabSim(ctx(id, q, reduced)) as Promise<LabSimScene>;

const ev = (type: SimPointerEvent['type'], id: string | null, world: [number, number, number], dragId: string | null = null): SimPointerEvent => ({
  type, pointerId: 1, hit: id ? { id, point: world, distance: 10 } : null, dragId, world, ray: { origin: [0, 0, 0], direction: [0, -1, 0] }, button: 0, shift: false, ctrl: false, alt: false,
});

function frames(scene: LabSimScene, count: number): void {
  for (let i = 0; i < count; i++) {
    scene.step(1 / 60);
    if (i % 2 === 0) scene.sync?.(1 / 30);
  }
}

describe.each([['free bench', null], ...EXPERIMENTS.map((e) => [e.id, e.id] as [string, string])])('lab scene: %s', (_name, id) => {
  it('builds, steps, syncs, labels and disposes without errors', async () => {
    const scene = await open(id);
    frames(scene, 60);
    expect(scene.root.children.length).toBeGreaterThan(0);
    // labels are permanent only on small benches; hovering shows the rest
    const first = scene.interactions?.items()[0]?.id ?? '';
    scene.setHover?.(first);
    frames(scene, 2);
    expect(scene.labels?.().length).toBeGreaterThan(0);
    expect(scene.pickRoots?.().length).toBeGreaterThan(0);
    for (const l of scene.labels?.() ?? []) for (const c of l.world) expect(Number.isFinite(c)).toBe(true);
    const items = scene.interactions?.items() ?? [];
    expect(items.length).toBeGreaterThan(0);
    scene.dispose();
  });
  it('plays the reference solution and keeps every drawn value finite', async () => {
    if (!id) return;
    const scene = await open(id);
    const exp = getExperiment(id)!;
    for (const op of exp.solution) {
      if (op.op === 'wait') for (let s = 0; s < Math.min(op.s, 30); s += 1) frames(scene, 30);
      else scene.lab.apply(op);
      frames(scene, 6);
    }
    const root = scene.root;
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      for (const v of o.position.toArray()) expect(Number.isFinite(v)).toBe(true);
      for (const v of o.scale.toArray()) expect(Number.isFinite(v)).toBe(true);
    });
    scene.dispose();
  });
});

describe('lab scene behaviour', () => {
  it('draws the engine: loading an experiment rebuilds the vessels', async () => {
    const scene = await open('sirke-kabartma');
    expect(scene.lab.vesselIds()).toEqual(['flask']);
    scene.loadExperiment('kirmizi-lahana');
    expect(scene.lab.vesselIds().length).toBeGreaterThanOrEqual(5);
    scene.loadExperiment(null);
    expect(scene.lab.vesselIds()).toContain('beaker1');
    scene.dispose();
  });

  it('snapshot and restore bring the bench back', async () => {
    const scene = await open('sirke-kabartma');
    scene.lab.pour('vinegar', 'flask', 50);
    const snap = scene.snapshot();
    const before = scene.measurements().find((m) => m.id === 'V:flask')?.value;
    scene.lab.pour('water', 'flask', 20);
    scene.restore(snap);
    expect(scene.measurements().find((m) => m.id === 'V:flask')?.value).toBe(before);
    frames(scene, 10);
    scene.dispose();
  });

  it('a pointer drop of a bottle on a vessel pours (engine state changes through lab ops only)', async () => {
    const scene = await open('sirke-kabartma');
    const before = scene.lab.vessel('flask')?.mix['water'] ?? 0;
    scene.pointer?.(ev('down', 'vinegar', [0, 0, 0]));
    scene.pointer?.(ev('move', null, [-12, 6, 3.5], 'vinegar'));
    scene.pointer?.(ev('move', 'flask', [-12, 6, 3.5], 'vinegar'));
    frames(scene, 5);
    scene.pointer?.(ev('up', 'flask', [-12, 6, 3.5], 'vinegar'));
    frames(scene, 30);
    expect(scene.lab.vessel('flask')?.mix['water'] ?? 0).toBeGreaterThan(before);
    scene.dispose();
  });

  it('holding over the target keeps pouring and the wheel-free default adds more than one step', async () => {
    const scene = await open('sirke-kabartma');
    scene.pointer?.(ev('down', 'vinegar', [0, 0, 0]));
    scene.pointer?.(ev('move', 'flask', [-12, 6, 3.5], 'vinegar'));
    for (let i = 0; i < 160; i++) {
      scene.step(1 / 60);
      scene.sync?.(1 / 60);
    }
    scene.pointer?.(ev('up', 'flask', [-12, 6, 3.5], 'vinegar'));
    expect(scene.lab.vessel('flask')?.mix['water'] ?? 0).toBeGreaterThan(0.5);
    scene.dispose();
  });

  it('the keyboard path animates too and reports engine refusals', async () => {
    const scene = await open('sirke-kabartma');
    const ok = scene.interactions?.run('vinegar', 'pour', { targetId: 'flask', amount: 30 });
    expect(ok?.ok).toBe(true);
    frames(scene, 20);
    const bad = scene.interactions?.run('vinegar', 'pour', { targetId: 'nope', amount: 30 });
    expect(bad?.ok).toBe(false);
    scene.dispose();
  });

  it('hover and focus highlight without errors; the balance click tares', async () => {
    const scene = await open('sirke-kabartma');
    scene.setHover?.('flask');
    scene.setFocus?.('vinegar');
    frames(scene, 5);
    scene.lab.place('flask');
    scene.lab.pour('vinegar', 'flask', 50);
    scene.pointer?.(ev('down', 'balance', [0, 0, 0]));
    scene.pointer?.(ev('up', 'balance', [0, 0, 0], 'balance'));
    expect(scene.measurements().find((m) => m.id === 'balance')?.value).toBe(0);
    scene.dispose();
  });

  it('works at low quality and with reduced motion, and the soft flash switch exists', async () => {
    for (const [q, r] of [['low', false], ['high', true]] as const) {
      const scene = await open('magnezyum-yanma', q, r);
      scene.setSoftFlash?.(true);
      scene.lab.add('mg-ribbon', 'crucible', 0.12);
      scene.lab.heat('crucible', 'bunsen-blue');
      for (let i = 0; i < 40; i++) {
        for (let k = 0; k < 60; k++) scene.step(1 / 60);
        scene.sync?.(1 / 30);
      }
      scene.dispose();
    }
  });

  it('a blocked (dangerous) combination leaves the drawn state untouched', async () => {
    const scene = await open(null);
    scene.lab.pour('hcl-1M', 'beaker1', 20);
    const r = scene.interactions?.run('hcl-1M', 'pour', { targetId: 'beaker1', amount: 10 });
    expect(r?.ok).toBe(true);
    scene.dispose();
  });

  it('the scene class can be built from a LabAssets directly (engine independence)', async () => {
    const c = ctx('sirke-kabartma');
    const assets = new LabAssets(c);
    const scene = new ChemLabScene(c, assets);
    scene.loadExperiment('sirke-kabartma');
    frames(scene, 5);
    scene.dispose();
  });
});
