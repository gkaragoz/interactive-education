import { Color, DynamicDrawUsage, Group, InstancedMesh, Matrix4, Mesh, type BufferGeometry, type Object3D, type Plane } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { QualityName } from '../core';
import { extractAsset } from './assets';
import type { AssetMeta, OrganelleAsset } from './assetTypes';
import { MaterialLibrary } from './materials';
import { makePlaceholderAsset } from './placeholders';
import type { Texture, WebGLRenderer } from 'three';
import { AssetRoot, type AssetRootBackend } from './assetRoot';
import { createKtx2Backend, pickTier, TextureStore, tiersOf } from './textureStore';

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
  private readonly organelleCache = new Map<string, Promise<OrganelleAsset>>();
  private readonly metas = new Map<string, AssetMeta | null>();
  private readonly streaming = new Set<string>();
  private readonly placeholders = new Set<string>();
  private readonly roots = new Map<string, AssetRoot>();
  private store: TextureStore | null = null;
  private invalidate: () => void = () => undefined;
  private disposed = false;
  /** Also paint the module's own GLBs (public/textures/modules/<id>); off by default, see `enableTextures`. */
  moduleTextures = false;

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
      promise = this.fetch(id, color).then((asset) => {
        if (this.moduleTextures) void this.streamTextures(id, 'modules');
        return asset;
      });
      this.cache.set(id, promise);
    }
    return promise;
  }

  private async fetch(id: string, color: string, dir = 'modules'): Promise<OrganelleAsset> {
    const base = `${this.baseUrl}models/${dir}/${id}`;
    try {
      const meta = await fetch(`${base}.meta.json`).then((r) => (r.ok ? (r.json() as Promise<AssetMeta>) : null)).catch(() => null);
      this.metas.set(`${dir}/${id}`, meta);
      const gltf = await this.loader.loadAsync(`${base}.glb`);
      const asset = extractAsset(id, gltf.scene, meta);
      if ((asset.lods[0]?.length ?? 0) === 0) throw new Error('GLB has no meshes');
      return asset;
    } catch {
      this.placeholders.add(`${dir}/${id}`);
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
    return this.makeInstances(id, await this.asset(id, color), count);
  }

  /**
   * The explorer's painted organelle (`public/models/organelles/<id>.glb`, e.g. mitochondrion, chloroplast, nucleus,
   * golgi, rough-er, lysosome) as a clone sharing the library materials. Its KTX2 textures stream in by quality, like
   * in the explorer: the lowest tier first, then the preset's tier, swapped in on the materials already in the scene.
   * Needs `enableTextures` (the host calls it); without KTX2 support the vertex-colour look stays.
   */
  async organelle(id: string, color = '#c9b48a'): Promise<Object3D> {
    const asset = await this.organelleAsset(id, color);
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

  /** `count` instanced copies of a painted organelle (see `organelle`). */
  async organelleInstances(id: string, count: number, color?: string): Promise<InstanceSet> {
    return this.makeInstances(id, await this.organelleAsset(id, color ?? '#c9b48a'), count);
  }

  /** Turns on painted-texture streaming for `organelle()` assets; `invalidate` redraws when a texture swaps in. */
  enableTextures(renderer: WebGLRenderer, invalidate: () => void): void {
    this.invalidate = invalidate;
    try {
      this.store = new TextureStore(this.baseUrl, createKtx2Backend(renderer, this.baseUrl));
    } catch {
      this.store = null;
    }
  }

  private organelleAsset(id: string, color: string): Promise<OrganelleAsset> {
    let promise = this.organelleCache.get(id);
    if (!promise) {
      promise = this.fetch(id, color, 'organelles').then((asset) => {
        void this.streamTextures(id, 'organelles');
        return asset;
      });
      this.organelleCache.set(id, promise);
    }
    return promise;
  }

  /**
   * `dir` 'organelles' reads textures/<id>/..., any other root (modules, lab) reads textures/<dir>/<id>/... (the store's
   * id carries the folder). The maps go on the library material `matId` (default: the asset id).
   */
  private async streamTextures(id: string, dir: string, matId = id): Promise<void> {
    const store = this.store;
    const meta = this.metas.get(`${dir}/${id}`) ?? null;
    const sid = dir === 'organelles' ? id : `${dir}/${id}`;
    if (!store?.enabled || !meta || this.streaming.has(sid)) return;
    this.streaming.add(sid);
    const tiers = tiersOf(meta);
    const first = tiers[0];
    const target = pickTier(meta, this.quality);
    if (!first) return;
    const apply = (t: Awaited<ReturnType<TextureStore['load']>>, fade: boolean): void => {
      if (!t || this.disposed) return;
      this.materials.applyMaps(matId, 'clay', t.clay, fade);
      this.materials.applyMaps(matId, 'gel', t.gel, fade);
      this.invalidate();
    };
    apply(await store.load(sid, meta, first), false);
    if (target && target !== first && !this.disposed) {
      apply(await store.load(sid, meta, target), false);
      store.release(sid, first);
    }
  }

  /**
   * Another asset folder (`public/models/<dir>/`, textures in `public/textures/<dir>/<id>/<tier>/`), e.g. `withRoot('lab')`.
   * Same loading, placeholder fallback, KTX2 streaming and shared materials as the module assets; see `AssetRoot`.
   */
  withRoot(dir: string): AssetRoot {
    let root = this.roots.get(dir);
    if (!root) {
      const backend: AssetRootBackend = {
        fetch: (id, color) => this.fetch(id, color, dir),
        meta: (id) => this.metas.get(`${dir}/${id}`) ?? null,
        isPlaceholder: (id) => this.placeholders.has(`${dir}/${id}`),
        stream: (id, matId) => this.streamTextures(id, dir, matId),
        instances: (matId, asset, count) => this.makeInstances(matId, asset, count),
        materials: this.materials,
        lodIndex: () => this.lodIndex(),
      };
      root = new AssetRoot(dir, backend);
      this.roots.set(dir, root);
    }
    return root;
  }

  private makeInstances(id: string, asset: OrganelleAsset, count: number): InstanceSet {
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
    this.disposed = true;
    for (const promise of [...this.cache.values(), ...this.organelleCache.values()]) void promise.then((asset) => asset.dispose());
    this.cache.clear();
    this.organelleCache.clear();
    for (const root of this.roots.values()) root.dispose();
    this.roots.clear();
    this.store?.dispose();
    this.materials.dispose();
  }
}
