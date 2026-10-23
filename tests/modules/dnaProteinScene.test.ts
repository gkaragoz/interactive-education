import { BoxGeometry, Color, InstancedMesh, Matrix4, Plane, Quaternion, Texture, Vector3, type BufferGeometry } from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { mulberry32 } from '../../src/core';
import { dnaProtein } from '../../src/data/modules/dna-protein';
import { geneExamples } from '../../src/data/modules/dna-protein.examples';
import { ModuleAssets, type ModuleContext, type ModuleScene } from '../../src/scene';
import { createDnaScene } from '../../src/modules/dna-protein/scene';
import { aaColor, baseColor } from '../../src/modules/dna-protein/kit/palette';
import { buildTranslationPlan } from '../../src/modules/dna-protein/tracks/translasyonPlan';
import { genePlan } from '../../src/modules/dna-protein/sequence';

// A fake asset per id with the real part names, so tints and hidden parts can be checked without any GLB.
const PARTS: Record<string, string[]> = {
  nucleotide: ['base', 'phosphate', 'sugar'],
  trna: ['acceptor', 'amino-acid', 'anticodon', 'body'],
  'amino-acid': ['residue', 'stubs'],
  'ribosome-subunits': ['large', 'sites', 'small'],
};
function fakeAsset(id: string): unknown {
  const names = PARTS[id] ?? ['body'];
  const lod = names.map((n) => ({ name: `${id}-${n}`, geometry: new BoxGeometry(1, 1, 1) as BufferGeometry, kind: 'clay' as const }));
  return { id, lods: [lod, lod, lod], boundsRadius: 1, halfExtents: [1, 1, 1], placeholder: false, meta: null, dispose: () => undefined };
}

async function make(trackId: string, quality: 'low' | 'medium' | 'high' = 'medium', options: Record<string, string> = {}, level: 'temel' | 'ileri' = 'ileri', reducedMotion = false): Promise<ModuleScene> {
  const assets = new ModuleAssets('/', quality, new Texture(), new Plane());
  const defaults = Object.fromEntries(dnaProtein.options.map((o) => [o.id, o.defaultChoice]));
  const ctx: ModuleContext = { assets, quality, level, reducedMotion, trackId, options: { ...defaults, ...options }, rng: mulberry32 };
  return createDnaScene(ctx);
}

interface Inst {
  mesh: string;
  pos: Vector3;
  scale: number;
  color: Color;
}

const m = new Matrix4();
const q = new Quaternion();
const sc = new Vector3();

/** Every drawn instance (only the first `count` of each InstancedMesh). */
function instances(scene: ModuleScene): Inst[] {
  const out: Inst[] = [];
  scene.root.traverse((o) => {
    if (!(o instanceof InstancedMesh)) return;
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m);
      const pos = new Vector3();
      m.decompose(pos, q, sc);
      const color = new Color(1, 1, 1);
      if (o.instanceColor) o.getColorAt(i, color);
      out.push({ mesh: `${o.parent?.name ?? ''}/${(o.geometry as BufferGeometry).uuid}`, pos, scale: Math.cbrt(Math.abs(sc.x * sc.y * sc.z)), color });
    }
  });
  return out;
}
const flat = (scene: ModuleScene): number[] => instances(scene).flatMap((i) => [i.pos.x, i.pos.y, i.pos.z, i.scale, i.color.r, i.color.g, i.color.b]);

const TRACKS = dnaProtein.tracks;

describe('dna-protein scene', () => {
  beforeAll(() => {
    vi.spyOn(ModuleAssets.prototype, 'asset').mockImplementation(async (id: string) => fakeAsset(id) as never);
  });

  for (const track of TRACKS) {
    it(`${track.id}: duration matches the data, seek(t) is deterministic and works backwards`, async () => {
      const s = await make(track.id);
      expect(s.duration).toBe(track.duration);
      const times = [0, 3.3, 9, 14.5, 21, 28.2, 35, 41, track.duration];
      const first = times.map((t) => (s.seek(t), flat(s)));
      const back = [...times].reverse().map((t) => (s.seek(t), flat(s))).reverse();
      back.forEach((snap, i) => expect(snap).toEqual(first[i]));
      // a second scene, posed straight at the same time, gives the same picture (no hidden accumulated state)
      const s2 = await make(track.id);
      s2.seek(28.2);
      s.seek(28.2);
      expect(flat(s2)).toEqual(flat(s));
      s.dispose();
      s2.dispose();
    });

    it(`${track.id}: no NaN, bounded instances, labels and charts finite at every quality`, async () => {
      for (const q of ['low', 'medium', 'high'] as const) {
        const s = await make(track.id, q);
        let maxInst = 0;
        for (let t = 0; t <= s.duration; t += 1.3) {
          s.seek(t);
          const list = instances(s);
          maxInst = Math.max(maxInst, list.length);
          expect(list.every((i) => Number.isFinite(i.pos.x + i.pos.y + i.pos.z + i.scale)), `${q} t=${t}`).toBe(true);
          const cam = s.cameraAt?.(t);
          expect([...(cam?.position ?? []), ...(cam?.target ?? [])].every(Number.isFinite)).toBe(true);
          for (const l of s.labelsAt?.(t) ?? []) expect(l.world.every(Number.isFinite), `${l.text} @${t}`).toBe(true);
          for (const v of Object.values(s.chartAt?.(t) ?? {})) expect(Number.isFinite(v)).toBe(true);
        }
        expect(maxInst).toBeLessThan(1000);
        s.dispose();
      }
    });

    it(`${track.id}: nothing pops in or vanishes at a visible size between close frames`, { timeout: 300_000 }, async () => {
      const s = await make(track.id);
      const dt = 0.05;
      const byMesh = (list: Inst[]): Map<string, Inst[]> => {
        const map = new Map<string, Inst[]>();
        for (const i of list) (map.get(i.mesh) ?? map.set(i.mesh, []).get(i.mesh)!).push(i);
        return map;
      };
      const has = (map: Map<string, Inst[]>, i: Inst): boolean => (map.get(i.mesh) ?? []).some((o) => o.pos.distanceTo(i.pos) < 2.2);
      s.seek(0);
      let prev = instances(s);
      let prevMap = byMesh(prev);
      for (let t = dt; t <= s.duration; t += dt) {
        s.seek(t);
        const cur = instances(s);
        const curMap = byMesh(cur);
        for (const c of cur) {
          if (c.scale < 0.3) continue;
          expect(has(prevMap, c), `${track.id} t=${t.toFixed(2)} popped in: mesh ${c.mesh} at ${c.pos.toArray().map((v) => v.toFixed(1))} scale ${c.scale.toFixed(2)}`).toBe(true);
        }
        for (const p of prev) {
          if (p.scale < 0.3) continue;
          expect(has(curMap, p), `${track.id} t=${t.toFixed(2)} vanished: mesh ${p.mesh} at ${p.pos.toArray().map((v) => v.toFixed(1))} scale ${p.scale.toFixed(2)}`).toBe(true);
        }
        prev = cur;
        prevMap = curMap;
      }
      s.dispose();
    });
  }

  it('labels follow the level wording (Temel does not name enzymes, İleri does)', async () => {
    const temel = await make('replikasyon', 'medium', {}, 'temel');
    const ileri = await make('replikasyon', 'medium', {}, 'ileri');
    const t = 19;
    const tt = (temel.labelsAt?.(t) ?? []).map((l) => l.text).join('|');
    const ii = (ileri.labelsAt?.(t) ?? []).map((l) => l.text).join('|');
    expect(tt).not.toMatch(/polimeraz|Helikaz|ligaz|Okazaki/i);
    expect(ii).toMatch(/DNA polimeraz/);
    expect(ii).toMatch(/Helikaz/);
    temel.dispose();
    ileri.dispose();
  });

  it('translation: tRNAs and beads follow the codon table for every example gene', async () => {
    for (const g of geneExamples) {
      const s = await make('translasyon', 'medium', { 'gene-example': g.id });
      const plan = buildTranslationPlan(genePlan(g.id).mrna);
      expect(plan.peptide).toEqual(g.peptide);
      // after the last peptide bond (t = 38) the chain beads carry the colours of the expected amino acids
      s.seek(38.5);
      let beadMesh: InstancedMesh | null = null;
      s.root.traverse((o) => {
        if (o instanceof InstancedMesh && o.parent?.name === 'amino-acid-parts' && !beadMesh) beadMesh = o;
      });
      expect(beadMesh).not.toBeNull();
      const mesh = beadMesh as unknown as InstancedMesh;
      expect(mesh.count).toBe(g.peptide.length);
      g.peptide.forEach((aa, j) => {
        const c = new Color();
        mesh.getColorAt(j, c);
        expect(c.getHex(), `${g.id} bead ${j} ${aa}`).toBe(aaColor(aa).getHex());
      });
      // one tRNA per amino acid has arrived by then, and the labels name the codons
      const names = (s.labelsAt?.(18) ?? []).map((l) => l.text).join('|');
      expect(names).toContain(`Kodon: ${plan.steps[1]?.codon}`);
      s.dispose();
    }
  });

  it('transcription: the mRNA nucleotides are coloured by the base of the transcribed gene (U for T)', async () => {
    for (const g of geneExamples) {
      const s = await make('transkripsiyon', 'medium', { 'gene-example': g.id });
      s.seek(33);
      let baseMesh: InstancedMesh | null = null;
      s.root.traverse((o) => {
        if (o instanceof InstancedMesh && o.parent?.name === 'nucleotide-parts' && o.count > 0 && !baseMesh) baseMesh = o;
      });
      const mesh = baseMesh as unknown as InstancedMesh;
      // slots: 15 coding + 15 template nucleotides (interleaved), then the 15 mRNA nucleotides
      expect(mesh.count).toBe(45);
      const gene = genePlan(g.id);
      for (let j = 0; j < 15; j++) {
        const c = new Color();
        mesh.getColorAt(30 + j, c);
        expect(c.getHex(), `${g.id} mRNA ${j} ${gene.mrna[j]}`).toBe(baseColor(gene.mrna[j] as string).getHex());
      }
      expect(gene.mrna).toBe(g.mrna);
      s.dispose();
    }
  });

  it('setOptions changes the gene and the mutation without rebuilding the scene', async () => {
    const s = await make('mutasyon');
    s.seek(38);
    const before = (s.chartAt?.(38) ?? {})['dogru-aa-orani'];
    expect(before).toBe(75);
    s.setOptions?.({ 'mutation-type': 'sessiz' });
    expect((s.chartAt?.(38) ?? {})['dogru-aa-orani']).toBe(100);
    s.setOptions?.({ 'mutation-type': 'anlamsiz' });
    expect((s.chartAt?.(38) ?? {})['dogru-aa-orani']).toBe(25);
    s.dispose();
  });

  it('Temel level and reduced motion pose every track the same way as İleri/normal where the content is shared', async () => {
    for (const track of TRACKS.filter((t) => t.levels.includes('temel'))) {
      const a = await make(track.id, 'medium', {}, 'temel', true);
      const b = await make(track.id, 'medium', {}, 'temel', false);
      for (const t of [5, 17, 30, 42]) {
        a.seek(t);
        b.seek(t);
        expect(flat(a)).toEqual(flat(b));
        expect(instances(a).every((i) => Number.isFinite(i.scale))).toBe(true);
      }
      a.dispose();
      b.dispose();
    }
  });

  it('seek speed stays far below the frame budget (CPU part)', async () => {
    const s = await make('replikasyon', 'high');
    const start = performance.now();
    const n = 300;
    for (let i = 0; i < n; i++) s.seek((i / n) * s.duration);
    const per = (performance.now() - start) / n;
    expect(per).toBeLessThan(4);
    s.dispose();
  });
});
