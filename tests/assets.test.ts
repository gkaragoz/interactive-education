// Organelle GLB contract (docs/ASSETS.md). Node only: parses the GLB JSON chunk by hand, no WebGL, no three.js.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = join(process.cwd(), 'public', 'models', 'organelles');
const IDS = [
  'nucleus', 'mitochondrion', 'rough-er', 'smooth-er', 'golgi', 'ribosome', 'lysosome', 'centrosome', 'vacuole',
  'chloroplast', 'nucleoid', 'plasmid', 'flagellum', 'pilus', 'membrane-animal', 'membrane-plant', 'wall-plant',
  'envelope-bacterium',
];
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

describe('organelle GLB assets', () => {
  it('has every id from docs/ASSETS.md', () => {
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
          expect(Math.abs(bmin + bmax) / 2).toBeLessThan(0.01); // centred
        }
        const diag = Math.hypot(...lo.map((v, k) => Math.max(Math.abs(v), Math.abs(hi[k] as number))));
        expect(meta.boundsRadius).toBeGreaterThan(0);
        expect(meta.boundsRadius).toBeLessThanOrEqual(diag + 0.01);
      });
    });
  }

  it('has contract sizes for the headline organelles (about, +-35 %)', () => {
    const size = (id: string) => {
      const m = JSON.parse(readFileSync(join(DIR, `${id}.meta.json`), 'utf8')) as Meta;
      return m.bboxMax.map((v, k) => v - (m.bboxMin[k] as number));
    };
    const near = (v: number, want: number) => expect(Math.abs(v - want) / want).toBeLessThan(0.35);
    near(Math.max(...size('nucleus')), 6);
    near(Math.max(...size('mitochondrion')), 3.2);
    near(Math.max(...size('chloroplast')), 5);
    near(Math.max(...size('golgi')), 3.5);
    near(Math.max(...size('lysosome')), 1.1);
    near(Math.max(...size('centrosome')), 1.6);
  });
});
