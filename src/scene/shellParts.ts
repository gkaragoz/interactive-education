import { FrontSide, Group, Mesh, MeshBasicMaterial, Vector3, type Material } from 'three';
import type { OrganelleAsset } from './assetTypes';
import { SHELL_KEY, type Cutaway } from './cutaway';
import type { MaterialLibrary } from './materials';

interface ShellMesh {
  mesh: Mesh;
  /** Depth-only twin: lets the translucent shell colour only its nearest layer instead of piling up. */
  prepass: Mesh | null;
  ghost: Material;
  solid: Material;
  lod: number;
  stud: boolean;
}

interface ShellPart {
  id: string;
  holder: Group;
  meshes: ShellMesh[];
}

/** Meshes of one cell's shell parts (wall, membrane, envelope): ghost in the full view, solid and glossy in the cut view. */
export class ShellParts {
  readonly parts: ShellPart[] = [];
  /** Half extents of the authored shells in scene units (after scaling): the cell's real reach. */
  readonly reach = new Vector3();
  readonly studMaterials = new Set<Material>();
  private readonly prepassMaterial: MeshBasicMaterial;
  private cutMode = false;
  private lod = 0;
  private studsOn = true;

  constructor(
    ids: string[],
    assets: ReadonlyMap<string, OrganelleAsset>,
    cellHalfExtents: [number, number, number],
    materials: MaterialLibrary,
    cutaway: Cutaway,
    parent: Group,
  ) {
    this.prepassMaterial = new MeshBasicMaterial({ colorWrite: false, depthWrite: true, transparent: true, opacity: 1, side: FrontSide, clippingPlanes: [cutaway.plane] });
    // Authored shells already have the cell's size; only placeholders are stretched to the data's half extents.
    const ref = new Vector3();
    for (const id of ids) {
      const a = assets.get(id);
      if (a) ref.max(new Vector3(...a.halfExtents));
    }
    const authored = ids.length > 0 && ids.every((id) => assets.get(id)?.placeholder === false);
    const scale = authored ? new Vector3(1, 1, 1) : new Vector3(...cellHalfExtents).divide(new Vector3(ref.x || 1, ref.y || 1, ref.z || 1));
    ids.forEach((id, order) => {
      const asset = assets.get(id);
      if (!asset) return;
      this.reach.max(new Vector3(...asset.halfExtents).multiply(scale));
      const holder = new Group();
      holder.name = `shell-${id}`;
      holder.scale.copy(scale);
      parent.add(holder);
      const meshes: ShellMesh[] = [];
      asset.lods.forEach((parts, lod) => {
        for (const part of parts) {
          const stud = /-proteins/.test(part.name);
          const ghost = stud ? materials.get(`${id}.studs`, 'clay') : materials.shell(id);
          const solid = stud ? ghost : part.kind === 'clay' ? materials.get(id, 'clay') : materials.glossy(id);
          if (stud) this.studMaterials.add(ghost);
          const mesh = new Mesh(part.geometry, ghost);
          mesh.name = part.name;
          mesh.userData.organelleId = id;
          mesh.renderOrder = 50 + order;
          mesh.frustumCulled = false;
          holder.add(mesh);
          if (!stud) cutaway.register(mesh, SHELL_KEY, { mode: 'parity' });
          let prepass: Mesh | null = null;
          if (!stud) {
            prepass = new Mesh(part.geometry, this.prepassMaterial);
            prepass.renderOrder = 49;
            prepass.frustumCulled = false;
            holder.add(prepass);
          }
          meshes.push({ mesh, prepass, ghost, solid, lod, stud });
        }
      });
      this.parts.push({ id, holder, meshes });
    });
    this.refresh();
  }

  /** Triangles of all non-stud meshes at a LOD. */
  trianglesAt(lod: number): number {
    let tris = 0;
    for (const part of this.parts) {
      for (const m of part.meshes) {
        if (m.lod !== lod || m.stud) continue;
        const g = m.mesh.geometry;
        tris += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
      }
    }
    return tris;
  }

  ids(): string[] {
    return this.parts.map((p) => p.id);
  }

  setVisible(visible: (id: string) => boolean): void {
    for (const part of this.parts) part.holder.visible = visible(part.id);
  }

  anyVisible(): boolean {
    return this.parts.some((p) => p.holder.visible);
  }

  setCutMode(cut: boolean): void {
    this.cutMode = cut;
    this.refresh();
  }

  setLod(lod: number): void {
    if (lod === this.lod) return;
    this.lod = lod;
    this.refresh();
  }

  setStudsEnabled(on: boolean): void {
    this.studsOn = on;
    this.refresh();
  }

  /** The proxy used by picking: the coarsest mesh of a part. */
  pickProxy(id: string): Mesh | undefined {
    const part = this.parts.find((p) => p.id === id);
    return part?.meshes.filter((m) => !m.stud).sort((a, b) => b.lod - a.lod)[0]?.mesh;
  }

  private refresh(): void {
    for (const part of this.parts) {
      for (const m of part.meshes) {
        const here = m.lod === this.lod;
        m.mesh.visible = here && (!m.stud || this.studsOn);
        m.mesh.material = this.cutMode ? m.solid : m.ghost;
        if (m.prepass) m.prepass.visible = here && !this.cutMode;
      }
    }
  }

  dispose(): void {
    this.prepassMaterial.dispose();
    for (const part of this.parts) part.holder.removeFromParent();
    this.parts.length = 0;
  }
}
