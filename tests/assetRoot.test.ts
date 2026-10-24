import { describe, expect, it } from 'vitest';
import { BoxGeometry } from 'three';
import { AssetRoot, type AssetRootBackend } from '../src/scene/assetRoot';
import type { OrganelleAsset } from '../src/scene/assetTypes';

const fakeAsset = (id: string): OrganelleAsset =>
  ({ id, lods: [[{ name: `${id}-glass`, geometry: new BoxGeometry(1, 1, 1), kind: 'gel' }], [{ name: `${id}-glass-low`, geometry: new BoxGeometry(1, 1, 1), kind: 'gel' }]], dispose: () => undefined }) as unknown as OrganelleAsset;

function make(lod = 0): { root: AssetRoot; fetched: string[]; streamed: string[] } {
  const fetched: string[] = [];
  const streamed: string[] = [];
  const backend = {
    fetch: async (id: string) => {
      fetched.push(id);
      return fakeAsset(id);
    },
    meta: (id: string) => ({ id, bboxMin: [0, 0, 0] }),
    isPlaceholder: (id: string) => id === 'missing',
    stream: async (id: string, matId: string) => void streamed.push(`${id}:${matId}`),
    instances: () => ({}) as never,
    materials: { get: (id: string, kind: string) => ({ id, kind }) } as never,
    lodIndex: () => lod,
  } as unknown as AssetRootBackend;
  return { root: new AssetRoot('lab', backend), fetched, streamed };
}

describe('AssetRoot (ctx.assets.withRoot)', () => {
  it('loads each asset once, keeps the raw meta and the placeholder flag, and streams textures under <dir>-<id>', async () => {
    const { root, fetched, streamed } = make();
    const a = await root.load('beaker100');
    await root.load('beaker100');
    expect(fetched).toEqual(['beaker100']);
    expect(a.meta).toMatchObject({ id: 'beaker100' });
    expect((await root.load('missing')).placeholder).toBe(true);
    expect(streamed).toContain('beaker100:lab-beaker100');
    expect(root.matId('beaker100')).toBe('lab-beaker100');
    expect(root.loadedNow('beaker100')).toBeDefined();
  });

  it('picks the LOD of the quality and builds meshes with the library material of the root', async () => {
    const low = make(1);
    expect((await low.root.load('x')).parts[0]?.name).toBe('x-glass-low');
    const hi = make(0);
    const group = await hi.root.loadGlb('x');
    expect(group.children).toHaveLength(1);
    expect((group.children[0] as unknown as { material: { id: string } }).material.id).toBe('lab-x');
  });
});
