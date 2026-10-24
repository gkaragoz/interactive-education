import { BoxGeometry, Group, Mesh } from 'three';
import type { ModuleContext, ModuleLabel, ModuleScene } from '../../scene';
import type { TrackEnv, TrackRuntime } from './types';

/** Radius (scene units) the stage should frame for each track at t = 0: it also sets the camera limits. */
const FRAME_RADIUS: Record<string, number> = { 'dna-yapisi': 9, replikasyon: 12, transkripsiyon: 12, translasyon: 12, mutasyon: 11 };

async function buildTrack(id: string, env: TrackEnv): Promise<TrackRuntime> {
  switch (id) {
    case 'replikasyon':
      return (await import('./tracks/replikasyon')).createReplikasyon(env);
    case 'transkripsiyon':
      return (await import('./tracks/transkripsiyon')).createTranskripsiyon(env);
    case 'translasyon':
      return (await import('./tracks/translasyon')).createTranslasyon(env);
    case 'mutasyon':
      return (await import('./tracks/mutasyon')).createMutasyon(env);
    default:
      return (await import('./tracks/yapi')).createYapi(env);
  }
}

/** Builds the scene of one track. Every pose is a pure function of the time handed to `seek`. */
export async function createDnaScene(ctx: ModuleContext): Promise<ModuleScene> {
  // the painted KTX2 textures of the module's own assets (nucleotide, tRNA, polymerases...) improve close-ups
  ctx.assets.moduleTextures = true;
  const root = new Group();
  root.name = 'dna-protein';
  // invisible box so the stage frames a sensible region (camera limits come from the root's bounds at t = 0)
  const r = FRAME_RADIUS[ctx.trackId] ?? 10;
  const frame = new Mesh(new BoxGeometry(2 * r, 1.4 * r, 2 * r * 0.4));
  frame.visible = false;
  root.add(frame);

  const env: TrackEnv = { ctx, root, lib: ctx.assets.materials, level: ctx.level, ileri: ctx.level === 'ileri', options: { ...ctx.options } };
  const track = await buildTrack(ctx.trackId, env);
  let posed = Number.NaN;
  const clampT = (t: number): number => Math.min(Math.max(t, 0), track.duration);
  const seek = (t: number): void => {
    const tt = clampT(t);
    track.seek(tt);
    posed = tt;
  };
  seek(0);
  return {
    root,
    duration: track.duration,
    seek,
    cameraAt: (t) => track.cameraAt(clampT(t)),
    labelsAt: (t): ModuleLabel[] => {
      const tt = clampT(t);
      if (tt === posed) return track.labelsAt(tt);
      // labels read the poses of the last seek: pose at tt for a moment, then restore
      const keep = posed;
      track.seek(tt);
      const labels = track.labelsAt(tt);
      if (Number.isFinite(keep)) track.seek(keep);
      posed = keep;
      return labels;
    },
    chartAt: (t) => track.chartAt(clampT(t)),
    setOptions: (o) => {
      track.setOptions?.({ ...o });
      if (Number.isFinite(posed)) track.seek(posed);
    },
    dispose: () => {
      track.dispose();
      frame.geometry.dispose();
      root.removeFromParent();
    },
  };
}
