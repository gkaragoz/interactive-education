// @vitest-environment jsdom
import { DataTexture, Texture } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Catalog, QUALITY_PRESETS } from '../src/core';
import { CellScene, makePlaceholderAsset } from '../src/scene';
import type { AssetMeta } from '../src/scene/assetTypes';
import { MaterialLibrary } from '../src/scene/materials';
import { pickTier, TextureStore, tiersOf, type TextureBackend } from '../src/scene/textureStore';
import { TextureStreamer } from '../src/scene/textureStreamer';
import { createLoadingScreen, loadingTips, overallProgress } from '../src/ui/loadingScreen';
import { bundle, cells, organelles } from './fixtures/data';

const meta = (tiers: Record<string, { bytes: number; maps: { name: string; bytes?: number }[] }>): AssetMeta => ({
  id: 'x',
  boundsRadius: 1,
  bboxMin: [-1, -1, -1],
  bboxMax: [1, 1, 1],
  textures: { tiers: Object.fromEntries(Object.entries(tiers).map(([k, v]) => [k, { ...v, size: 1024 }])) },
});
const CLAY = ['clay_albedo.ktx2', 'clay_normal.ktx2', 'clay_orm.ktx2'].map((name) => ({ name, bytes: 1 }));
const FULL = meta({ low: { bytes: 100, maps: CLAY }, medium: { bytes: 400, maps: CLAY }, high: { bytes: 1600, maps: CLAY } });

/** Plain textures in place of KTX2 files; records what was asked for. */
function mockBackend(fail: (url: string) => boolean = () => false): TextureBackend & { urls: string[]; made: Texture[] } {
  const urls: string[] = [];
  const made: Texture[] = [];
  return {
    urls,
    made,
    load: async (url) => {
      urls.push(url);
      if (fail(url)) throw new Error('missing');
      const t = new DataTexture(new Uint8Array(4), 1, 1);
      made.push(t);
      return t;
    },
  };
}

describe('texture tiers', () => {
  it('picks the best tier that does not exceed the target, and falls back to what exists', () => {
    expect(pickTier(FULL, 'high')).toBe('high');
    expect(pickTier(FULL, 'medium')).toBe('medium');
    expect(pickTier(FULL, 'low')).toBe('low');
    const onlyMedium = meta({ medium: { bytes: 1, maps: CLAY } });
    expect(pickTier(onlyMedium, 'low')).toBe('medium');
    expect(pickTier(onlyMedium, 'high')).toBe('medium');
    expect(pickTier(null, 'high')).toBeNull();
    expect(pickTier({ ...FULL, textures: undefined }, 'high')).toBeNull();
    expect(tiersOf(FULL)).toEqual(['low', 'medium', 'high']);
  });
});

describe('TextureStore', () => {
  it('loads each map once, shares the result and counts the bytes', async () => {
    const backend = mockBackend();
    const store = new TextureStore('./', backend);
    const [a, b] = await Promise.all([store.load('nucleus', FULL, 'low'), store.load('nucleus', FULL, 'low')]);
    expect(a).toBe(b);
    expect(backend.urls).toHaveLength(3);
    expect(backend.urls[0]).toBe('./textures/nucleus/low/clay_albedo.ktx2');
    expect(a?.clay?.albedo).not.toBeNull();
    expect(a?.gel).toBeNull();
    expect(store.estimatedBytes).toBeGreaterThan(100);
  });

  it('asks for the gel maps only when the tier lists them', async () => {
    const backend = mockBackend();
    const store = new TextureStore('./', backend);
    const both = meta({ low: { bytes: 10, maps: [...CLAY, ...['gel_albedo.ktx2', 'gel_normal.ktx2', 'gel_orm.ktx2'].map((name) => ({ name, bytes: 1 }))] } });
    const t = await store.load('vacuole', both, 'low');
    expect(backend.urls).toHaveLength(6);
    expect(t?.gel?.albedo).not.toBeNull();
  });

  it('survives one missing map and returns null when everything is missing', async () => {
    const store = new TextureStore('./', mockBackend((u) => u.endsWith('clay_normal.ktx2')));
    const t = await store.load('a', FULL, 'low');
    expect(t?.clay?.normal).toBeNull();
    expect(t?.clay?.albedo).not.toBeNull();
    const none = new TextureStore('./', mockBackend(() => true));
    expect(await none.load('a', FULL, 'low')).toBeNull();
  });

  it('is inert without a backend (no KTX2): vertex colours stay', async () => {
    const store = new TextureStore('./', null);
    expect(store.enabled).toBe(false);
    expect(await store.load('a', FULL, 'low')).toBeNull();
  });

  it('releases and evicts: disposed textures, no leftovers', async () => {
    const backend = mockBackend();
    const store = new TextureStore('./', backend);
    await store.load('a', FULL, 'low');
    await store.load('b', FULL, 'low');
    const spies = backend.made.map((t) => vi.spyOn(t, 'dispose'));
    store.retainOnly(new Set(['a']));
    expect(store.get('b', 'low')).toBeUndefined();
    expect(store.get('a', 'low')).toBeDefined();
    expect(spies.filter((s) => s.mock.calls.length > 0)).toHaveLength(3);
    store.dispose();
    expect(store.estimatedBytes).toBe(0);
  });
});

describe('materials with painted textures', () => {
  it('switches vertex colours off for an albedo map, wires the ORM channels and can go back', () => {
    const lib = new MaterialLibrary(new Texture(), new (class extends Object {})() as never);
    const mat = lib.get('nucleus', 'clay');
    expect(mat.vertexColors).toBe(true);
    const maps = { albedo: new Texture(), normal: new Texture(), orm: new Texture() };
    lib.applyMaps('nucleus', 'clay', maps, false);
    expect(mat.map).toBe(maps.albedo);
    expect(mat.vertexColors).toBe(false);
    expect(mat.normalMap).toBe(maps.normal);
    expect(mat.normalScale.y).toBe(-1); // no tangents in the GLBs
    expect(mat.aoMap).toBe(maps.orm);
    expect(mat.roughnessMap).toBe(maps.orm);
    expect(mat.metalnessMap).toBe(maps.orm);
    lib.applyMaps('nucleus', 'clay', null, false);
    expect(mat.map).toBeNull();
    expect(mat.vertexColors).toBe(true);
  });

  it('fades newly textured materials in and reports when it is done', () => {
    const lib = new MaterialLibrary(new Texture(), new (class extends Object {})() as never);
    lib.get('nucleus', 'clay');
    lib.applyMaps('nucleus', 'clay', { albedo: new Texture(), normal: null, orm: null }, true);
    expect(lib.tickFade(0.1)).toBe(true);
    expect(lib.tickFade(1)).toBe(false);
  });
});

describe('TextureStreamer', () => {
  const info = new Map(organelles.map((o) => [o.id, o]));
  const scene = (): CellScene => {
    const cell = cells.find((c) => c.id === 'animal')!;
    const ids = [...new Set([...cell.placements.map((p) => p.organelleId), ...cell.shellOrganelleIds])];
    const assets = new Map(ids.map((id) => [id, makePlaceholderAsset(id, info.get(id)?.color ?? '#999999', cell.shell.shape)]));
    return new CellScene({ cell, organelles: info, assets, normalMap: new Texture(), quality: QUALITY_PRESETS.medium });
  };

  it('primes the lowest tier, streams the target tier in, and downgrades when the quality drops', async () => {
    const backend = mockBackend();
    const store = new TextureStore('./', backend);
    const s = scene();
    let target: 'low' | 'medium' | 'high' = 'high';
    const streamer = new TextureStreamer(store, { scenes: () => [s], metaOf: () => FULL, targetTier: () => target, selectedId: () => 'nucleus', invalidate: () => undefined }, true);
    const progress: number[] = [];
    await streamer.prime(['nucleus', 'mitochondrion'], (f) => progress.push(f));
    expect(progress.at(-1)).toBe(1);
    expect(store.get('nucleus', 'low')).toBeDefined();
    expect(s.materials.get('nucleus', 'clay').map).not.toBeNull();
    expect(backend.urls.every((u) => u.includes('/low/'))).toBe(true);

    await streamer.stream();
    expect(store.get('nucleus', 'high')).toBeDefined();
    expect(store.get('nucleus', 'low')).toBeUndefined(); // the low tier was released after the swap
    const first = backend.urls.findIndex((u) => u.includes('/high/'));
    expect(backend.urls[first]).toContain('/nucleus/'); // the selected organelle streams first

    target = 'low';
    await streamer.stream();
    expect(store.get('nucleus', 'low')).toBeDefined();
    expect(store.get('nucleus', 'high')).toBeUndefined();
  });

  it('a scene built later gets the known textures at once, and unused textures are evicted', async () => {
    const store = new TextureStore('./', mockBackend());
    const first = scene();
    const live = [first];
    const streamer = new TextureStreamer(store, { scenes: () => live, metaOf: () => FULL, targetTier: () => 'low', selectedId: () => null, invalidate: () => undefined }, true);
    await streamer.prime(['nucleus'], undefined);
    const second = scene();
    streamer.applyKnown(second);
    expect(second.materials.get('nucleus', 'clay').map).not.toBeNull();
    live.length = 0;
    streamer.retain();
    expect(store.get('nucleus', 'low')).toBeUndefined();
  });
});

describe('loading screen', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('only appears when loading is slow, shows phases and byte progress, and hides when done', () => {
    const screen = createLoadingScreen(true);
    screen.setTips(['Bir ipucu']);
    screen.setProgress({ phase: 'models', fraction: 0.5 });
    expect(screen.el.hidden).toBe(true); // cached visits never flash it
    vi.advanceTimersByTime(350);
    expect(screen.el.hidden).toBe(false);
    expect(screen.el.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('30');
    expect(screen.el.textContent).toContain('Biliyor muydun?');
    expect(screen.el.textContent).toContain('Bir ipucu');
    expect(screen.el.querySelector('li.now')?.textContent).toBe('Modeller');
    screen.setProgress({ phase: 'textures', fraction: 0.5 });
    expect(screen.el.querySelector('li.now')?.textContent).toBe('Dokular');
    expect(screen.el.querySelector('li.done')?.textContent).toBe('Modeller');
    screen.setProgress(null);
    expect(screen.el.hidden).toBe(true);
  });

  it('a fast load never shows it', () => {
    const screen = createLoadingScreen(true);
    screen.setProgress({ phase: 'models', fraction: 0.2 });
    screen.setProgress(null);
    vi.advanceTimersByTime(1000);
    expect(screen.el.hidden).toBe(true);
  });

  it('progress only moves forward through the phases', () => {
    const steps = [
      { phase: 'models', fraction: 0 }, { phase: 'models', fraction: 1 }, { phase: 'textures', fraction: 0 },
      { phase: 'textures', fraction: 1 }, { phase: 'scene', fraction: 0.5 }, { phase: 'scene', fraction: 1 },
    ] as const;
    const values = steps.map((s) => overallProgress({ ...s }));
    expect([...values].sort((a, b) => a - b)).toEqual(values);
    expect(values.at(-1)).toBe(1);
  });

  it('tips come from the data only: taglines at Temel, fun facts at İleri, at most twelve', () => {
    const catalog = new Catalog(bundle);
    const temel = loadingTips(catalog, { level: 'temel', cellId: 'animal' });
    expect(temel.length).toBeGreaterThan(0);
    expect(temel.length).toBeLessThanOrEqual(12);
    for (const tip of temel) expect(organelles.some((o) => tip.includes(o.tagline))).toBe(true);
    const ileri = loadingTips(catalog, { level: 'ileri', cellId: 'animal' });
    for (const tip of ileri) expect(organelles.some((o) => o.funFact === tip)).toBe(true);
  });
});

describe('texture memory budget', () => {
  it('steps low-priority assets down when the planned memory exceeds the budget', async () => {
    const { GPU_BUDGET } = await import('../src/scene/textureStreamer');
    const big = (size: number): AssetMeta => ({
      ...FULL,
      textures: { tiers: { low: { bytes: 1, size: 1024, maps: CLAY.map((m) => ({ ...m, size: 1024 })) }, high: { bytes: 1, size, maps: CLAY.map((m) => ({ ...m, size })) } } },
    });
    // Each asset's high tier takes 2/7 of the budget: three keep it, the rest step down and still fit as low.
    const metaOf = big(Math.round(Math.sqrt(GPU_BUDGET / 1.33 / 3 / 3.5)));
    const backend = mockBackend();
    const store = new TextureStore('./', backend);
    const info = new Map(organelles.map((o) => [o.id, o]));
    const cell = cells.find((c) => c.id === 'animal')!;
    const s = new CellScene({ cell, organelles: info, assets: new Map([...cell.placements.map((p) => p.organelleId), ...cell.shellOrganelleIds].map((id) => [id, makePlaceholderAsset(id, '#999', cell.shell.shape)])), normalMap: new Texture(), quality: QUALITY_PRESETS.high });
    const streamer = new TextureStreamer(store, { scenes: () => [s], metaOf: () => metaOf, targetTier: () => 'high', selectedId: () => null, invalidate: () => undefined }, true);
    await streamer.stream();
    const high = [...s.textureIds()].filter((id) => store.get(id, 'high')).length;
    const low = [...s.textureIds()].filter((id) => store.get(id, 'low')).length;
    expect(high).toBeGreaterThan(0);
    expect(low).toBeGreaterThan(0); // the budget forced the tail down to low
    expect(store.estimatedBytes).toBeLessThanOrEqual(GPU_BUDGET * 1.05);
  });
});

describe('texture lifetime (the cell-switch leak)', () => {
  const info = new Map(organelles.map((o) => [o.id, o]));
  const scene = (id: 'animal' | 'bacterium' = 'animal'): CellScene => {
    const cell = cells.find((c) => c.id === id)!;
    const ids = [...new Set([...cell.placements.map((p) => p.organelleId), ...cell.shellOrganelleIds])];
    const assets = new Map(ids.map((id) => [id, makePlaceholderAsset(id, info.get(id)?.color ?? '#999999', cell.shell.shape)]));
    return new CellScene({ cell, organelles: info, assets, normalMap: new Texture(), quality: QUALITY_PRESETS.medium });
  };

  it('never disposes a texture that a scene still draws (a scene fading out counts as live)', async () => {
    const backend = mockBackend();
    const store = new TextureStore('./', backend);
    const leaving = scene();
    const live: CellScene[] = [leaving];
    const streamer = new TextureStreamer(store, { scenes: () => live, metaOf: () => FULL, targetTier: () => 'low', selectedId: () => null, invalidate: () => undefined }, true);
    await streamer.prime(['nucleus', 'mitochondrion']);
    const disposed: Texture[] = [];
    for (const t of backend.made) t.addEventListener('dispose', () => disposed.push(t));
    // The next cell is on screen, the old one still fades: retaining must keep the old scene's textures.
    live.unshift(scene('bacterium'));
    streamer.retain();
    expect(disposed).toHaveLength(0);
    // The fade is over and the old scene is gone: only now do its textures go, and exactly once.
    live.pop();
    streamer.retain();
    expect(disposed.length).toBeGreaterThan(0);
    const unique = new Set(disposed);
    expect(unique.size).toBe(disposed.length);
    expect(store.estimatedBytes).toBe(0);
  });

  it('frees the CPU copy of a texture after the GPU has it (the KTX2 backend sets onUpdate) and reloads after a context loss', async () => {
    const backend = mockBackend();
    const store = new TextureStore('./', backend);
    const s = scene();
    const streamer = new TextureStreamer(store, { scenes: () => [s], metaOf: () => FULL, targetTier: () => 'low', selectedId: () => null, invalidate: () => undefined }, true);
    await streamer.prime(['nucleus']);
    const before = backend.urls.length;
    await streamer.reload();
    expect(backend.urls.length).toBeGreaterThan(before); // fetched again
    expect(s.materials.get('nucleus', 'clay').map).not.toBeNull(); // and put back on the materials
  });
});
