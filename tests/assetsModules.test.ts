// Learning-module asset contract (docs/ASSETS.md, public/models/modules; mirrors tests/assets.test.ts). Node only: parses the GLB JSON chunk by hand, no WebGL, no three.js.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = join(process.cwd(), 'public', 'models', 'modules');
const IDS = [
  'chromosome', 'chromosome-single', 'chromatin', 'kinetochore-fibre', 'spindle-pole', 'cleavage-furrow-ring', 'cell-plate',
  'nuclear-envelope-fragment',
  // batch 2 (v0.3 membrane-transport, v0.4 dna-protein)
  'bilayer-patch', 'bilayer-tile', 'channel-protein', 'carrier-protein', 'carrier-protein-b', 'pump-protein', 'receptor-protein',
  'dna-helix', 'dna-single-strand', 'helicase', 'dna-polymerase', 'rna-polymerase', 'nucleotide', 'mrna-strand', 'trna', 'amino-acid',
  'polypeptide-chain', 'ribosome-subunits',
  // batch 3 (v0.5 energy)
  'atp-synthase', 'etc-complex-1', 'etc-complex-2', 'etc-complex-3', 'etc-complex-4', 'cytochrome-c', 'ubiquinone', 'photosystem-1',
  'photosystem-2', 'rubisco', 'atp', 'glucose', 'co2', 'o2', 'h2o', 'pyruvate', 'thylakoid-stack', 'mitochondrion-crista-detail',
  // batch 4 (v0.6 muscle, nervous system, genetics)
  'sarcomere', 'myosin-head', 'actin-filament', 'troponin-tropomyosin', 'muscle-fibre-bundle', 'neuron', 'synapse-terminal', 'neurotransmitter',
  'na-channel', 'na-channel-open', 'k-channel', 'k-channel-open', 'reflex-arc-parts', 'punnett-tile', 'allele-token',
];
const DECOR: string[] = [];
const TEX_SIZE: Record<string, number> = {
  chromosome: 2048, 'chromosome-single': 2048, chromatin: 1024, 'kinetochore-fibre': 1024, 'spindle-pole': 1024,
  'cleavage-furrow-ring': 1024, 'cell-plate': 1024, 'nuclear-envelope-fragment': 1024,
  'bilayer-patch': 2048, 'bilayer-tile': 1024, 'channel-protein': 1024, 'carrier-protein': 1024, 'carrier-protein-b': 1024,
  'pump-protein': 1024, 'receptor-protein': 1024, 'dna-helix': 1024, 'dna-single-strand': 1024, helicase: 1024,
  'dna-polymerase': 1024, 'rna-polymerase': 1024, nucleotide: 512, 'mrna-strand': 512, trna: 1024, 'amino-acid': 512,
  'polypeptide-chain': 1024, 'ribosome-subunits': 1024,
  'atp-synthase': 1024, 'etc-complex-1': 1024, 'etc-complex-2': 512, 'etc-complex-3': 1024, 'etc-complex-4': 1024, 'cytochrome-c': 512,
  ubiquinone: 512, 'photosystem-1': 1024, 'photosystem-2': 1024, rubisco: 1024, atp: 512, glucose: 512, co2: 256, o2: 256, h2o: 256,
  pyruvate: 512, 'thylakoid-stack': 2048, 'mitochondrion-crista-detail': 2048,
  sarcomere: 1024, 'myosin-head': 1024, 'actin-filament': 512, 'troponin-tropomyosin': 512, 'muscle-fibre-bundle': 1024, neuron: 2048,
  'synapse-terminal': 1024, neurotransmitter: 512, 'na-channel': 1024, 'na-channel-open': 1024, 'k-channel': 1024, 'k-channel-open': 1024,
  'reflex-arc-parts': 1024, 'punnett-tile': 512, 'allele-token': 512,
};
const TEX_DIR = join(process.cwd(), 'public', 'textures', 'modules');
const TIERS = ['low', 'medium', 'high'] as const;
const MB = 1024 * 1024;
const NAME_RE = /^[A-Za-z0-9_-]+$/;
const MAX_BYTES = 1.5 * 1024 * 1024;

interface GNode {
  name: string;
  children?: number[];
  mesh?: number;
  matrix?: number[];
  rotation?: number[];
  scale?: number[];
  translation?: number[];
}
interface GMesh {
  name: string;
  primitives: { attributes: Record<string, number>; indices: number; material: number }[];
}
interface Accessor {
  count: number;
  min?: number[];
  max?: number[];
}
interface Gltf {
  scene: number;
  scenes: { nodes: number[] }[];
  nodes: GNode[];
  meshes: GMesh[];
  materials: { name: string }[];
  accessors: Accessor[];
  images?: unknown[];
  textures?: unknown[];
  extensionsUsed?: string[];
}
interface Meta {
  id: string;
  tris: { LOD0: number; LOD1: number; LOD2: number };
  bboxMin: number[];
  bboxMax: number[];
  boundsRadius: number;
  closed: boolean;
  generator: string;
  seed: number;
  uv?: Record<string, { uvMin: number[]; uvMax: number[]; coverage: number; overlap: number; stretchP05: number; stretchP95: number; uvPerUnit: number }>;
  textures?: { format: string; tiers: Record<string, { bytes: number; size: number; maps: { name: string; size: number; bytes: number }[] }> };
}

function readGlb(path: string): Gltf {
  const buf = readFileSync(path);
  expect(buf.readUInt32LE(0)).toBe(0x46546c67); // 'glTF'
  expect(buf.readUInt32LE(4)).toBe(2);
  const len = buf.readUInt32LE(12);
  expect(buf.readUInt32LE(16)).toBe(0x4e4f534a); // 'JSON'
  return JSON.parse(buf.subarray(20, 20 + len).toString('utf8')) as Gltf;
}

const nodeAt = (g: Gltf, i: number) => g.nodes[i] as GNode;
const accAt = (g: Gltf, i: number) => g.accessors[i] as Accessor;

function lodMeshes(g: Gltf, root: number, lod: string) {
  const lodIdx = (nodeAt(g, root).children ?? []).find((c) => nodeAt(g, c).name === lod) as number;
  const out: { mesh: GMesh }[] = [];
  const walk = (i: number) => {
    const n = nodeAt(g, i);
    if (n.mesh !== undefined) out.push({ mesh: g.meshes[n.mesh] as GMesh });
    (n.children ?? []).forEach(walk);
  };
  walk(lodIdx);
  return out;
}

const tris = (g: Gltf, ms: ReturnType<typeof lodMeshes>) =>
  ms.reduce((s, m) => s + m.mesh.primitives.reduce((a, p) => a + accAt(g, p.indices).count / 3, 0), 0);

describe('module GLB assets', () => {
  it('has every module asset id', () => {
    for (const id of IDS) {
      expect(existsSync(join(DIR, `${id}.glb`)), `${id}.glb`).toBe(true);
      expect(existsSync(join(DIR, `${id}.meta.json`)), `${id}.meta.json`).toBe(true);
    }
  });

  for (const id of IDS) {
    describe(id, () => {
      const path = join(DIR, `${id}.glb`);
      if (!existsSync(path)) {
        it('exists', () => expect(existsSync(path)).toBe(true));
        return;
      }
      const g = readGlb(path);
      const meta = JSON.parse(readFileSync(join(DIR, `${id}.meta.json`), 'utf8')) as Meta;
      const sceneNodes = (g.scenes[g.scene ?? 0] as { nodes: number[] }).nodes;
      const root = sceneNodes[0] as number;

      it('has root node <id> with LOD0, LOD1, LOD2 groups', () => {
        expect(sceneNodes).toHaveLength(1);
        expect(nodeAt(g, root).name).toBe(id);
        const kids = (nodeAt(g, root).children ?? []).map((c) => nodeAt(g, c).name);
        expect(kids.sort()).toEqual(['LOD0', 'LOD1', 'LOD2']);
      });

      it('uses only [A-Za-z0-9_-] names, meshes named <id>-<part>, no node transforms', () => {
        for (const n of g.nodes) {
          expect(n.name, 'node name').toMatch(NAME_RE);
          expect(n.matrix ?? n.rotation ?? n.scale ?? n.translation, `${n.name} transform`).toBeUndefined();
        }
        for (const m of g.meshes) {
          expect(m.name).toMatch(NAME_RE);
          expect(m.name.startsWith(`${id}-`), m.name).toBe(true);
        }
      });

      it('has at most 2 materials, suffixed _clay / _gel', () => {
        expect(g.materials.length).toBeGreaterThan(0);
        expect(g.materials.length).toBeLessThanOrEqual(2);
        for (const m of g.materials) expect(m.name).toMatch(new RegExp(`^${id}_(clay|gel)$`));
        expect(g.images ?? []).toHaveLength(0);
        expect(g.textures ?? []).toHaveLength(0);
      });

      it('carries COLOR_0, NORMAL and TEXCOORD_0 on every primitive', () => {
        for (const m of g.meshes)
          for (const p of m.primitives) {
            expect(p.attributes.COLOR_0, `${m.name} COLOR_0`).toBeDefined();
            expect(p.attributes.NORMAL, `${m.name} NORMAL`).toBeDefined();
            expect(p.attributes.TEXCOORD_0, `${m.name} TEXCOORD_0`).toBeDefined();
          }
      });

      it('meets the triangle budgets and LOD ratios', () => {
        const [t0 = 0, t1 = 0, t2 = 0] = ['LOD0', 'LOD1', 'LOD2'].map((l) => tris(g, lodMeshes(g, root, l)));
        expect(t0).toBeLessThanOrEqual(60000);
        expect(t1).toBeLessThanOrEqual(0.3 * t0);
        expect(t2).toBeLessThanOrEqual(0.6 * t1);
        expect(t2).toBeGreaterThanOrEqual(300);
      });

      it('is at most 1.5 MB and meshopt compressed', () => {
        expect(statSync(path).size).toBeLessThanOrEqual(MAX_BYTES);
        expect(g.extensionsUsed ?? []).toContain('EXT_meshopt_compression');
      });

      it('has a meta.json consistent with the GLB', () => {
        expect(meta.id).toBe(id);
        expect(meta.closed).toBe(true);
        expect(typeof meta.generator).toBe('string');
        expect(Number.isInteger(meta.seed)).toBe(true);
        for (const l of ['LOD0', 'LOD1', 'LOD2'] as const) {
          expect(meta.tris[l]).toBe(tris(g, lodMeshes(g, root, l)));
        }
        // bbox from the LOD0 POSITION accessors, centred on the origin
        const lo = [Infinity, Infinity, Infinity];
        const hi = [-Infinity, -Infinity, -Infinity];
        for (const { mesh } of lodMeshes(g, root, 'LOD0'))
          for (const p of mesh.primitives) {
            const a = accAt(g, p.attributes.POSITION as number);
            for (let k = 0; k < 3; k++) {
              lo[k] = Math.min(lo[k] as number, (a.min as number[])[k] as number);
              hi[k] = Math.max(hi[k] as number, (a.max as number[])[k] as number);
            }
          }
        for (let k = 0; k < 3; k++) {
          const bmin = meta.bboxMin[k] as number;
          const bmax = meta.bboxMax[k] as number;
          expect(bmin).toBeCloseTo(lo[k] as number, 2);
          expect(bmax).toBeCloseTo(hi[k] as number, 2);
        }
        const diag = Math.hypot(...lo.map((v, k) => Math.max(Math.abs(v), Math.abs(hi[k] as number))));
        expect(meta.boundsRadius).toBeGreaterThan(0);
        expect(meta.boundsRadius).toBeLessThanOrEqual(diag + 0.01);
      });
    });
  }

  it('documents pivot, axes and tinting in meta.json', () => {
    for (const id of IDS) {
      const m = JSON.parse(readFileSync(join(DIR, `${id}.meta.json`), 'utf8')) as Meta & {
        pivot?: string; axes?: string; units?: string; tintable?: boolean; tintParts?: string[];
      };
      expect(typeof m.pivot, `${id} pivot`).toBe('string');
      expect(typeof m.axes, `${id} axes`).toBe('string');
      expect(typeof m.tintable, `${id} tintable`).toBe('boolean');
      if (m.tintable) expect(m.tintParts?.length, `${id} tintParts`).toBeGreaterThan(0);
    }
  });

  it('keeps the author pivot: chromosome centromere at the origin, fibre starts at x = 0', () => {
    const rd = (id: string) => JSON.parse(readFileSync(join(DIR, `${id}.meta.json`), 'utf8')) as Meta;
    const ch = rd('chromosome');
    expect(Math.abs(ch.bboxMin[0] as number + (ch.bboxMax[0] as number))).toBeLessThan(0.05);
    expect(rd('kinetochore-fibre').bboxMin[0] as number).toBeGreaterThan(-0.05);
    expect(rd('kinetochore-fibre').bboxMax[0] as number).toBeCloseTo(1.0, 1);
  });

  describe('texture contract v2', () => {
    const KTX2_MAGIC = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];
    const topSize = (id: string) => TEX_SIZE[id] as number;
    const readMeta = (id: string) => JSON.parse(readFileSync(join(DIR, `${id}.meta.json`), 'utf8')) as Meta;

    it('every non-decor asset has textures for all three tiers', () => {
      for (const id of IDS.filter((i) => !DECOR.includes(i))) {
        const t = readMeta(id).textures;
        expect(t, `${id} textures`).toBeDefined();
        expect(Object.keys(t?.tiers ?? {}).sort(), id).toEqual(['high', 'low', 'medium']);
        expect(t?.format).toBe('KTX2');
      }
      for (const id of DECOR) expect(readMeta(id).textures, id).toBeUndefined();
    });

    it('has a sane UV atlas per material (range, overlap, coverage, stretch)', () => {
      for (const id of IDS) {
        const m = readMeta(id);
        expect(m.uv, `${id} uv`).toBeDefined();
        for (const [mat, u] of Object.entries(m.uv ?? {})) {
          for (let k = 0; k < 2; k++) {
            expect(u.uvMin[k] as number, `${id}/${mat}`).toBeGreaterThanOrEqual(0);
            expect(u.uvMax[k] as number, `${id}/${mat}`).toBeLessThanOrEqual(1);
          }
          expect(u.overlap, `${id}/${mat} overlap`).toBeLessThan(0.005);
          expect(u.coverage, `${id}/${mat} coverage`).toBeGreaterThan(0.25);
          expect(u.stretchP05, `${id}/${mat}`).toBeGreaterThan(0.3);
          expect(u.stretchP95, `${id}/${mat}`).toBeLessThan(3.0);
        }
      }
    });

    for (const id of IDS.filter((i) => !DECOR.includes(i))) {
      it(`${id}: KTX2 files exist, headers match meta, mips present, GLB materials covered`, () => {
        const m = readMeta(id);
        const g = readGlb(join(DIR, `${id}.glb`));
        const mats = g.materials.map((x) => x.name.split('_')[1] as string).sort();
        for (const tier of TIERS) {
          const info = m.textures?.tiers[tier];
          expect(info, `${id}/${tier}`).toBeDefined();
          const files = (info?.maps ?? []).map((x) => x.name).sort();
          const expected = mats.flatMap((mat) => ['albedo', 'normal', 'orm'].map((k) => `${mat}_${k}.ktx2`)).sort();
          expect(files, `${id}/${tier} files`).toEqual(expected);
          let sum = 0;
          for (const f of info?.maps ?? []) {
            const path = join(TEX_DIR, id, tier, f.name);
            expect(existsSync(path), path).toBe(true);
            const buf = readFileSync(path);
            for (let i = 0; i < 12; i++) expect(buf.readUInt8(i), `${path} magic`).toBe(KTX2_MAGIC[i]);
            expect(buf.readUInt32LE(20), `${path} width`).toBe(f.size);
            expect(buf.readUInt32LE(24), `${path} height`).toBe(f.size);
            expect(buf.readUInt32LE(40), `${path} mip levels`).toBeGreaterThan(1);
            expect(statSync(path).size).toBe(f.bytes);
            expect(f.bytes).toBeLessThan(25 * MB);
            sum += f.bytes;
          }
          expect(info?.bytes).toBe(sum);
        }
        // tiers shrink 4x per step in side length for the largest map
        const sizes = TIERS.map((t) => m.textures?.tiers[t]?.size ?? 0);
        expect(sizes[2]).toBe(topSize(id));
        expect(sizes[1]).toBe(topSize(id) / 2);
        expect(sizes[0]).toBe(topSize(id) / 4);
      });
    }

    it('texture budgets: total <= 120 MB, medium tier <= 50 MB', () => {
      let total = 0;
      let medium = 0;
      for (const id of IDS.filter((i) => !DECOR.includes(i))) {
        const t = readMeta(id).textures;
        for (const tier of TIERS) {
          const b = t?.tiers[tier]?.bytes ?? 0;
          total += b;
          if (tier === 'medium') medium += b;
        }
      }
      expect(total).toBeLessThanOrEqual(120 * MB);
      expect(medium).toBeLessThanOrEqual(50 * MB);
    });
  });
});
