import type { AssetMeta } from './assetTypes';
import type { CellScene } from './cellScene';
import { gpuBytes, lowerTier, pickTier, tierMeta, tiersOf, TextureStore, type AssetTextures, type TextureTier } from './textureStore';

export interface StreamerHost {
  scenes(): CellScene[];
  metaOf(id: string): AssetMeta | null;
  targetTier(): TextureTier;
  /** Id of the selected organelle (streamed first), if any. */
  selectedId(): string | null;
  /** Something changed on screen (a texture swapped in). */
  invalidate(): void;
}

const CONCURRENCY = 2;
/** Texture memory the streamer plans for (bytes on the GPU, mip chains included). */
export const GPU_BUDGET = 350 * 1024 * 1024;

/**
 * Progressive textures: `prime` loads the lowest tier of a cell's assets (the loading screen waits for it, so the
 * cell is interactive at once); `stream` then upgrades each asset to the preset's tier in the background, selected
 * and big organelles first, and swaps it in when it is ready. Quality changes call `retarget`.
 */
export class TextureStreamer {
  private readonly applied = new Map<string, AssetTextures>();
  private token = 0;

  constructor(
    private readonly store: TextureStore,
    private readonly host: StreamerHost,
    private readonly reducedMotion: boolean,
  ) {}

  /** Lowest tier of every asset in `ids`; resolves when all are on the GPU-bound materials. `onProgress` gets bytes. */
  async prime(ids: string[], onProgress?: (fraction: number) => void): Promise<void> {
    if (!this.store.enabled) return;
    const jobs = ids.flatMap((id) => {
      const meta = this.host.metaOf(id);
      const tier = tiersOf(meta)[0];
      return tier ? [{ id, meta, tier }] : [];
    });
    const total = jobs.reduce((n, j) => n + this.store.sizeOf(j.meta, j.tier), 0) || 1;
    const got = new Map<string, number>();
    const report = (): void => onProgress?.(Math.min(1, [...got.values()].reduce((a, b) => a + b, 0) / total));
    await Promise.all(
      jobs.map(async (j) => {
        const textures = await this.store.load(j.id, j.meta, j.tier, (loaded) => {
          got.set(j.id, loaded);
          report();
        });
        got.set(j.id, this.store.sizeOf(j.meta, j.tier));
        report();
        if (textures) this.swap(j.id, textures, false);
      }),
    );
  }

  /** Applies what is already loaded to a scene that was just built. */
  applyKnown(scene: CellScene): void {
    const own = new Set(scene.textureIds());
    for (const textures of this.applied.values()) if (own.has(textures.id)) scene.applyTextures(textures, false);
  }

  /** Upgrades (or downgrades) every asset of the live scenes to the target tier, in priority order. */
  async stream(): Promise<void> {
    if (!this.store.enabled) return;
    const run = ++this.token;
    const ids = this.liveIds();
    const size = (id: string): number => this.host.scenes().reduce((n, s) => n + (s.sets.get(id)?.radius ?? 0) * (s.sets.get(id)?.instances.length ?? 0), 0) + (this.host.scenes().some((s) => s.cell.shellOrganelleIds.includes(id)) ? 50 : 0);
    const selected = this.host.selectedId();
    const queue = [...ids].sort((a, b) => (b === selected ? 1e9 : size(b)) - (a === selected ? 1e9 : size(a)));
    // Plan the tiers first: assets in priority order keep the target tier until the memory budget is used up, then step down.
    const plan = new Map<string, TextureTier | null>();
    let planned = 0;
    for (const id of queue) {
      const meta = this.host.metaOf(id);
      let tier = pickTier(meta, this.host.targetTier());
      while (tier && planned + gpuBytes(tierMeta(meta, tier)) * 1.33 > GPU_BUDGET) tier = lowerTier(meta, tier);
      if (tier) planned += gpuBytes(tierMeta(meta, tier)) * 1.33;
      plan.set(id, tier);
    }
    const worker = async (): Promise<void> => {
      for (let id = queue.shift(); id !== undefined && run === this.token; id = queue.shift()) {
        const meta = this.host.metaOf(id);
        const tier = plan.get(id) ?? null;
        const current = this.applied.get(id);
        if (!tier || current?.tier === tier) continue;
        const textures = await this.store.load(id, meta, tier);
        if (textures && run === this.token) this.swap(id, textures, !this.reducedMotion);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }

  /** Forgets everything that is on the GPU (after a lost context) and loads the live scenes' textures again. */
  async reload(): Promise<void> {
    this.token++;
    this.applied.clear();
    this.store.dispose();
    const ids = [...this.liveIds()];
    await this.prime(ids);
    for (const scene of this.host.scenes()) this.applyKnown(scene);
    this.host.invalidate();
    await this.stream();
  }

  /** Frees the textures of assets no live scene uses any more. */
  retain(): void {
    const ids = this.liveIds();
    for (const id of [...this.applied.keys()]) if (!ids.has(id)) this.applied.delete(id);
    this.store.retainOnly(ids);
  }

  private liveIds(): Set<string> {
    return new Set(this.host.scenes().flatMap((scene) => scene.textureIds()));
  }

  private swap(id: string, textures: AssetTextures, fade: boolean): void {
    const previous = this.applied.get(id);
    this.applied.set(id, textures);
    for (const scene of this.host.scenes()) if (scene.textureIds().includes(id)) scene.applyTextures(textures, fade);
    // The old tier is no longer on any material: free it.
    if (previous && previous.tier !== textures.tier) this.store.release(id, previous.tier);
    this.host.invalidate();
  }
}
