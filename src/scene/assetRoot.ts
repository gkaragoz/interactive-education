import { Group, Mesh, type BufferGeometry, type MeshPhysicalMaterial, type Object3D } from 'three';
import type { OrganelleAsset } from './assetTypes';
import type { MaterialLibrary } from './materials';
import type { InstanceSet } from './moduleAssets';

/** What `ModuleAssets` hands to an `AssetRoot` (kept narrow so the root needs no private members). */
export interface AssetRootBackend {
  fetch(id: string, color: string): Promise<OrganelleAsset>;
  meta(id: string): unknown;
  isPlaceholder(id: string): boolean;
  stream(id: string, matId: string): Promise<void>;
  instances(matId: string, asset: OrganelleAsset, count: number): InstanceSet;
  materials: MaterialLibrary;
  lodIndex(): number;
}

/** One mesh part of an asset (geometry plus its surface kind), as `loadGlb` builds meshes from. */
export interface RootPart {
  name: string;
  geometry: BufferGeometry;
  kind: 'clay' | 'gel';
}

export interface LoadedRootAsset {
  asset: OrganelleAsset;
  /** The parts at the quality's LOD (low uses LOD 1 when the asset has one). */
  parts: RootPart[];
  /** The raw `<id>.meta.json` (anchors, liquid ranges, ...), or null. Typed by the caller. */
  meta: unknown;
  /** The file was missing or broken: the parts are the framework's primitive stand-in. */
  placeholder: boolean;
}

/**
 * An asset folder next to `models/modules`, e.g. `ctx.assets.withRoot('lab')` for `public/models/lab/` with textures in
 * `public/textures/lab/<id>/<tier>/`. Materials live in the shared library under `matId(id)` (`<dir>-<id>`), so
 * several folders never collide; the KTX2 tiers stream in by quality (lowest first) as soon as an asset is loaded.
 */
export class AssetRoot {
  private readonly cache = new Map<string, Promise<LoadedRootAsset>>();
  private readonly resolved = new Map<string, LoadedRootAsset>();
  private disposed = false;

  constructor(
    readonly dir: string,
    private readonly backend: AssetRootBackend,
  ) {}

  /** Key of an asset in `ctx.assets.materials` (use it to tweak colours via `material(id, kind)`). */
  matId(id: string): string {
    return `${this.dir}-${id}`;
  }

  get materials(): MaterialLibrary {
    return this.backend.materials;
  }

  material(id: string, kind: 'clay' | 'gel'): MeshPhysicalMaterial {
    return this.backend.materials.get(this.matId(id), kind);
  }

  /** Loads (once) an asset: geometry parts, raw meta and the placeholder flag. Starts the texture streaming. */
  load(id: string, color = '#d9e8f0'): Promise<LoadedRootAsset> {
    let promise = this.cache.get(id);
    if (!promise) {
      promise = this.backend.fetch(id, color).then((asset) => {
        const lod = this.backend.lodIndex();
        const parts = (asset.lods[lod] ?? asset.lods[0] ?? []).map((p) => ({ name: p.name, geometry: p.geometry, kind: p.kind }));
        const loaded: LoadedRootAsset = { asset, parts, meta: this.backend.meta(id), placeholder: this.backend.isPlaceholder(id) };
        this.resolved.set(id, loaded);
        if (!this.disposed) void this.backend.stream(id, this.matId(id));
        return loaded;
      });
      this.cache.set(id, promise);
    }
    return promise;
  }

  /** The asset when it has been loaded already (after `preload`), else undefined. */
  loadedNow(id: string): LoadedRootAsset | undefined {
    return this.resolved.get(id);
  }

  async preload(ids: Iterable<string>): Promise<void> {
    await Promise.all([...new Set(ids)].map((id) => this.load(id)));
  }

  /** A clone as a Group of meshes (shared geometry and library materials); part names are kept. */
  async loadGlb(id: string, color?: string): Promise<Object3D> {
    const { parts } = await this.load(id, color);
    const group = new Group();
    group.name = id;
    for (const part of parts) {
      const mesh = new Mesh(part.geometry, this.material(id, part.kind));
      mesh.name = part.name;
      mesh.castShadow = part.kind === 'clay';
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }

  /** `count` instanced copies, all hidden until posed. */
  async instances(id: string, count: number, color?: string): Promise<InstanceSet> {
    return this.instancesFrom(id, (await this.load(id, color)).parts, count);
  }

  /** Instanced copies of custom parts (renamed or filtered ones) with this asset's materials. */
  instancesFrom(id: string, parts: readonly RootPart[], count: number): InstanceSet {
    void this.backend.stream(id, this.matId(id));
    const asset = { id, lods: [[...parts], [...parts], [...parts]], dispose: () => undefined } as unknown as OrganelleAsset;
    return this.backend.instances(this.matId(id), asset, count);
  }

  dispose(): void {
    this.disposed = true;
    this.cache.clear();
    this.resolved.clear();
  }
}
