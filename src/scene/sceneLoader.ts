import type { Texture, WebGLRenderer } from 'three';
import type { QualitySettings } from '../core';
import type { CellTypeId } from '../data/types';
import { DECOR_IDS, isDecorId } from './ambient';
import { AssetLibrary, type AssetRequest } from './assets';
import { CellScene } from './cellScene';
import type { StageData } from './stageTypes';
import { createKtx2Backend, TextureStore, type TextureBackend, type TextureTier } from './textureStore';
import { TextureStreamer, type StreamerHost } from './textureStreamer';

const DECOR_COLORS: Record<string, string> = { cytoskeleton: '#b9a8d8', vesicle: '#f0b8cc' };

/** Where the loading screen is: reading model files, reading the first textures, building the scene. */
export interface LoadProgress {
  phase: 'models' | 'textures' | 'scene';
  /** 0..1 within the phase, measured in bytes. */
  fraction: number;
}

export interface LoaderHost extends Omit<StreamerHost, 'metaOf'> {
  data: StageData;
  baseUrl: string;
  renderer: WebGLRenderer;
  normalMap: Texture;
  settings(): QualitySettings;
  reducedMotion: boolean;
  onFallback(id: string): void;
  /** Tests inject plain textures instead of KTX2. */
  backend?: TextureBackend | null;
}

/** Loads a cell: model files, the lowest texture tier, the assembled scene; then streams the rest in the background. */
export class SceneLoader {
  readonly assets: AssetLibrary;
  readonly store: TextureStore;
  readonly streamer: TextureStreamer;

  constructor(private readonly host: LoaderHost) {
    // A missing decor file (cytoskeleton, vesicle) is replaced quietly: it is only ambience.
    this.assets = new AssetLibrary(host.baseUrl, (id) => (isDecorId(id) ? undefined : host.onFallback(id)));
    let backend: TextureBackend | null = null;
    try {
      backend = host.backend !== undefined ? host.backend : createKtx2Backend(host.renderer, host.baseUrl);
    } catch {
      backend = null; // no KTX2 support: vertex colours stay
    }
    this.store = new TextureStore(host.baseUrl, backend);
    this.streamer = new TextureStreamer(this.store, { ...host, metaOf: (id) => this.assets.metaNow(id) }, host.reducedMotion);
  }

  async load(cellId: CellTypeId, report: (p: LoadProgress) => void): Promise<CellScene> {
    const { data } = this.host;
    const cell = data.cell(cellId);
    const ids = [...new Set([...cell.placements.map((p) => p.organelleId), ...cell.shellOrganelleIds])];
    const requests: AssetRequest[] = ids.map((id) => ({ id, color: data.organelles.get(id)?.color ?? '#c9b48a', shellShape: cell.shell.shape }));
    // Decor (cytoskeleton, vesicles) is ambience: it never delays interactivity and low quality never downloads it.
    const decorNow = this.host.settings().ambient;
    report({ phase: 'models', fraction: 0 });
    const loaded = await this.assets.loadAll(requests, (fraction) => report({ phase: 'models', fraction }));
    report({ phase: 'textures', fraction: 0 });
    const assets = new Map(loaded.map((a) => [a.id, a]));
    const scene = new CellScene({ cell, organelles: data.organelles, assets, normalMap: this.host.normalMap, quality: this.host.settings() });
    await this.streamer.prime(ids, (fraction) => report({ phase: 'textures', fraction }));
    report({ phase: 'scene', fraction: 0.5 });
    this.streamer.applyKnown(scene);
    report({ phase: 'scene', fraction: 1 });
    if (decorNow) void this.ensureDecor(scene);
    return scene;
  }

  /** Loads the decor assets (and their low textures) for a scene that does not have them yet, in the background. */
  async ensureDecor(scene: CellScene): Promise<void> {
    if (scene.hasDecor()) return;
    const requests = DECOR_IDS.map((id) => ({ id, color: DECOR_COLORS[id] ?? '#cccccc' }));
    const loaded = await this.assets.loadAll(requests);
    await this.streamer.prime([...DECOR_IDS]);
    scene.addDecor(new Map(loaded.map((a) => [a.id, a])));
    this.streamer.applyKnown(scene);
    void this.streamer.stream();
    this.host.invalidate();
  }

  /** Reloads every texture of the live scenes (their GPU copies are gone after a context loss). */
  reloadTextures(): Promise<void> {
    return this.streamer.reload();
  }

  /** Bytes of textures on the GPU (estimate from the compressed sizes). */
  get textureBytes(): number {
    return this.store.estimatedBytes;
  }

  targetTier(): TextureTier {
    return this.host.targetTier();
  }

  dispose(): void {
    this.store.dispose();
    this.assets.dispose();
  }
}
