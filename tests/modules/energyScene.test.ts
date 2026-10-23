import { InstancedMesh, Plane, Texture, type Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { energy as info } from '../../src/data/modules/energy';
import type { LevelId } from '../../src/data/types';
import { createEnergyScene } from '../../src/modules/energy/scene';
import { ModuleAssets, seededRng, type ModuleContext, type ModuleScene } from '../../src/scene';

// No network in tests: every model request is a quick 404, so the framework substitutes its placeholders.
vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 404 })));
vi.setConfig({ testTimeout: 60_000 });

let opened = 0;
const DEFAULTS = Object.fromEntries(info.options.map((o) => [o.id, o.defaultChoice]));

async function open(trackId: string, level: LevelId, options: Record<string, string> = {}, quality: 'low' | 'medium' | 'high' = 'medium', reducedMotion = false): Promise<ModuleScene> {
  const assets = new ModuleAssets(`/nowhere${opened++}/`, quality, new Texture(), new Plane(), () => undefined);
  const ctx: ModuleContext = { assets, quality, level, reducedMotion, trackId, options: { ...DEFAULTS, ...options }, rng: seededRng };
  return createEnergyScene(ctx);
}

const isShown = (o: Object3D): boolean => {
  for (let n: Object3D | null = o; n; n = n.parent) if (!n.visible) return false;
  return true;
};

/** Matrices of every instance of every visible instanced mesh, keyed by mesh order and index. */
function snapshot(scene: ModuleScene): Map<string, number[]> {
  const out = new Map<string, number[]>();
  let m = 0;
  scene.root.traverse((o) => {
    if (!(o instanceof InstancedMesh)) return;
    const id = m++;
    if (!isShown(o)) return;
    const a = o.instanceMatrix.array as Float32Array;
    for (let i = 0; i < o.count; i++) out.set(`${id}:${i}`, Array.from(a.subarray(i * 16, i * 16 + 16)));
  });
  return out;
}

const same = (a: Map<string, number[]>, b: Map<string, number[]>): boolean => a.size === b.size && [...a].every(([k, v]) => b.get(k)?.every((x, i) => x === v[i]));
const cases = info.tracks.flatMap((t) => t.levels.map((l) => [t.id, l, t.duration] as const));

describe.each(cases)('energy scene %s (%s)', (trackId, level, duration) => {
  it('matches the data duration and poses deterministically, also when scrubbing backwards', async () => {
    const scene = await open(trackId, level);
    expect(scene.duration).toBe(duration);
    const times = [0, duration * 0.13, duration * 0.31, duration * 0.52, duration * 0.77, duration];
    const first = times.map((t) => (scene.seek(t), snapshot(scene)));
    [...times].reverse().forEach((t, i) => {
      scene.seek(t);
      expect(same(snapshot(scene), first[times.length - 1 - i]!), `t=${t}`).toBe(true);
    });
    scene.dispose();
  });

  it('builds the same picture twice and reports finite matrices', async () => {
    const a = await open(trackId, level);
    const b = await open(trackId, level);
    for (const t of [duration * 0.4, duration * 0.9]) {
      a.seek(t);
      b.seek(t);
      expect(same(snapshot(a), snapshot(b))).toBe(true);
      expect(a.chartAt!(t)).toEqual(b.chartAt!(t));
      for (const v of snapshot(a).values()) expect(v.every(Number.isFinite)).toBe(true);
    }
    a.dispose();
    b.dispose();
  });

  it('has no pops: instances move smoothly between neighbouring times (away from the cuts between stations)', async () => {
    const scene = await open(trackId, level);
    const step = 0.05;
    let prev: Map<string, number[]> | null = null;
    let worst = 0;
    let where = '';
    for (let t = 0; t <= duration; t += step) {
      scene.seek(t);
      const cur = snapshot(scene);
      if (prev && prev.size === cur.size) {
        for (const [k, v] of cur) {
          const p = prev.get(k)!;
          // an instance that is hidden (scale 0) or still growing in has no visible position yet
          if (Math.hypot(v[0]!, v[1]!, v[2]!) < 0.06 || Math.hypot(p[0]!, p[1]!, p[2]!) < 0.06) continue;
          for (let i = 0; i < 16; i++) {
            const d = Math.abs(v[i]! - p[i]!);
            if (d > worst) {
              worst = d;
              where = `t=${t.toFixed(2)} instance ${k} element ${i}`;
            }
          }
        }
      }
      prev = cur;
    }
    // a molecule moves a few units per second; a pop would be a jump of the whole size at once
    expect(worst, where).toBeLessThan(3.2);
    scene.dispose();
  });

  it('gives labels, a camera path and chart values for every time', async () => {
    const scene = await open(trackId, level);
    let labelled = 0;
    for (let t = 0; t <= duration; t += 1) {
      const cam = scene.cameraAt!(t);
      expect([...cam.position, ...cam.target].every(Number.isFinite)).toBe(true);
      for (const l of scene.labelsAt!(t)) {
        expect(l.text.length).toBeGreaterThan(0);
        expect(l.world.every(Number.isFinite)).toBe(true);
        labelled++;
      }
      expect(Object.keys(scene.chartAt!(t)).length).toBeGreaterThan(0);
    }
    expect(labelled).toBeGreaterThan(duration * 0.8);
    scene.dispose();
  });

  it('stays within an instance budget at every quality', async () => {
    for (const q of ['low', 'medium', 'high'] as const) {
      const scene = await open(trackId, level, {}, q);
      let instances = 0;
      let meshes = 0;
      scene.root.traverse((o) => {
        if (o instanceof InstancedMesh) {
          instances += o.count;
          meshes++;
        }
      });
      expect(instances).toBeLessThan(2400);
      expect(meshes).toBeLessThan(90);
      scene.dispose();
    }
  });
});

describe('energy options', () => {
  it('setOptions rebuilds the amounts without changing the duration', async () => {
    const scene = await open('fotosentez', 'ileri');
    const before = scene.chartAt!(59)['o2-miktari'];
    scene.setOptions?.({ ...DEFAULTS, 'light-intensity': 'low' });
    scene.seek(30);
    expect(scene.chartAt!(59)['o2-miktari']).toBeCloseTo(50, 1);
    expect(before).toBeCloseTo(100, 1);
    expect(scene.duration).toBe(60);
    scene.setOptions?.({ ...DEFAULTS });
    scene.seek(30);
    expect(scene.chartAt!(59)['o2-miktari']).toBeCloseTo(100, 1);
    scene.dispose();
  });

  it('reduced motion stops the shimmer and decorative spin: resting parts keep one pose, while normal playback shimmers', async () => {
    const calm = await open('fotosentez', 'ileri', {}, 'medium', true);
    const live = await open('fotosentez', 'ileri', {}, 'medium', false);
    const moved = (scene: ModuleScene): number => {
      scene.seek(30);
      const a = snapshot(scene);
      scene.seek(30.6);
      const b = snapshot(scene);
      // resting trips (the membrane proteins and rubisco) have constant paths: count instances that changed at all
      let changed = 0;
      for (const [k, v] of a) {
        const w = b.get(k);
        if (w && v.some((x, i) => Math.abs(x - w[i]!) > 1e-6)) changed++;
      }
      return changed;
    };
    expect(moved(calm)).toBeLessThan(moved(live));
    calm.dispose();
    live.dispose();
  });
});
