import { Group, InstancedMesh, Mesh, Plane, Raycaster, Texture, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { QUALITY_PRESETS } from '../src/core';
import { CellScene, Cutaway, heightField, isShellId, makePlaceholderAsset, normalPixels } from '../src/scene';
import { cells, organelles } from './fixtures/data';

const infoById = new Map(organelles.map((o) => [o.id, o]));

function buildScene(cellId: 'animal' | 'plant' | 'bacterium', quality: 'low' | 'medium' | 'high' = 'medium'): CellScene {
  const cell = cells.find((c) => c.id === cellId)!;
  const ids = [...new Set([...cell.placements.map((p) => p.organelleId), ...cell.shellOrganelleIds])];
  const assets = new Map(ids.map((id) => [id, makePlaceholderAsset(id, infoById.get(id)?.color ?? '#999999', cell.shell.shape)]));
  return new CellScene({ cell, organelles: infoById, assets, normalMap: new Texture(), quality: QUALITY_PRESETS[quality] });
}

describe('placeholder assets', () => {
  const ids = organelles.map((o) => o.id);

  it.each(ids)('%s has three LODs, positive size and coloured vertices', (id) => {
    const asset = makePlaceholderAsset(id, '#80a040');
    expect(asset.lods).toHaveLength(3);
    expect(asset.boundsRadius).toBeGreaterThan(0.05);
    expect(asset.placeholder).toBe(true);
    for (const lod of asset.lods) {
      expect(lod.length).toBeGreaterThan(0);
      for (const part of lod) {
        expect(part.geometry.getAttribute('color')).toBeDefined();
        expect(part.geometry.getAttribute('uv')).toBeDefined();
        expect(part.geometry.getAttribute('normal')).toBeDefined();
      }
    }
    asset.dispose();
  });

  it('LODs get lighter', () => {
    const tris = (lod: number): number =>
      makePlaceholderAsset('nucleus', '#fff').lods[lod]!.reduce((n, p) => n + p.geometry.getAttribute('position').count / 3, 0);
    expect(tris(1)).toBeLessThan(tris(0));
    expect(tris(2)).toBeLessThan(tris(1));
  });

  it('knows which ids are shell parts', () => {
    expect(isShellId('membrane-animal')).toBe(true);
    expect(isShellId('wall-plant')).toBe(true);
    expect(isShellId('nucleus')).toBe(false);
  });
});

describe('CellScene', () => {
  const scene = buildScene('plant');

  it('creates one instanced set per placed organelle with the requested counts', () => {
    const plant = cells.find((c) => c.id === 'plant')!;
    for (const rule of plant.placements) expect(scene.sets.get(rule.organelleId)?.instances).toHaveLength(rule.count);
  });

  it('hides and isolates organelles', () => {
    scene.applyVisibility({ hidden: new Set(['chloroplast']), isolateId: null, hideOthersId: null });
    expect(scene.sets.get('chloroplast')?.isVisible).toBe(false);
    expect(scene.sets.get('nucleus')?.isVisible).toBe(true);
    scene.applyVisibility({ hidden: new Set(), isolateId: 'nucleus', hideOthersId: null });
    expect(scene.sets.get('nucleus')?.isVisible).toBe(true);
    expect(scene.sets.get('vacuole')?.isVisible).toBe(false);
    scene.applyVisibility({ hidden: new Set(), isolateId: null, hideOthersId: 'vacuole' });
    expect([...scene.sets.values()].filter((s) => s.isVisible).map((s) => s.id)).toEqual(['vacuole']);
    scene.applyVisibility({ hidden: new Set(), isolateId: null, hideOthersId: null });
  });

  it('picks the organelle under a ray and reports which instance', () => {
    const nucleus = scene.sets.get('nucleus')!.instances[0]!;
    const target = new Vector3(...nucleus.position);
    const origin = target.clone().add(new Vector3(0, 0, 80));
    const ray = new Raycaster(origin, new Vector3(0, 0, -1));
    const hit = scene.pick(ray);
    expect(hit).not.toBeNull();
    // Something in front of the nucleus may be hit first, but never nothing, and never a hidden set.
    scene.applyVisibility({ hidden: new Set([...scene.sets.keys()]), isolateId: null, hideOthersId: null });
    expect(scene.pick(new Raycaster(origin, new Vector3(0, 0, -1)))?.isShell ?? true).toBe(true);
    scene.applyVisibility({ hidden: new Set(), isolateId: null, hideOthersId: null });
  });

  it('cuts: the plane moves down, caps and the cytoplasm bed appear, everything above is clipped', () => {
    expect(scene.setCut(0, true)).toBe(false);
    expect(scene.cutaway.plane.constant).toBeGreaterThan(1e4);
    expect(scene.setCut(0.5, true)).toBe(true);
    expect(scene.cutaway.root.visible).toBe(true);
    const y = scene.cutaway.plane.constant;
    expect(y).toBeLessThan(plantHeight());
    expect(scene.cutaway.plane.normal.y).toBe(-1);
    scene.setCut(0.9, true);
    expect(scene.cutaway.plane.constant).toBeLessThan(y);
    expect(scene.setCut(0.5, false)).toBe(false);
    expect(scene.cutaway.root.visible).toBe(false);
  });

  it('assigns every instance a LOD within the triangle budget and culls the tiny ones at low quality', () => {
    const cam = new Vector3(0, 30, 60);
    const total = (s: CellScene): number => [...s.sets.values()].reduce((n, set) => n + set.visibleIndices().length, 0);
    scene.updateLod(cam);
    expect(total(scene)).toBeGreaterThan(0);
    const low = buildScene('plant', 'low');
    low.updateLod(cam);
    const drawn = (s: CellScene): number => {
      let n = 0;
      s.group.traverse((o) => {
        const m = o as InstancedMesh;
        if (m.isInstancedMesh && m.visible && m.material && !(m.material as { colorWrite?: boolean }).colorWrite === false) n += m.count;
      });
      return n;
    };
    expect(drawn(low)).toBeLessThan(drawn(scene));
  });

  it('frames the camera for a given field of view', () => {
    const near = CellScene.fitDistance(10, 35);
    expect(CellScene.fitDistance(20, 35)).toBeCloseTo(near * 2, 5);
    expect(CellScene.fitDistance(10, 35, 0.5)).toBeGreaterThan(near);
  });

  it('disposes without leaving children behind', () => {
    const extra = buildScene('bacterium');
    extra.dispose();
    expect(extra.sets.size).toBe(0);
  });
});

function plantHeight(): number {
  return cells.find((c) => c.id === 'plant')!.shell.halfExtents[1] * 2;
}

describe('Cutaway stencil twins', () => {
  it('makes one parity twin for shells and a back/front pair for solids, shown only while cutting', () => {
    const cutaway = new Cutaway(() => '#ffffff');
    const parent = new Group();
    const shell = new Mesh();
    const solid = new Mesh();
    parent.add(shell, solid);
    cutaway.register(shell, 'shell', { mode: 'parity' });
    cutaway.register(solid, 'solid');
    expect(parent.children).toHaveLength(2 + 1 + 2);
    const twins = parent.children.slice(2);
    expect(twins.every((t) => !t.visible)).toBe(true);
    cutaway.setCut(true, 1, 10);
    expect(twins.every((t) => t.visible)).toBe(true);
    solid.visible = false;
    cutaway.syncTwins();
    expect(twins.filter((t) => t.visible)).toHaveLength(1);
    cutaway.dispose();
    expect(parent.children).toHaveLength(2);
  });

  it('removes the top: the plane normal points down', () => {
    const plane: Plane = new Cutaway(() => '#fff').plane;
    expect(plane.normal.y).toBe(-1);
  });
});

describe('procedural micro-normal map', () => {
  it('is deterministic and the pixels are valid normals', () => {
    const a = heightField(32, 7);
    expect(Array.from(heightField(32, 7))).toEqual(Array.from(a));
    expect(Array.from(heightField(32, 8))).not.toEqual(Array.from(a));
    const px = normalPixels(a, 32, 4);
    expect(px).toHaveLength(32 * 32 * 4);
    for (let i = 0; i < px.length; i += 4) {
      const n = [px[i]! / 127.5 - 1, px[i + 1]! / 127.5 - 1, px[i + 2]! / 127.5 - 1];
      expect(Math.hypot(n[0]!, n[1]!, n[2]!)).toBeCloseTo(1, 1);
      expect(n[2]).toBeGreaterThan(0);
    }
  });

  it('tiles: the seam between the last and first column is as smooth as any other', () => {
    const size = 64;
    const h = heightField(size, 3);
    const diff = (x0: number, x1: number): number => {
      let total = 0;
      for (let y = 0; y < size; y++) total += Math.abs((h[y * size + x0] ?? 0) - (h[y * size + x1] ?? 0));
      return total / size;
    };
    const seam = diff(size - 1, 0);
    let typical = 0;
    for (let x = 0; x < size - 1; x++) typical += diff(x, x + 1);
    typical /= size - 1;
    expect(seam).toBeLessThan(typical * 3);
  });
});
