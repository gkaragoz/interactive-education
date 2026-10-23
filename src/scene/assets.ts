import { Color, Float32BufferAttribute, type BufferGeometry, type Material, type Mesh, type Object3D, type Texture } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { AssetMeta, AssetPart, OrganelleAsset } from './assetTypes';
import { disposeAsset } from './assetTypes';
import type { SurfaceKind } from './materials';
import { makePlaceholderAsset, type ShellShape } from './placeholders';

/** Size assumed for an asset without meta.json when computing progress. */
const FALLBACK_BYTES = 300_000;

export interface AssetRequest {
  id: string;
  /** Colour used when the asset has to be replaced by a primitive. */
  color: string;
  /** Outline of the cell shell, only used for shell placeholders. */
  shellShape?: ShellShape;
}

function disposeMaterial(material: Material): void {
  for (const value of Object.values(material)) {
    if (value && (value as Texture).isTexture) (value as Texture).dispose();
  }
  material.dispose();
}

function lodIndexOf(node: Object3D): number {
  for (let o: Object3D | null = node; o; o = o.parent) {
    const m = /^LOD([0-2])$/.exec(o.name);
    if (m) return Number(m[1]);
  }
  return -1;
}

/** Pushes vertex colours toward richer saturation (the baked colours are painterly pastel); alpha is left alone. */
export function enrichColors(geometry: BufferGeometry, saturation: number, lightness = 1): void {
  const attr = geometry.getAttribute('color');
  if (!attr) return;
  const c = new Color();
  const hsl = { h: 0, s: 0, l: 0 };
  for (let i = 0; i < attr.count; i++) {
    c.setRGB(attr.getX(i), attr.getY(i), attr.getZ(i));
    c.getHSL(hsl);
    c.setHSL(hsl.h, Math.min(1, hsl.s * saturation), Math.min(1, hsl.l * lightness));
    attr.setXYZ(i, c.r, c.g, c.b);
  }
  attr.needsUpdate = true;
}

/** Turns a parsed GLB into AssetParts per LOD, baking node transforms into the geometry. */
export function extractAsset(id: string, root: Object3D, meta: AssetMeta | null): OrganelleAsset {
  root.updateMatrixWorld(true);
  const lods: AssetPart[][] = [[], [], []];
  const loose: AssetPart[] = [];
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const geometry: BufferGeometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);
    if (!geometry.getAttribute('color')) {
      const count = geometry.getAttribute('position').count;
      geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3));
    } else {
      enrichColors(geometry, 1.3, 0.97);
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const kind: SurfaceKind = materials.some((m) => /_gel$/.test(m.name)) ? 'gel' : 'clay';
    const part: AssetPart = { name: mesh.name, geometry, kind };
    const lod = lodIndexOf(mesh);
    (lod >= 0 ? lods[lod] : loose)?.push(part);
    for (const m of materials) disposeMaterial(m);
  });
  if (!lods[0]?.length) lods[0] = loose;
  // A missing LOD reuses the nearest more detailed one.
  for (let i = 1; i < 3; i++) if (!lods[i]?.length) lods[i] = lods[i - 1] ?? [];

  let radius = meta?.boundsRadius ?? 0;
  let half: [number, number, number] = [0, 0, 0];
  if (meta) {
    half = [0, 1, 2].map((a) => Math.max(Math.abs(meta.bboxMin[a] ?? 0), Math.abs(meta.bboxMax[a] ?? 0))) as [number, number, number];
  }
  // Always measure the real geometry too: if an asset is not centred on its origin the metadata alone would let
  // neighbours poke into it. The larger of the two wins.
  {
    for (const part of lods[0] ?? []) {
      part.geometry.computeBoundingSphere();
      part.geometry.computeBoundingBox();
      radius = Math.max(radius, (part.geometry.boundingSphere?.radius ?? 0) + (part.geometry.boundingSphere?.center.length() ?? 0));
      const b = part.geometry.boundingBox;
      if (b) half = [Math.max(half[0], Math.abs(b.min.x), Math.abs(b.max.x)), Math.max(half[1], Math.abs(b.min.y), Math.abs(b.max.y)), Math.max(half[2], Math.abs(b.min.z), Math.abs(b.max.z))];
    }
  }
  const asset: OrganelleAsset = { id, lods, boundsRadius: radius, halfExtents: half, placeholder: false, meta, dispose: () => disposeAsset(asset) };
  return asset;
}

/** Loads organelle GLBs once, falls back to procedural placeholders, and owns the geometries it hands out. */
export class AssetLibrary {
  private readonly cache = new Map<string, Promise<OrganelleAsset>>();
  private readonly loaded: OrganelleAsset[] = [];
  private readonly metas = new Map<string, Promise<AssetMeta | null>>();
  private readonly metaValues = new Map<string, AssetMeta>();
  private readonly done = new Set<string>();
  private readonly received = new Map<string, number>();
  private readonly listeners = new Set<() => void>();
  private readonly loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

  constructor(
    private readonly baseUrl: string,
    /** Called once per asset that had to be replaced by a primitive. */
    private readonly onFallback?: (id: string) => void,
  ) {}

  load(req: AssetRequest): Promise<OrganelleAsset> {
    let promise = this.cache.get(req.id);
    if (!promise) {
      promise = this.fetchAsset(req).then((asset) => {
        this.loaded.push(asset);
        this.done.add(req.id);
        this.notify();
        return asset;
      });
      this.cache.set(req.id, promise);
    }
    return promise;
  }

  /** Meta that has already been fetched (sync); null when unknown or missing. */
  metaNow(id: string): AssetMeta | null {
    return this.metaValues.get(id) ?? null;
  }

  /** Meta of an asset (null when there is none); cached. */
  meta(id: string): Promise<AssetMeta | null> {
    let promise = this.metas.get(id);
    if (!promise) {
      promise = this.fetchMeta(`${this.baseUrl}models/organelles/${id}.meta.json`).then((meta) => {
        if (meta) this.metaValues.set(id, meta);
        return meta;
      });
      this.metas.set(id, promise);
    }
    return promise;
  }

  /**
   * Loads many assets and reports progress 0..1 by bytes: the sizes come from the meta files, the received bytes from
   * the loader's progress events; assets that are already loaded count as complete.
   */
  async loadAll(reqs: AssetRequest[], onProgress?: (fraction: number) => void): Promise<OrganelleAsset[]> {
    const metas = await Promise.all(reqs.map((r) => this.meta(r.id)));
    const sizes = new Map(reqs.map((r, i) => [r.id, metas[i]?.bytes ?? FALLBACK_BYTES]));
    const total = [...sizes.values()].reduce((a, b) => a + b, 0) || 1;
    const report = (): void => {
      let got = 0;
      for (const [id, size] of sizes) got += this.done.has(id) ? size : Math.min(this.received.get(id) ?? 0, size);
      onProgress?.(Math.min(1, got / total));
    };
    this.listeners.add(report);
    try {
      report();
      return await Promise.all(reqs.map((r) => this.load(r)));
    } finally {
      this.listeners.delete(report);
    }
  }

  dispose(): void {
    for (const asset of this.loaded) asset.dispose();
    this.loaded.length = 0;
    this.cache.clear();
    this.metas.clear();
    this.done.clear();
    this.received.clear();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  private async fetchAsset(req: AssetRequest): Promise<OrganelleAsset> {
    const base = `${this.baseUrl}models/organelles/${req.id}`;
    try {
      const meta = await this.meta(req.id);
      const gltf = await this.loader.loadAsync(`${base}.glb`, (ev) => {
        this.received.set(req.id, ev.loaded);
        this.notify();
      });
      const asset = extractAsset(req.id, gltf.scene, meta);
      if ((asset.lods[0]?.length ?? 0) === 0) throw new Error('GLB has no meshes');
      return asset;
    } catch {
      this.onFallback?.(req.id);
      return makePlaceholderAsset(req.id, req.color, req.shellShape);
    }
  }

  private async fetchMeta(url: string): Promise<AssetMeta | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const meta = (await res.json()) as AssetMeta;
      return typeof meta.boundsRadius === 'number' && Array.isArray(meta.bboxMin) && Array.isArray(meta.bboxMax) ? meta : null;
    } catch {
      return null;
    }
  }
}
