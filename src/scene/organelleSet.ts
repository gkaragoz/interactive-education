import { Color, Euler, Group, InstancedMesh, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import type { OrganelleAsset } from './assetTypes';
import type { Cutaway } from './cutaway';
import type { PlacedInstance } from './layout';
import type { MaterialLibrary } from './materials';

const FOCUS_COLOR = new Color(1.45, 1.28, 1.08);
const WHITE = new Color(1, 1, 1);
/** Organelles smaller than this (bounds radius, micrometres) get no cut-face cap. */
const CAP_MIN_RADIUS = 1.2;

function triangles(geometry: BufferGeometry): number {
  return (geometry.index ? geometry.index.count : geometry.getAttribute('position').count) / 3;
}

/**
 * All instances of one organelle id. Every part exists once per LOD as an InstancedMesh; each frame the instances are
 * binned into the three LODs (`setLods`), so near instances can be detailed while far ones are cheap. The picked
 * instance is tinted through the instance colour.
 */
export class OrganelleSet {
  readonly id: string;
  readonly instances: PlacedInstance[];
  readonly radius: number;
  private readonly meshes: InstancedMesh[][] = [[], [], []];
  private readonly matrices: Matrix4[];
  private readonly trisPerLod: number[];
  private lods: number[];
  private visible = true;
  private isolateIndex: number | null = null;
  private focusIndex: number | null = null;
  private signature = '';
  private outlineOn = false;
  private cutY: number | null = null;
  private readonly outlines: (InstancedMesh | null)[][] = [[], [], []];

  constructor(
    id: string,
    asset: OrganelleAsset,
    instances: PlacedInstance[],
    private readonly materials: MaterialLibrary,
    cutaway: Cutaway,
    private readonly parent: Group,
  ) {
    this.id = id;
    this.instances = instances;
    this.radius = asset.boundsRadius;
    this.lods = instances.map(() => 2);
    const q = new Quaternion();
    this.matrices = instances.map((inst) =>
      new Matrix4().compose(new Vector3(...inst.position), q.clone().setFromEuler(new Euler(...inst.rotation)), new Vector3(...inst.scale)),
    );
    this.trisPerLod = asset.lods.map((parts) => parts.reduce((n, p) => n + triangles(p.geometry), 0));
    asset.lods.forEach((parts, lodIndex) => {
      parts.forEach((part, partIndex) => {
        const mesh = new InstancedMesh(part.geometry, materials.get(id, part.kind), instances.length);
        mesh.name = `${id}-${part.name}`;
        mesh.count = 0;
        mesh.frustumCulled = false;
        mesh.castShadow = part.kind === 'clay';
        mesh.receiveShadow = true;
        mesh.userData.organelleId = id;
        mesh.renderOrder = part.kind === 'gel' ? 40 : 30;
        parent.add(mesh);
        // Stencil twins always use the coarsest mesh: the cap edge may differ by a pixel, the cost is a fraction.
        const coarse = asset.lods[2]?.[partIndex];
        // Tiny organelles (ribosomes, lysosomes, plasmids) have cross-sections too small to matter: no stencil twins.
        if (asset.boundsRadius >= CAP_MIN_RADIUS) cutaway.register(mesh, id, { twinGeometry: coarse && coarse.kind === part.kind ? coarse.geometry : undefined });
        this.meshes[lodIndex]?.push(mesh);
      });
    });
  }

  /** Triangles drawn per instance at a LOD. */
  trisAt(lod: number): number {
    return this.trisPerLod[Math.min(lod, this.trisPerLod.length - 1)] ?? 0;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.signature = '';
    this.rebuild();
  }

  get isVisible(): boolean {
    return this.visible;
  }

  /** Isolate shows one instance only. */
  get limit(): number | null {
    return this.isolateIndex === null ? null : 1;
  }

  /** Instance indices that can currently be seen (picking and labels use this). */
  visibleIndices(): number[] {
    return this.isolateIndex === null ? this.instances.map((_, i) => i) : [this.isolateIndex];
  }

  setIsolate(index: number | null): void {
    if (index === this.isolateIndex) return;
    this.isolateIndex = index;
    this.signature = '';
    this.rebuild();
  }

  /** Height of the cut plane in the cell's local space (null = no cut). Only instances the plane crosses need cut-face twins. */
  setCut(localY: number | null): void {
    if (localY === this.cutY || (localY !== null && this.cutY !== null && Math.abs(localY - this.cutY) < 0.02)) return;
    this.cutY = localY;
    this.signature = '';
    this.rebuild();
  }

  /** Soft outline around every instance of the selected organelle (created on first use). */
  setOutline(on: boolean): void {
    if (on === this.outlineOn) return;
    this.outlineOn = on;
    if (on) {
      this.meshes.forEach((list, lod) =>
        list.forEach((mesh, k) => {
          if (this.outlines[lod]?.[k] || mesh.material instanceof Array || (mesh.material as { transparent?: boolean }).transparent) return;
          const hull = new InstancedMesh(mesh.geometry, this.materials.outline(), this.instances.length);
          hull.instanceMatrix = mesh.instanceMatrix;
          hull.frustumCulled = false;
          hull.renderOrder = 29;
          this.parent.add(hull);
          (this.outlines[lod] ??= [])[k] = hull;
        }),
      );
    }
    this.signature = '';
    this.rebuild();
  }

  /** The picked instance gets a warm brightness boost; null clears it. */
  setFocus(index: number | null): void {
    if (index === this.focusIndex) return;
    this.focusIndex = index;
    this.signature = '';
    this.rebuild();
  }

  /** LOD (0 = finest) per instance, in instance order. */
  setLods(lods: number[]): void {
    this.lods = lods;
    this.rebuild();
  }

  private rebuild(): void {
    const shown = this.visibleIndices();
    const signature = `${this.visible}|${this.focusIndex}|${this.cutY === null ? 'x' : Math.round(this.cutY * 20)}|${shown.map((i) => `${i}:${this.lods[i] ?? 2}`).join(',')}`;
    if (signature === this.signature) return;
    this.signature = signature;
    for (let lod = 0; lod < 3; lod++) {
      let indices = this.visible ? shown.filter((i) => (this.lods[i] ?? 2) === lod) : [];
      // Instances the cut plane crosses come first in each bin: the stencil twins draw only those.
      const crosses = (i: number): boolean => this.cutY !== null && Math.abs((this.instances[i] as PlacedInstance).position[1] - this.cutY) <= (this.instances[i] as PlacedInstance).radius * 1.02;
      indices = [...indices.filter(crosses), ...indices.filter((i) => !crosses(i))];
      const capCount = indices.filter(crosses).length;
      for (const mesh of this.meshes[lod] ?? []) {
        indices.forEach((instance, slot) => {
          mesh.setMatrixAt(slot, this.matrices[instance] as Matrix4);
          if (this.focusIndex !== null || mesh.instanceColor) mesh.setColorAt(slot, instance === this.focusIndex ? FOCUS_COLOR : WHITE);
        });
        mesh.count = indices.length;
        mesh.userData.capCount = capCount;
        mesh.visible = indices.length > 0;
        mesh.instanceMatrix.needsUpdate = true;
        const hull = this.outlines[lod]?.[this.meshes[lod]?.indexOf(mesh) ?? -1];
        if (hull) {
          hull.count = mesh.count;
          hull.visible = this.outlineOn && mesh.visible;
        }
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  dispose(): void {
    for (const list of this.meshes) for (const mesh of list) mesh.dispose();
    for (const list of this.outlines) for (const hull of list) hull?.removeFromParent();
  }
}
