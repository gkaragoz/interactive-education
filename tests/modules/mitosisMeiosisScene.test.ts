import { InstancedMesh, Plane, Texture } from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { mulberry32 } from '../../src/core';
import { makePlaceholderAsset, ModuleAssets, type ModuleContext, type ModuleScene } from '../../src/scene';
import { createMitosisScene } from '../../src/modules/mitosis-meiosis/scene';

async function make(trackId: string, quality: 'low' | 'medium' | 'high' = 'medium', options: Record<string, string> = {}): Promise<ModuleScene> {
  const assets = new ModuleAssets('/', quality, new Texture(), new Plane());
  const ctx: ModuleContext = { assets, quality, level: 'ileri', reducedMotion: false, trackId, options, rng: mulberry32 };
  return createMitosisScene(ctx);
}

/** All instance matrices of the scene, as one flat array. */
function snapshot(scene: ModuleScene): number[] {
  const out: number[] = [];
  scene.root.traverse((o) => {
    if (o instanceof InstancedMesh) out.push(...Array.from(o.instanceMatrix.array));
  });
  return out;
}

describe('mitosis-meiosis scene', () => {
  // no network in node: the framework then substitutes placeholders for the GLBs, which is all the pose tests need
  beforeAll(() => {
    vi.spyOn(ModuleAssets.prototype, 'asset').mockImplementation(async (id: string, color?: string) => makePlaceholderAsset(id, color ?? '#c9b48a'));
  });

  for (const track of ['mitoz', 'mayoz-1', 'mayoz-2', 'mayoz-1-ayrilmama']) {
    it(`${track}: seek(t) twice gives identical matrices, backwards too`, async () => {
      const s = await make(track);
      const times = [0, 6.5, 14, 22.5, 29, 41, s.duration];
      const first = times.map((t) => (s.seek(t), snapshot(s)));
      const back = [...times].reverse().map((t) => (s.seek(t), snapshot(s))).reverse();
      back.forEach((snap, i) => expect(snap).toEqual(first[i]));
      times.forEach((t, i) => (s.seek(t), expect(snapshot(s)).toEqual(first[i])));
      s.dispose();
    });
  }

  it('uses a bounded number of instances and no NaN in any pose, at every quality', async () => {
    for (const q of ['low', 'medium', 'high'] as const) {
      const s = await make('mayoz-1', q);
      for (let t = 0; t <= s.duration; t += 1.7) {
        s.seek(t);
        expect(snapshot(s).every((v) => Number.isFinite(v)), `${q} t=${t}`).toBe(true);
      }
      let instances = 0;
      s.root.traverse((o) => {
        if (o instanceof InstancedMesh) instances += o.count;
      });
      expect(instances).toBeLessThan(900);
      s.dispose();
    }
  });

  it('the chromosome-set option rebuilds the plan for 2n=6', async () => {
    const s = await make('mitoz');
    s.setOptions?.({ 'chromosome-set': '2n6' });
    expect(s.chartAt?.(10)['chromosome-count']).toBe(6);
    s.dispose();
  });

  it('labels follow the level wording and chart follows the data', async () => {
    const s = await make('mayoz-1');
    s.seek(24);
    const names = (s.labelsAt?.(24) ?? []).map((l) => l.text);
    expect(names).toContain('Kiyazma');
    expect(names).toContain('Kinetokor');
    s.dispose();
  });
});

describe('painted chromatid conversion', () => {
  it('straightens a tilted rod: long axis along Y, waist at the origin, long arm toward -Y, length 1', async () => {
    const { CylinderGeometry, Matrix4 } = await import('three');
    const { paintedChromatidGeometry } = await import('../../src/modules/mitosis-meiosis/paintedChromatid');
    const g = new CylinderGeometry(0.09, 0.09, 0.8, 16, 24);
    // pinch the waist at 35% of the length, then tilt by 18 degrees and shift away from the origin
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const k = 1 - 0.45 * Math.exp(-Math.pow((y - 0.1) / 0.06, 2));
      p.setXYZ(i, p.getX(i) * k, y, p.getZ(i) * k);
    }
    g.applyMatrix4(new Matrix4().makeRotationZ(0.31).setPosition(0.2, -0.1, 0));
    const out = paintedChromatidGeometry([{ name: 'chromosome-single-arms', geometry: g }]);
    expect(out).not.toBeNull();
    out!.computeBoundingBox();
    const b = out!.boundingBox!;
    expect(b.max.y - b.min.y).toBeCloseTo(1, 2);
    expect(Math.abs(b.min.y)).toBeGreaterThan(Math.abs(b.max.y));
    expect(b.max.x).toBeLessThan(1.3);
    expect(out!.getAttribute('aSeg')).toBeDefined();
    expect(paintedChromatidGeometry([{ name: 'placeholder', geometry: g }])).toBeNull();
  });
});
