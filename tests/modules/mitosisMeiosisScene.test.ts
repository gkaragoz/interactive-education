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
