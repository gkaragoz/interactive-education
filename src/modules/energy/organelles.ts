import type { Matrix4, Object3D } from 'three';
import type { ModuleContext } from '../../scene';

export interface OrganelleOptions {
  /** Kept for call sites: the library decides the look and the detail level now. */
  lod?: number;
  gelOpacity?: number;
  skin?: 'glass' | 'glossy';
}

export interface OrganelleSet {
  group: Object3D;
  setMatrix(i: number, m: Matrix4): void;
  hide(i: number): void;
  commit(): void;
  dispose(): void;
}

/** `count` instanced copies of the explorer's painted organelle through the framework API (shared materials, KTX2 tiers streamed in by quality). */
export async function organelleInstances(ctx: ModuleContext, id: string, count: number, _o?: OrganelleOptions, _materialId?: string): Promise<OrganelleSet> {
  const set = await ctx.assets.organelleInstances(id, count);
  return { group: set.group, setMatrix: (i, m) => set.setMatrix(i, m), hide: (i) => set.setVisible(i, false), commit: () => set.commit(), dispose: () => set.dispose() };
}
