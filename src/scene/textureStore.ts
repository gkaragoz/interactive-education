import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { NoColorSpace, SRGBColorSpace, type Texture, type WebGLRenderer } from 'three';
import type { QualityName } from '../core';
import type { AssetMeta, TextureTierInfo } from './assetTypes';

/** Texture tier = quality preset: Düşük low, Orta medium, Yüksek high. */
export type TextureTier = QualityName;
export const TIER_ORDER: TextureTier[] = ['low', 'medium', 'high'];

export interface SurfaceMaps {
  albedo: Texture | null;
  normal: Texture | null;
  /** R = ambient occlusion, G = roughness, B = metalness. */
  orm: Texture | null;
}

/** Maps of one asset at one tier; `clay` and `gel` exist only when the asset has that kind of surface. */
export interface AssetTextures {
  id: string;
  tier: TextureTier;
  clay: SurfaceMaps | null;
  gel: SurfaceMaps | null;
}

/** Where compressed textures come from: KTX2 in the app, plain objects in tests. */
export interface TextureBackend {
  load(url: string, role: 'albedo' | 'normal' | 'orm', onProgress?: (loaded: number) => void): Promise<Texture>;
}

const MAX_ANISOTROPY = 8;

/** KTX2 / Basis backend: the transcoder files live in `public/basis`; support is detected from the renderer. */
export function createKtx2Backend(renderer: WebGLRenderer, baseUrl: string): TextureBackend {
  const loader = new KTX2Loader().setTranscoderPath(`${baseUrl}basis/`).detectSupport(renderer);
  const anisotropy = Math.min(MAX_ANISOTROPY, renderer.capabilities.getMaxAnisotropy());
  return {
    load: (url, role, onProgress) =>
      new Promise<Texture>((resolve, reject) => {
        loader.load(
          url,
          (texture) => {
            // glTF orientation: the maps are stored v-down. Albedo is sRGB; normal and ORM are plain data.
            texture.flipY = false;
            texture.colorSpace = role === 'albedo' ? SRGBColorSpace : NoColorSpace;
            texture.anisotropy = anisotropy;
            // Once the GPU has the texture the transcoded mip data on the CPU is dead weight (tens of megabytes at
            // high). A lost WebGL context drops the GPU copy; the stage then reloads textures (`SceneLoader.reloadTextures`).
            texture.onUpdate = (): void => {
              texture.mipmaps = [];
              texture.onUpdate = null;
            };
            resolve(texture);
          },
          (ev) => onProgress?.(ev.loaded),
          reject,
        );
      }),
  };
}

const KINDS = ['clay', 'gel'] as const;
const ROLES: [string, 'albedo' | 'normal' | 'orm'][] = [
  ['albedo', 'albedo'],
  ['normal', 'normal'],
  ['orm', 'orm'],
];

/** Highest tier an asset offers that does not exceed `target` (falls back to its lowest tier); null without textures. */
export function pickTier(meta: AssetMeta | null, target: TextureTier): TextureTier | null {
  const tiers = tiersOf(meta);
  if (tiers.length === 0) return null;
  const allowed = tiers.filter((t) => TIER_ORDER.indexOf(t) <= TIER_ORDER.indexOf(target));
  return allowed.length > 0 ? (allowed[allowed.length - 1] as TextureTier) : (tiers[0] as TextureTier);
}

export function tiersOf(meta: AssetMeta | null): TextureTier[] {
  const info = meta?.textures?.tiers;
  return info ? TIER_ORDER.filter((t) => info[t] !== undefined) : [];
}

/** Texels of every map of a tier (one byte each when block-compressed on the GPU). */
export function gpuBytes(info: TextureTierInfo | undefined): number {
  if (!info) return 0;
  return info.maps.reduce<number>((n, m) => n + ((typeof m === 'string' ? undefined : m.size) ?? info.size) ** 2, 0);
}

/** The next lower tier an asset offers, or null. */
export function lowerTier(meta: AssetMeta | null, tier: TextureTier): TextureTier | null {
  const below = tiersOf(meta).filter((t) => TIER_ORDER.indexOf(t) < TIER_ORDER.indexOf(tier));
  return below.length > 0 ? (below[below.length - 1] as TextureTier) : null;
}

export const tierMeta = (meta: AssetMeta | null, tier: TextureTier): TextureTierInfo | undefined => tierInfo(meta, tier);

function tierInfo(meta: AssetMeta | null, tier: TextureTier): TextureTierInfo | undefined {
  return meta?.textures?.tiers[tier];
}

/** Which surface kinds a tier provides: from its `maps` list when it has one, otherwise clay only. */
function kindsOf(info: TextureTierInfo | undefined): ('clay' | 'gel')[] {
  if (!info) return [];
  if (!info.maps || info.maps.length === 0) return ['clay'];
  const names = info.maps.map((m) => (typeof m === 'string' ? m : m.name));
  return KINDS.filter((k) => names.some((n) => n.startsWith(`${k}_`)));
}

/**
 * Loads and shares textures: one copy per asset and tier no matter how many scenes (cell views, compare) use it.
 * `retainOnly` drops everything no live scene needs, so switching cells does not pile up GPU memory.
 */
export class TextureStore {
  private readonly cache = new Map<string, Promise<AssetTextures | null>>();
  private readonly ready = new Map<string, AssetTextures>();
  private readonly bytes = new Map<string, number>();
  private readonly gpu = new Map<string, number>();

  constructor(
    private readonly baseUrl: string,
    private readonly backend: TextureBackend | null,
  ) {}

  /** False when KTX2 cannot be used: everything keeps its vertex colours. */
  get enabled(): boolean {
    return this.backend !== null;
  }

  /**
   * GPU memory of what is loaded. Basis textures are transcoded to a block-compressed format (BC7, ASTC, ETC2: one byte
   * per texel), plus a third for the mip chain.
   */
  get estimatedBytes(): number {
    let total = 0;
    for (const b of this.gpu.values()) total += b;
    return Math.round(total * 1.33);
  }

  get(id: string, tier: TextureTier): AssetTextures | undefined {
    return this.ready.get(`${id}/${tier}`);
  }

  /** Size in bytes the given tier of an asset will download. */
  sizeOf(meta: AssetMeta | null, tier: TextureTier | null): number {
    return tier ? (tierInfo(meta, tier)?.bytes ?? 0) : 0;
  }

  load(id: string, meta: AssetMeta | null, tier: TextureTier, onProgress?: (loaded: number) => void): Promise<AssetTextures | null> {
    const key = `${id}/${tier}`;
    let promise = this.cache.get(key);
    if (!promise) {
      promise = this.fetch(id, meta, tier, onProgress).then((textures) => {
        if (textures) {
          this.ready.set(key, textures);
          this.bytes.set(key, this.sizeOf(meta, tier));
          this.gpu.set(key, gpuBytes(tierInfo(meta, tier)));
        }
        return textures;
      });
      this.cache.set(key, promise);
    }
    return promise;
  }

  /** Disposes the textures of one asset tier. */
  release(id: string, tier: TextureTier): void {
    const key = `${id}/${tier}`;
    const textures = this.ready.get(key);
    if (textures) disposeTextures(textures);
    this.ready.delete(key);
    this.cache.delete(key);
    this.bytes.delete(key);
    this.gpu.delete(key);
  }

  /** Disposes every texture whose asset id is not in `ids`. */
  retainOnly(ids: ReadonlySet<string>): void {
    for (const key of [...this.ready.keys()]) {
      const [id, tier] = key.split('/') as [string, TextureTier];
      if (!ids.has(id)) this.release(id, tier);
    }
  }

  dispose(): void {
    for (const textures of this.ready.values()) disposeTextures(textures);
    this.ready.clear();
    this.cache.clear();
    this.bytes.clear();
    this.gpu.clear();
  }

  private async fetch(id: string, meta: AssetMeta | null, tier: TextureTier, onProgress?: (loaded: number) => void): Promise<AssetTextures | null> {
    if (!this.backend) return null;
    const kinds = kindsOf(tierInfo(meta, tier));
    if (kinds.length === 0) return null;
    const out: AssetTextures = { id, tier, clay: null, gel: null };
    let received = 0;
    const tasks: Promise<void>[] = [];
    for (const kind of kinds) {
      const maps: SurfaceMaps = { albedo: null, normal: null, orm: null };
      out[kind] = maps;
      for (const [name, role] of ROLES) {
        let last = 0;
        tasks.push(
          this.backend
            .load(`${this.baseUrl}textures/${id}/${tier}/${kind}_${name}.ktx2`, role, (loaded) => {
              received += loaded - last;
              last = loaded;
              onProgress?.(received);
            })
            // One missing map must not lose the others.
            .then((texture) => void (maps[role] = texture))
            .catch(() => undefined),
        );
      }
    }
    await Promise.all(tasks);
    const any = [out.clay, out.gel].some((m) => m && (m.albedo || m.normal || m.orm));
    return any ? out : null;
  }
}

export function disposeTextures(textures: AssetTextures): void {
  for (const maps of [textures.clay, textures.gel]) {
    if (!maps) continue;
    maps.albedo?.dispose();
    maps.normal?.dispose();
    maps.orm?.dispose();
  }
}
