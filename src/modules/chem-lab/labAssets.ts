import { Color, Group, Mesh, MeshStandardMaterial, type MeshPhysicalMaterial, type BufferGeometry, type Material } from 'three';
import { createGlassMaterial } from './glass';
import type { AssetRoot, InstanceSet, ModuleAssets, SimContext } from '../../scene';

/**
 * Loader of the lab GLBs (`public/models/lab/`, textures in `public/textures/lab/`) on top of `ctx.assets.withRoot('lab')`:
 * parts get their short names ('glass', 'inner', ...), meta is typed, tinted parts get flat clay materials of our own.
 */
export interface LabMeta {
  id?: string;
  bboxMin: [number, number, number];
  bboxMax: [number, number, number];
  parts?: string[];
  liquid?: { mesh: string; axis: string; yMin: number; yMax: number };
  liquids?: Record<string, { axis: string; yMin: number; yMax: number; x?: number; role?: string }>;
  column?: { mesh: string; yMin: number; yMax: number };
  uvRects?: Record<string, [number, number, number, number]>;
  flameMount?: [number, number, number];
  flameBase?: [number, number, number];
  mountPoint?: [number, number, number];
  buretteOrigin?: [number, number, number];
  holes?: [number, number][];
  plateTop?: [number, number, number];
  panCentre?: [number, number, number];
  ringY?: number;
  funnelOrigin?: [number, number, number];
  shelfTop?: [number, number, number];
  tile?: [number, number];
  capacityMl?: number;
  textures?: { tiers: Partial<Record<'low' | 'medium' | 'high', unknown>> };
}

/** Flat colours for named parts of an asset (e.g. `{ cap: '#c44', label: '#fff' }`). */
export type Tints = Record<string, string | number | Color>;

export interface LabPart {
  name: string;
  geometry: BufferGeometry;
  kind: 'clay' | 'gel';
}
export interface LabAsset {
  id: string;
  parts: LabPart[];
  meta: LabMeta;
  placeholder: boolean;
}

const DEFAULT_META: LabMeta = { bboxMin: [-2, 0, -2], bboxMax: [2, 8, 2] };

export class LabAssets {
  private readonly cache = new Map<string, Promise<LabAsset>>();
  private readonly resolved = new Map<string, LabAsset>();
  private readonly root: AssetRoot;
  private readonly own: Material[] = [];
  private glass: MeshPhysicalMaterial | null = null;

  constructor(private readonly ctx: SimContext) {
    this.root = ctx.assets.withRoot('lab');
  }

  private get assets(): ModuleAssets {
    return this.ctx.assets;
  }

  /** The asset (geometry per part, meta anchors); a primitive stand-in with default anchors when the file is missing. */
  load(id: string, color = '#d9e8f0'): Promise<LabAsset> {
    let promise = this.cache.get(id);
    if (!promise) {
      promise = this.root.load(id, color).then((l) => {
        // mesh names are '<asset id>-<part>': keep only the part ('glass', 'inner', 'display', 'cap', ...)
        const prefix = `${id}-`;
        const parts: LabPart[] = l.parts.map((p) => ({ name: p.name.startsWith(prefix) ? p.name.slice(prefix.length) : p.name, geometry: p.geometry, kind: p.kind }));
        const a: LabAsset = { id, parts, meta: (l.meta as LabMeta | null) ?? DEFAULT_META, placeholder: l.placeholder };
        this.resolved.set(id, a);
        return a;
      });
      this.cache.set(id, promise);
    }
    return promise;
  }

  /** Loads several assets in parallel (behind the loading screen); afterwards `objectNow` / `instancesNow` are synchronous. */
  async preload(ids: Iterable<string>): Promise<void> {
    await Promise.all([...new Set(ids)].map((id) => this.load(id)));
  }

  /** The shared library material of an asset (to tweak its colour), or null. */
  libraryMaterial(id: string, kind: 'clay' | 'gel'): MeshPhysicalMaterial | null {
    return this.root.material(id, kind);
  }

  /** Material key in the shared library (`ctx.assets.materials`). */
  matId = (id: string): string => this.root.matId(id);

  /** A clone of the asset as a Group of meshes (shared geometry, library materials). Part names are kept. */
  async object(id: string, color?: string): Promise<{ group: Group; asset: LabAsset }> {
    return this.build(id, await this.load(id, color));
  }

  /** Synchronous `object` for a preloaded asset; an empty group with default meta otherwise. */
  objectNow(id: string, tints?: Tints): { group: Group; asset: LabAsset } {
    const asset = this.resolved.get(id);
    return asset ? this.build(id, asset, tints) : { group: new Group(), asset: { id, parts: [], meta: DEFAULT_META, placeholder: true } };
  }

  /** Meta of a preloaded asset (default anchors when unknown). */
  metaOf(id: string): LabMeta {
    return this.resolved.get(id)?.meta ?? DEFAULT_META;
  }

  private build(id: string, asset: LabAsset, tints?: Tints): { group: Group; asset: LabAsset } {
    const group = new Group();
    group.name = id;
    for (const part of asset.parts) {
      const tint = tints?.[part.name];
      let material: Material = this.assets.materials.get(this.matId(id), part.kind) as Material;
      if (part.kind === 'gel' && part.name === 'glass') {
        this.glass ??= createGlassMaterial();
        material = this.glass;
      }
      if (tint !== undefined) {
        // tintable parts (caps, labels, balloon) have a neutral albedo: a flat painted-clay colour of our own
        const own = new MeshStandardMaterial({ color: new Color(tint), roughness: 0.52, metalness: 0.02 });
        this.own.push(own);
        material = own;
      }
      const mesh = new Mesh(part.geometry, material);
      mesh.name = part.name;
      mesh.castShadow = part.kind === 'clay';
      mesh.receiveShadow = part.kind === 'clay';
      mesh.renderOrder = part.kind === 'gel' ? 20 : 0;
      group.add(mesh);
    }
    return { group, asset };
  }

  /** Instanced copies (`count`), all hidden until posed. */
  async instances(id: string, count: number, color?: string): Promise<InstanceSet> {
    return this.instancesOf(id, await this.load(id, color), count);
  }

  /** Synchronous `instances` for a preloaded asset (null when it was not preloaded). */
  instancesNow(id: string, count: number): InstanceSet | null {
    const asset = this.resolved.get(id);
    return asset ? this.instancesOf(id, asset, count) : null;
  }

  private instancesOf(id: string, asset: LabAsset, count: number): InstanceSet {
    return this.root.instancesFrom(id, asset.parts, count);
  }

  dispose(): void {
    for (const m of this.own) m.dispose();
    this.own.length = 0;
    this.glass?.dispose();
    this.glass = null;
    this.cache.clear();
    this.root.dispose();
  }
}

/** Geometry of a named part (e.g. 'inner'), or null. */
export const partGeometry = (asset: LabAsset, name: string): BufferGeometry | null => asset.parts.find((p) => p.name === name)?.geometry ?? null;
