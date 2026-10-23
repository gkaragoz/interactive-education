import type { BufferGeometry } from 'three';
import type { SurfaceKind } from './materials';

/** One mesh of an organelle at one LOD, already baked into the organelle's local space. */
export interface AssetPart {
  name: string;
  geometry: BufferGeometry;
  kind: SurfaceKind;
}

/** A loaded (or procedurally substituted) organelle: three LODs of parts plus size data for layout and framing. */
export interface OrganelleAsset {
  id: string;
  /** Index 0 = most detailed. Always three entries; a missing LOD repeats the nearest one. */
  lods: AssetPart[][];
  /** Radius of the bounding sphere around the origin, scene units (µm). */
  boundsRadius: number;
  /** Half extents of the bounding box (used to fit shells to the cell shape). */
  halfExtents: [number, number, number];
  /** True when built from primitives because the GLB was missing or failed. */
  placeholder: boolean;
  /** The asset's meta.json when it had one (texture tiers, byte sizes). */
  meta: AssetMeta | null;
  dispose(): void;
}

/** Texture tiers listed in an asset's meta.json (contract v2): file sizes drive the loading progress. */
export interface TextureTierInfo {
  bytes: number;
  size: number;
  /** Files of the tier: `{ name: 'clay_albedo.ktx2', size, bytes, codec }` (plain names are accepted too). */
  maps: (string | { name: string; bytes?: number; size?: number })[];
}

export interface AssetMeta {
  id: string;
  /** GLB size in bytes (used for the byte-based loading progress). */
  bytes?: number;
  textures?: { tiers: Partial<Record<'low' | 'medium' | 'high', TextureTierInfo>> };
  boundsRadius: number;
  bboxMin: [number, number, number];
  bboxMax: [number, number, number];
}

export function disposeAsset(asset: OrganelleAsset): void {
  const seen = new Set<BufferGeometry>();
  for (const lod of asset.lods) {
    for (const part of lod) {
      if (seen.has(part.geometry)) continue;
      seen.add(part.geometry);
      part.geometry.dispose();
    }
  }
}
