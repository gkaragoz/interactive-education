import { InstancedMesh, Plane, Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { genetics as info } from '../../src/data/modules/genetics';
import { createGeneticsScene } from '../../src/modules/genetics/scene';
import { TRACK_KIND, chartValues, crossFor, seriesOf, squareOf } from '../../src/modules/genetics/punnett';
import { ModuleAssets, seededRng, type ModuleContext, type ModuleScene } from '../../src/scene';

// No network in tests: every model request is a quick 404, so the framework substitutes its placeholders.
vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 404 })));
vi.setConfig({ testTimeout: 60_000 });

let opened = 0;
async function open(trackId: string, options: Record<string, string> = {}, level: 'temel' | 'ileri' = 'ileri', quality: 'low' | 'medium' | 'high' = 'medium'): Promise<ModuleScene> {
  const assets = new ModuleAssets(`/nowhere${opened++}/`, quality, new Texture(), new Plane(), () => undefined);
  const base = Object.fromEntries(info.options.map((o) => [o.id, o.defaultChoice]));
  const ctx: ModuleContext = { assets, quality, level, reducedMotion: false, trackId, options: { ...base, ...options }, rng: seededRng };
  return createGeneticsScene(ctx);
}

/** Every instance matrix and colour plus the pose of loose meshes: the "picture" at the current time. */
function snapshot(scene: ModuleScene): number[] {
  const out: number[] = [];
  scene.root.traverse((o) => {
    if (o instanceof InstancedMesh) {
      out.push(...Array.from(o.instanceMatrix.array as Float32Array));
      if (o.instanceColor) out.push(...Array.from(o.instanceColor.array as Float32Array));
    } else if (o.visible) out.push(...o.position.toArray(), ...o.scale.toArray());
    else out.push(0);
  });
  return out;
}

/** Position and size of every instance, flat in traversal order (for the "no pops" check). */
function placed(scene: ModuleScene): Float32Array {
  const out: number[] = [];
  scene.root.traverse((o) => {
    if (!(o instanceof InstancedMesh)) return;
    const a = o.instanceMatrix.array as Float32Array;
    for (let i = 0; i < o.count; i++) {
      const k = i * 16;
      out.push(a[k + 12] as number, a[k + 13] as number, a[k + 14] as number, Math.hypot(a[k] as number, a[k + 1] as number, a[k + 2] as number));
    }
  });
  return Float32Array.from(out);
}

describe.each(info.tracks.map((t) => [t.id, t.duration] as const))('genetics scene %s', (trackId, duration) => {
  it('matches the data duration and poses deterministically (seek out of order, backward scrub)', async () => {
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

  it('is identical across two builds and survives time outside the track', async () => {
    const a = await open(trackId);
    const b = await open(trackId);
    a.seek(duration * 0.5);
    b.seek(duration * 0.5);
    expect(snapshot(a)).toEqual(snapshot(b));
    a.seek(-3);
    b.seek(0);
    expect(snapshot(a)).toEqual(snapshot(b));
    a.seek(duration + 9);
    b.seek(duration);
    expect(snapshot(a)).toEqual(snapshot(b));
    a.dispose();
    b.dispose();
  });

  it('never pops: instances move and grow continuously between close frames (0.1 s steps)', async () => {
    const scene = await open(trackId);
    const dt = 0.1;
    const problems: string[] = [];
    let prev: Float32Array | null = null;
    for (let t = 0; t <= duration; t += dt) {
      scene.seek(t);
      const now = placed(scene);
      if (prev) {
        for (let k = 0; k < now.length; k += 4) {
          const a = prev[k + 3] as number;
          const b = now[k + 3] as number;
          const hi = Math.max(a, b);
          const lo = Math.min(a, b);
          // appearing or vanishing at full size is a pop; so is a sudden big change of size or a visible thing jumping
          if (lo < 0.05 && hi > 0.5) problems.push(`instance ${k / 4} appeared or vanished at t=${t.toFixed(2)}`);
          if (hi - lo > 1.6) problems.push(`instance ${k / 4} resized at t=${t.toFixed(2)}`);
          if (lo > 0.05 && Math.hypot((now[k] as number) - (prev[k] as number), (now[k + 1] as number) - (prev[k + 1] as number), (now[k + 2] as number) - (prev[k + 2] as number)) > 1.6) problems.push(`instance ${k / 4} jumped at t=${t.toFixed(2)}`);
        }
      }
      prev = now;
    }
    expect(problems.slice(0, 5)).toEqual([]);
    scene.dispose();
  });

  it('has a finite camera path, level-aware labels and a chart that matches the Punnett square', async () => {
    const scene = await open(trackId);
    const kind = TRACK_KIND[trackId]!;
    for (let t = 0; t <= duration; t += 1) {
      const cam = scene.cameraAt!(t);
      expect([...cam.position, ...cam.target].every(Number.isFinite)).toBe(true);
      const chart = scene.chartAt!(t);
      expect(Object.keys(chart).sort()).toEqual([...seriesOf(kind)].sort());
      for (const l of scene.labelsAt!(t)) expect(l.world.every(Number.isFinite)).toBe(true);
    }
    for (let t = 0; t <= duration; t += 0.25) expect(scene.labelsAt!(t).length, `labels at ${t}`).toBeLessThanOrEqual(6);
    const sq = squareOf(crossFor(trackId, {}));
    const fill = info.tracks.find((t) => t.id === trackId)!.phases.find((p) => p.id === 'punnett')!;
    const end = scene.chartAt!(fill.end);
    expect(end).toEqual(chartValues(kind, sq, fill.start, fill.end, fill.end));
    expect(scene.chartAt!(0)['dolu-kare']).toBe(0);
    scene.dispose();
  });
});

describe('genetics scene options and levels', () => {
  it('every option choice builds, moves and changes the chart consistently with its Punnett square', async () => {
    for (const option of info.options) {
      const trackId = info.tracks.find((t) => option.id === { monohibrit: 'cross-mono', dihibrit: 'cross-di', 'kan-gruplari': 'cross-blood', 'eseye-bagli': 'cross-sex' }[t.id])!.id;
      const kind = TRACK_KIND[trackId]!;
      const duration = info.tracks.find((t) => t.id === trackId)!.duration;
      const fill = info.tracks.find((t) => t.id === trackId)!.phases.find((p) => p.id === 'punnett')!;
      for (const choice of option.choices) {
        const scene = await open(trackId, { [option.id]: choice.id }, 'ileri', 'high');
        const sq = squareOf(crossFor(trackId, { [option.id]: choice.id }));
        for (const t of [0, fill.start + 1, fill.end - 0.1, duration]) {
          scene.seek(t);
          expect(snapshot(scene).every(Number.isFinite)).toBe(true);
        }
        expect(scene.chartAt!(duration)).toEqual(chartValues(kind, sq, fill.start, fill.end, duration));
        scene.dispose();
      }
    }
  });

  it('setOptions rebuilds the scene: same picture as a scene opened with that option, and the warning appears', async () => {
    const live = await open('monohibrit');
    live.seek(34);
    expect(live.labelsAt!(34).some((l) => l.anchorId === 'warn')).toBe(false);
    const before = snapshot(live);
    live.setOptions!({ 'cross-mono': 'Aa-aa' });
    const fresh = await open('monohibrit', { 'cross-mono': 'Aa-aa' });
    fresh.seek(34);
    expect(snapshot(live)).toEqual(snapshot(fresh));
    expect(snapshot(live)).not.toEqual(before);
    expect(live.labelsAt!(34).some((l) => l.anchorId === 'warn')).toBe(true);
    expect(live.chartAt!(40)).toEqual({ 'dolu-kare': 4, 'baskin-fenotip': 2, 'cekinik-fenotip': 2 });
    // back to the default: warning gone again
    live.setOptions!({ 'cross-mono': 'Aa-Aa' });
    expect(live.labelsAt!(34).some((l) => l.anchorId === 'warn')).toBe(false);
    live.dispose();
    fresh.dispose();
  });

  it('works at every quality and both levels; labels follow the level', async () => {
    for (const quality of ['low', 'medium', 'high'] as const) {
      const scene = await open('dihibrit', {}, 'ileri', quality);
      scene.seek(30);
      scene.dispose();
    }
    const temel = await open('monohibrit', {}, 'temel');
    const ileri = await open('monohibrit', {}, 'ileri');
    const a = temel.labelsAt!(2).map((l) => l.text);
    const b = ileri.labelsAt!(2).map((l) => l.text);
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toEqual(b);
    temel.dispose();
    ileri.dispose();
  });
});
