import { InstancedMesh, Plane, Texture, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { muscle as info } from '../../src/data/modules/muscle';
import { ModuleAssets, seededRng, type ModuleContext, type ModuleScene } from '../../src/scene';
import { sarcAt } from '../../src/modules/muscle/sarcModel';
import { createMuscleScene } from '../../src/modules/muscle/scene';

// The muscle scenes build every part procedurally, so no model request is ever made; stub fetch anyway.
vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 404 })));
vi.setConfig({ testTimeout: 30_000 });

let opened = 0;
async function open(trackId: string, level: 'temel' | 'ileri' = 'ileri', quality: 'low' | 'medium' | 'high' = 'medium'): Promise<ModuleScene> {
  const assets = new ModuleAssets(`/nowhere${opened++}/`, quality, new Texture(), new Plane(), () => undefined);
  const ctx: ModuleContext = { assets, quality, level, reducedMotion: false, trackId, options: {}, rng: seededRng };
  return createMuscleScene(ctx);
}

/** Every pose-carrying number of the scene: instance matrices and colours plus the transform of loose objects. */
function snapshot(scene: ModuleScene): number[] {
  const out: number[] = [];
  scene.root.updateMatrixWorld(true);
  scene.root.traverse((o) => {
    if (o instanceof InstancedMesh) {
      out.push(...Array.from(o.instanceMatrix.array as Float32Array));
      if (o.instanceColor) out.push(...Array.from(o.instanceColor.array as Float32Array));
    } else out.push(...o.position.toArray(), o.quaternion.x, o.quaternion.y, o.quaternion.z, ...o.scale.toArray(), o.visible ? 1 : 0);
  });
  return out;
}

const CASES = info.tracks.flatMap((t) => (['temel', 'ileri'] as const).map((level) => [t.id, level, t.duration] as const));

describe.each(CASES)('muscle scene %s (%s)', (trackId, level, duration) => {
  it('matches the data duration and poses deterministically (seek twice, out of order, backwards)', async () => {
    const scene = await open(trackId, level);
    expect(scene.duration).toBe(duration);
    const ts = [0, duration * 0.17, duration * 0.31, duration * 0.62, duration * 0.9, duration];
    const first = ts.map((t) => (scene.seek(t), snapshot(scene)));
    [...ts].reverse().forEach((t, i) => {
      scene.seek(t);
      const again = snapshot(scene);
      const ref = first[ts.length - 1 - i]!;
      expect(again.length).toBe(ref.length);
      expect(again.every((v, k) => v === ref[k])).toBe(true);
    });
    expect(snapshot(scene).every((v) => Number.isFinite(v))).toBe(true);
    scene.dispose();
  });

  it('is identical across two builds', async () => {
    const a = await open(trackId, level);
    const b = await open(trackId, level);
    a.seek(duration * 0.43);
    b.seek(duration * 0.43);
    expect(snapshot(a)).toEqual(snapshot(b));
    a.dispose();
    b.dispose();
  });

  it('has no pops: the pose changes only a little between close times, also at phase edges', async () => {
    const scene = await open(trackId, level);
    const edges = Array.from(new Set(info.tracks.find((t) => t.id === trackId)!.phases.flatMap((p) => [p.start, p.end]))).filter((t) => t > 0.05 && t < duration - 0.05);
    for (const edge of edges) {
      scene.seek(edge - 0.01);
      const before = snapshot(scene);
      scene.seek(edge + 0.01);
      const after = snapshot(scene);
      let worst = 0;
      before.forEach((v, i) => (worst = Math.max(worst, Math.abs(v - after[i]!))));
      // a 20 ms step may move things by a fraction of a unit but never teleport them (the zoom scales are the largest movers)
      expect(worst, `edge ${edge}`).toBeLessThan(trackId === 'kasilma' && level === 'ileri' ? 1.2 : 0.25);
    }
    scene.dispose();
  });

  it('gives chart values for series of the data, finite', async () => {
    const scene = await open(trackId, level);
    const ids = new Set(info.charts.map((c) => c.id));
    for (let t = 0; t <= duration; t += duration / 40) {
      const v = scene.chartAt!(t);
      for (const [k, x] of Object.entries(v)) {
        expect(ids.has(k), k).toBe(true);
        expect(Number.isFinite(x)).toBe(true);
      }
    }
    scene.dispose();
  });

  it('has finite labels with unique anchors and a camera path that moves smoothly', async () => {
    const scene = await open(trackId, level);
    let prev: Vector3 | null = null;
    for (let t = 0; t <= duration; t += 0.25) {
      const labels = scene.labelsAt!(t);
      expect(labels.length).toBeLessThanOrEqual(6);
      const anchors = new Set(labels.map((l) => l.anchorId));
      expect(anchors.size).toBe(labels.length);
      for (const l of labels) {
        expect(l.text.length).toBeGreaterThan(0);
        expect(l.world.every((x) => Number.isFinite(x))).toBe(true);
      }
      const cam = scene.cameraAt!(t);
      const p = new Vector3(...cam.position);
      if (prev) expect(p.distanceTo(prev)).toBeLessThan(1.5);
      prev = p;
    }
    scene.dispose();
  });

  it('uses a bounded number of instances and no NaN at every quality', async () => {
    for (const q of ['low', 'medium', 'high'] as const) {
      const s = await open(trackId, level, q);
      for (let t = 0; t <= duration; t += duration / 17) {
        s.seek(t);
        expect(snapshot(s).every((v) => Number.isFinite(v)), `${q} t=${t}`).toBe(true);
      }
      let instances = 0;
      s.root.traverse((o) => {
        if (o instanceof InstancedMesh) instances += o.count;
      });
      expect(instances).toBeLessThan(2400);
      s.dispose();
    }
  });
});

describe('muscle scene content', () => {
  it('kasilma at ileri level lists the band labels with the live lengths of the model', async () => {
    const scene = await open('kasilma');
    for (const t of [12, 20, 26]) {
      const s = sarcAt(t);
      const texts = scene.labelsAt!(t).map((l) => l.text);
      const fmt = (v: number): string => v.toFixed(1).replace('.', ',');
      expect(texts).toContain(`A bandı · ${fmt(s.A)}`);
      expect(texts).toContain(`I bandı · ${fmt(s.I)}`);
      expect(texts).toContain(`H bandı · ${fmt(s.H)}`);
      expect(texts).toContain(`Sarkomer · ${fmt(s.L)}`);
    }
    expect(scene.labelsAt!(16).map((l) => l.text)).toContain('Z çizgisi');
    scene.dispose();
  });

  it('never shows more than six labels, in any track, level or time', async () => {
    for (const [id, level, dur] of CASES) {
      const scene = await open(id, level);
      for (let t = 0; t <= dur; t += 0.2) expect(scene.labelsAt!(t).length, `${id} ${level} t=${t}`).toBeLessThanOrEqual(6);
      scene.dispose();
    }
  });

  it('has no camera sway under reduced motion', async () => {
    const assets = new ModuleAssets(`/nowhere${opened++}/`, 'medium', new Texture(), new Plane(), () => undefined);
    const ctx: ModuleContext = { assets, quality: 'medium', level: 'ileri', reducedMotion: true, trackId: 'kasilma', options: {}, rng: seededRng };
    const scene = await createMuscleScene(ctx);
    expect(scene.cameraAt!(14.2).position[0]).toBe(0);
    expect(scene.cameraAt!(20.9).position[0]).toBe(0);
    scene.dispose();
  });

  it('kasilma names every zoom level on the way in (arm to sarcomere)', async () => {
    const scene = await open('kasilma');
    const seen = new Set<string>();
    for (let t = 0; t <= 10; t += 0.1) scene.labelsAt!(t).forEach((l) => seen.add(l.text));
    for (const name of ['Biseps (iskelet kası)', 'Kas (biseps)', 'Kas demeti (fasikül)', 'Kas lifi (hücre)', 'Miyofibril', 'Sarkomer', 'Z çizgisi']) expect([...seen]).toContain(name);
    scene.dispose();
  });

  it('only labels calcium and ATP as extra information', async () => {
    const scene = await open('kasilma');
    for (let t = 0; t <= 40; t += 0.5) {
      for (const l of scene.labelsAt!(t)) if (/Ca|ATP/.test(l.text)) expect(l.text.startsWith('Ek bilgi')).toBe(true);
    }
    scene.dispose();
  });

  it('eklem-hareketi labels follow the muscle state in Turkish', async () => {
    const scene = await open('eklem-hareketi');
    const at = (t: number): string[] => scene.labelsAt!(t).map((l) => l.text);
    expect(at(1).some((x) => x.startsWith('Biseps') && x.includes('gevşek'))).toBe(true);
    expect(at(9).some((x) => x.startsWith('Biseps') && x.includes('kasılıyor'))).toBe(true);
    expect(at(9).some((x) => x.startsWith('Triseps') && x.includes('gevşek'))).toBe(true);
    expect(at(26).some((x) => x.startsWith('Triseps') && x.includes('kasıl'))).toBe(true);
    expect(at(26).some((x) => x.startsWith('Biseps') && x.includes('gevşek'))).toBe(true);
    scene.dispose();
  });

  it('rejects an unknown track', async () => {
    await expect(open('yok')).rejects.toThrow();
  });

  it('keeps no state between seeks (a pose depends on t only)', async () => {
    const scene = await open('eklem-hareketi');
    scene.seek(12);
    const a = snapshot(scene);
    for (let i = 0; i < 50; i++) scene.seek((i * 7.3) % 36);
    scene.seek(12);
    expect(snapshot(scene)).toEqual(a);
    scene.dispose();
  });
});
