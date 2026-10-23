import { Color, DynamicDrawUsage, Group, InstancedMesh, Matrix4, type MeshPhysicalMaterial } from 'three';
import type { ModuleAssets } from '../../../scene';

const HIDDEN = new Matrix4().makeScale(0, 0, 0);
const WHITE = new Color(1, 1, 1);

/**
 * Instances of one asset where every mesh part has its own tint and can be hidden on its own (the shared
 * `InstanceSet` tints a whole instance). Per frame: `begin()`, `push()` per instance, optional `tint` / `hidePart`,
 * `end()`. Parts are matched by the suffix of the mesh name (`nucleotide-base` -> `base`).
 */
export class PartSet {
  readonly group = new Group();
  private readonly meshes: { name: string; mesh: InstancedMesh }[] = [];
  private n = 0;
  private readonly owned: MeshPhysicalMaterial[] = [];
  /** True when the GLB is missing and the framework substituted one primitive: then `tint` colours it whole. */
  private placeholder = false;

  private constructor(
    readonly id: string,
    readonly cap: number,
  ) {}

  static async create(assets: ModuleAssets, id: string, cap: number, opts: { lod?: number; /** ignored (see above) */ ghost?: number; order?: number; color?: string } = {}): Promise<PartSet> {
    const set = new PartSet(id, cap);
    const asset = await assets.asset(id, opts.color);
    set.placeholder = asset.placeholder;
    // always LOD0: the lower LODs merge parts, and per-part tints and hidden parts need the named meshes
    const parts = asset.lods[0] ?? [];
    set.group.name = `${id}-parts`;
    for (const part of parts) {
      let mat = assets.materials.get(id, part.kind);
      if (opts.ghost !== undefined) {
        // translucent enzyme look: the DNA stays visible through it
        const g = mat.clone();
        g.onBeforeCompile = mat.onBeforeCompile;
        g.customProgramCacheKey = mat.customProgramCacheKey;
        g.transparent = true;
        g.opacity = opts.ghost;
        g.depthWrite = false;
        set.owned.push(g);
        mat = g;
      }
      const mesh = new InstancedMesh(part.geometry, mat, cap);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.castShadow = part.kind === 'clay' && opts.ghost === undefined;
      mesh.renderOrder = opts.order ?? (opts.ghost !== undefined ? 45 : part.kind === 'gel' ? 40 : 30);
      mesh.count = 0;
      mesh.setColorAt(0, WHITE);
      set.group.add(mesh);
      set.meshes.push({ name: part.name.startsWith(`${id}-`) ? part.name.slice(id.length + 1) : part.name, mesh });
    }
    return set;
  }

  begin(): void {
    this.n = 0;
  }

  get used(): number {
    return this.n;
  }

  /** Adds an instance (all parts, white tint) and returns its index for this frame. */
  push(m: Matrix4): number {
    if (this.n >= this.cap) return this.cap - 1;
    const i = this.n++;
    for (const { mesh } of this.meshes) {
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, WHITE);
    }
    return i;
  }

  /** Tints the parts whose name is in `names` (or every part when `names` is empty). */
  tint(i: number, color: Color, ...names: string[]): void {
    if (this.placeholder) {
      // one stand-in primitive: it takes the colour of the part that matters (base, residue)
      if (names.includes('base') || names.includes('residue')) for (const { mesh } of this.meshes) mesh.setColorAt(i, color);
      return;
    }
    for (const { name, mesh } of this.meshes) if (names.length === 0 || names.includes(name)) mesh.setColorAt(i, color);
  }

  /** Overrides the matrix of one part of instance `i` (e.g. a subunit that moves on its own). */
  setPart(i: number, name: string, m: Matrix4): void {
    for (const p of this.meshes) if (p.name === name) p.mesh.setMatrixAt(i, m);
  }

  hidePart(i: number, name: string): void {
    for (const p of this.meshes) if (p.name === name) p.mesh.setMatrixAt(i, HIDDEN);
  }

  end(): void {
    for (const { mesh } of this.meshes) {
      mesh.count = this.n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const { mesh } of this.meshes) mesh.dispose();
    for (const m of this.owned) m.dispose();
    this.group.removeFromParent();
  }
}
