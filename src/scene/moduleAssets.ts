import { Color, DynamicDrawUsage, Group, InstancedMesh, Matrix4, Mesh, type BufferGeometry, type Object3D, type Plane } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { QualityName } from '../core';
import { extractAsset } from './assets';
import type { AssetMeta, OrganelleAsset } from './assetTypes';
import { MaterialLibrary } from './materials';
import { makePlaceholderAsset } from './placeholders';
import type { Texture } from 'three';

/** Instanced copies of one asset: per-instance matrices and tints (through `instanceColor`). */
export interface InstanceSet {
  readonly group: Group;
  readonly count: number;
  setMatrix(index: number, matrix: Matrix4): void;
  setTint(index: number, color: Color | string | number): void;
  setVisible(index: number, visible: boolean): void;
  /** Call once after changing matrices or tints in a `seek`. */
  commit(): void;
  dispose(): void;
}

const HIDDEN = new Matrix4().makeScale(0, 0, 0);

/**
 * Loads a module's GLBs and hands out clones that share geometry and the painted material library. The same contract
 * as organelle assets: a missing or broken file is replaced by a coloured primitive (and reported once), so a module
 * can be developed before its models exist. Everything it created is disposed with `dispose()`.
 */
export class ModuleAssets {
  readonly materials: MaterialLibrary;
  private readonly loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  private readonly cache = new Map<string, Promise<OrganelleAsset>>();
  private readonly sets: InstanceSet[] = [];
  private readonly fallbacks = new Set<string>();

  constructor(
    private readonly baseUrl: string,
    private readonly quality: QualityName,
    normalMap: Texture,
    clipPlane: Plane,
    private readonly onFallback?: (id: string) => void,
  ) {
    this.materials = new MaterialLibrary(normalMap, clipPlane);
  }

  /** The loaded asset (geometry, LODs, size); a placeholder when the file is missing. `color` tints the placeholder. */
  asset(id: string, color = '#c9b48a'): Promise<OrganelleAsset> {
    let promise = this.cache.get(id);
    if (!promise) {
      promise = this.fetch(id, color);
      this.cache.set(id, promise);
    }
    return promise;
  }

  private async fetch(id: string, color: string): Promise<OrganelleAsset> {
    const base = `${this.baseUrl}models/modules/${id}`;
    try {
      const meta = await fetch(`${base}.meta.json`).then((r) => (r.ok ? (r.json() as Promise<AssetMeta>) : null)).catch(() => null);
      const gltf = await this.loader.loadAsync(`${base}.glb`);
      const asset = extractAsset(id, gltf.scene, meta);
      if ((asset.lods[0]?.length ?? 0) === 0) throw new Error('GLB has no meshes');
      return asset;
    } catch {
      if (!this.fallbacks.has(id)) {
        this.fallbacks.add(id);
        this.onFallback?.(id);
      }
      return makePlaceholderAsset(id, color);
    }
  }

  private lodIndex(): number {
    return this.quality === 'low' ? 1 : 0;
  }

  /** A clone of the asset as meshes with the shared materials (the geometry is shared, not copied). */
  async loadGlb(id: string, color?: string): Promise<Object3D> {
    const asset = await this.asset(id, color);
    const group = new Group();
    group.name = id;
    for (const part of asset.lods[this.lodIndex()] ?? asset.lods[0] ?? []) {
      const mesh = new Mesh(part.geometry, this.materials.get(id, part.kind));
      mesh.name = part.name;
      mesh.castShadow = part.kind === 'clay';
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }

  /** `count` instanced copies of an asset (one InstancedMesh per part); all start hidden. */
  async instances(id: string, count: number, color?: string): Promise<InstanceSet> {
    const asset = await this.asset(id, color);
    const parts = asset.lods[this.lodIndex()] ?? asset.lods[0] ?? [];
    const group = new Group();
    group.name = `${id}-instances`;
    const meshes: InstancedMesh[] = parts.map((part: { geometry: BufferGeometry; kind: 'clay' | 'gel'; name: string }) => {
      const mesh = new InstancedMesh(part.geometry, this.materials.get(id, part.kind), count);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.castShadow = part.kind === 'clay';
      mesh.renderOrder = part.kind === 'gel' ? 40 : 30;
      for (let i = 0; i < count; i++) {
        mesh.setMatrixAt(i, HIDDEN);
        mesh.setColorAt(i, new Color(1, 1, 1));
      }
      group.add(mesh);
      return mesh;
    });
    const tint = new Color();
    const set: InstanceSet = {
      group,
      count,
      setMatrix: (i, m) => meshes.forEach((mesh) => mesh.setMatrixAt(i, m)),
      setTint: (i, color) => meshes.forEach((mesh) => mesh.setColorAt(i, tint.set(color as Color))),
      setVisible: (i, visible) => {
        if (!visible) meshes.forEach((mesh) => mesh.setMatrixAt(i, HIDDEN));
      },
      commit: () =>
        meshes.forEach((mesh) => {
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }),
      dispose: () => {
        meshes.forEach((mesh) => mesh.dispose());
        group.removeFromParent();
      },
    };
    this.sets.push(set);
    return set;
  }

  dispose(): void {
    for (const set of this.sets) set.dispose();
    this.sets.length = 0;
    for (const promise of this.cache.values()) void promise.then((asset) => asset.dispose());
    this.cache.clear();
    this.materials.dispose();
  }
}
