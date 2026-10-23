import { InstancedMesh, Plane, Texture, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { membraneTransport as info } from '../../src/data/modules/membrane-transport';
import { CHART_TABLE } from '../../src/data/modules/membrane-transport.charts';
import { ModuleAssets, seededRng, type ModuleContext, type ModuleScene } from '../../src/scene';

// No network in tests: every model request is a quick 404, so the framework substitutes its placeholders.
vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 404 })));
import { atpUsed } from '../../src/modules/membrane-transport/tracks/active';
import { cargoInside } from '../../src/modules/membrane-transport/tracks/endo';
import { createMembraneScene } from '../../src/modules/membrane-transport/scene';

let opened = 0;

/** A unique base URL per scene: the loader keeps a global table of pending URLs, and a failed one must not be shared. */
async function open(trackId: string, options: Record<string, string> = {}, level: 'temel' | 'ileri' = 'ileri', quality: 'low' | 'medium' | 'high' = 'medium'): Promise<ModuleScene> {
  const assets = new ModuleAssets(`/nowhere${opened++}/`, quality, new Texture(), new Plane(), () => undefined);
  const base = Object.fromEntries(info.options.map((o) => [o.id, o.defaultChoice]));
  const ctx: ModuleContext = { assets, quality, level, reducedMotion: false, trackId, options: { ...base, ...options }, rng: seededRng };
  return createMembraneScene(ctx);
}

/** Every instance matrix of the scene plus the pose of loose objects: the "picture" at the current time. */
function snapshot(scene: ModuleScene): number[] {
  const out: number[] = [];
  scene.root.traverse((o) => {
    if (o instanceof InstancedMesh) {
      out.push(...Array.from(o.instanceMatrix.array as Float32Array));
      if (o.instanceColor) out.push(...Array.from(o.instanceColor.array as Float32Array));
    } else out.push(...o.position.toArray(), o.rotation.x, o.rotation.y, o.rotation.z, ...o.scale.toArray(), o.visible ? 1 : 0);
  });
  return out;
}

const range = (id: string): { min: number; max: number } => info.charts.find((c) => c.id === id)!;
const IDS = ['molekul-ic', 'molekul-dis', 'derisim-farki', 'net-gecis', 'hucre-hacmi', 'harcanan-atp'];

vi.setConfig({ testTimeout: 30_000 });

describe.each(info.tracks.map((t) => [t.id, t.duration] as const))('membrane-transport scene %s', (trackId, duration) => {
  it('matches the data duration and poses deterministically (seek twice, out of order)', async () => {
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

  it('is identical across two builds', async () => {
    const a = await open(trackId);
    const b = await open(trackId);
    a.seek(duration * 0.5);
    b.seek(duration * 0.5);
    const sa = snapshot(a);
    const sb = snapshot(b);
    const bad = sa.findIndex((v, k) => v !== sb[k]);
    expect(sa.length === sb.length && bad < 0, `first difference at ${bad}`).toBe(true);
    expect(a.chartAt!(duration * 0.5)).toEqual(b.chartAt!(duration * 0.5));
    a.dispose();
    b.dispose();
  });

  it('gives finite chart values inside the declared ranges, labels and a camera path', async () => {
    const scene = await open(trackId);
    for (let t = 0; t <= duration; t += duration / 40) {
      const chart = scene.chartAt!(t);
      for (const c of info.charts) {
        const v = chart[c.id];
        expect(v, `${c.id} at ${t}`).toBeDefined();
        expect(Number.isFinite(v)).toBe(true);
        expect(v!).toBeGreaterThanOrEqual(range(c.id).min - 1e-6);
        expect(v!).toBeLessThanOrEqual(range(c.id).max + 1e-6);
      }
      const labels = scene.labelsAt!(t);
      expect(labels.length).toBeGreaterThan(0);
      expect(labels.length).toBeLessThanOrEqual(6);
      for (const l of labels) expect(l.world.every(Number.isFinite)).toBe(true);
      const cam = scene.cameraAt!(t);
      expect([...cam.position, ...cam.target].every(Number.isFinite)).toBe(true);
      expect(new Vector3(...cam.position).distanceTo(new Vector3(...cam.target))).toBeGreaterThan(5);
    }
    scene.dispose();
  });

  it('chart values at the start of each phase match the data table (default options)', async () => {
    const scene = await open(trackId);
    const track = info.tracks.find((t) => t.id === trackId)!;
    for (const p of track.phases) {
      const row = CHART_TABLE[trackId]?.[p.id];
      expect(row, `table row ${trackId}/${p.id}`).toBeDefined();
      const chart = scene.chartAt!(p.start);
      IDS.forEach((id, i) => expect(chart[id]!, `${p.id} ${id}`).toBeCloseTo(row![i]!, 1));
    }
    scene.dispose();
  });

  it('builds at low quality and at temel, and survives option changes', async () => {
    const scene = await open(trackId, {}, 'temel', 'low');
    scene.seek(duration * 0.4);
    for (const o of info.options) for (const c of o.choices) scene.setOptions!({ [o.id]: c.id });
    scene.seek(duration * 0.8);
    expect(snapshot(scene).every(Number.isFinite)).toBe(true);
    scene.dispose();
  });
});

describe('membrane-transport framing', () => {
  it('shows no labels at low quality and at most 6 anywhere', async () => {
    const low = await open('ozmoz', {}, 'ileri', 'low');
    expect(low.labelsAt!(10)).toEqual([]);
    const ok = await open('endositoz-ekzositoz');
    for (let t = 0; t <= 56; t += 2) expect(ok.labelsAt!(t).length).toBeLessThanOrEqual(6);
  });

  it('osmosis keeps at most 150 molecules on screen and hides the other cells outside the comparison', async () => {
    const s = await open('ozmoz');
    s.seek(14);
    let visible = 0;
    s.root.traverse((o) => {
      if (o instanceof InstancedMesh && o.count > 100) {
        const m = o.instanceMatrix.array as Float32Array;
        for (let i = 0; i < o.count; i++) if (m[i * 16]! > 1e-6) visible++;
      }
    });
    expect(visible).toBeLessThanOrEqual(150);
    expect(visible).toBeGreaterThan(40);
  });

  it('the lysosome only exists at Ileri', async () => {
    const t = await open('endositoz-ekzositoz', {}, 'temel');
    const i = await open('endositoz-ekzositoz', {}, 'ileri');
    expect(i.labelsAt!(50).some((l) => l.text.includes('Lizozom') || l.text === 'Sindirim')).toBe(true);
    expect(t.labelsAt!(50).some((l) => l.text.includes('Lizozom'))).toBe(false);
  });
});

describe('membrane-transport physics', () => {
  it('diffusion: net flow goes down the gradient and ends near equilibrium', async () => {
    const s = await open('difuzyon');
    const c = (t: number): Record<string, number> => s.chartAt!(t);
    expect(c(0)['molekul-ic']).toBe(12);
    expect(c(0)['molekul-dis']).toBe(36);
    expect(c(44)['molekul-ic']).toBeGreaterThan(18);
    expect(c(44)['molekul-ic']).toBeLessThan(30);
    expect(c(20)['molekul-ic']! + c(20)['molekul-dis']!).toBe(48);
  });

  it('diffusion: a bigger concentration difference moves more molecules early on', async () => {
    const small = await open('difuzyon', { 'derisim-farki': 'kucuk' });
    const big = await open('difuzyon', { 'derisim-farki': 'buyuk' });
    expect(big.chartAt!(0)['derisim-farki']!).toBeGreaterThan(small.chartAt!(0)['derisim-farki']!);
    const gain = (s: ModuleScene): number => s.chartAt!(18)['molekul-ic']! - s.chartAt!(0)['molekul-ic']!;
    expect(gain(big)).toBeGreaterThan(gain(small));
  });

  it('facilitated diffusion: the extra glucose appears at 30 s and the inside count never falls far', async () => {
    const s = await open('kolaylastirilmis-difuzyon');
    const tot = (t: number): number => s.chartAt!(t)['molekul-ic']! + s.chartAt!(t)['molekul-dis']!;
    expect(tot(10)).toBe(16);
    expect(tot(40)).toBe(32);
    expect(s.chartAt!(30)['molekul-ic']).toBeGreaterThanOrEqual(s.chartAt!(8)['molekul-ic']!);
  });

  it('osmosis: hypotonic swells, hypertonic shrinks, isotonic stays; the wall limits the plant cell', async () => {
    const s = await open('ozmoz');
    expect(s.chartAt!(5.9)['hucre-hacmi']).toBeCloseTo(100, 1);
    expect(s.chartAt!(19.9)['hucre-hacmi']!).toBeGreaterThan(125);
    expect(s.chartAt!(29.9)['hucre-hacmi']!).toBeCloseTo(100, 1);
    expect(s.chartAt!(43.9)['hucre-hacmi']!).toBeLessThan(78);
    const plant = await open('ozmoz', { 'hucre-turu': 'bitki' });
    expect(plant.chartAt!(19.9)['hucre-hacmi']!).toBeLessThanOrEqual(112.1);
  });

  it('active transport: 3 Na+ out and one ATP per cycle, against the gradient', async () => {
    const s = await open('aktif-tasima');
    expect(s.chartAt!(0)['molekul-ic']).toBe(14);
    expect(s.chartAt!(46)['molekul-ic']).toBe(14 - 12);
    expect(s.chartAt!(46)['harcanan-atp']).toBe(4);
    expect(atpUsed(10.7)).toBe(0);
    expect(atpUsed(10.9)).toBe(1);
    expect(s.chartAt!(46)['derisim-farki']!).toBeGreaterThan(s.chartAt!(0)['derisim-farki']!);
  });

  it('endocytosis and exocytosis: cargo is conserved and moves in, then out', async () => {
    const s = await open('endositoz-ekzositoz');
    const total = (t: number): number => s.chartAt!(t)['molekul-ic']! + s.chartAt!(t)['molekul-dis']!;
    for (const t of [0, 13, 25, 40, 50, 56]) expect(total(t)).toBe(12);
    expect(cargoInside(0)).toBe(6);
    expect(cargoInside(30)).toBe(12);
    expect(cargoInside(56)).toBe(6);
  });
});
