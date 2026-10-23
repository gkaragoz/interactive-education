import { Group } from 'three';
import type { ModuleContext, ModuleScene } from '../../scene';
import { createEklem } from './eklem';
import { createKasilma } from './kasilma';
import { createKasilmaTemel } from './temel';

export interface TrackRig {
  duration: number;
  seek(t: number): void;
  cameraAt: NonNullable<ModuleScene['cameraAt']>;
  labelsAt(t: number): ReturnType<NonNullable<ModuleScene['labelsAt']>>;
  chartAt(t: number): Record<string, number>;
  dispose(): void;
}

/** Builds the scene of one track. Everything moves only through `seek(t)`, a pure function of time. */
export async function createMuscleScene(ctx: ModuleContext): Promise<ModuleScene> {
  const root = new Group();
  root.name = `muscle-${ctx.trackId}`;
  const rig = ctx.trackId === 'kasilma' ? (ctx.level === 'temel' ? createKasilmaTemel(ctx, root) : createKasilma(ctx, root)) : ctx.trackId === 'eklem-hareketi' ? createEklem(ctx, root) : null;
  if (!rig) throw new Error(`Unknown muscle track: ${ctx.trackId}`);
  rig.seek(0);
  return {
    root,
    duration: rig.duration,
    seek: (t) => rig.seek(Math.min(Math.max(t, 0), rig.duration)),
    cameraAt: (t) => rig.cameraAt(Math.min(Math.max(t, 0), rig.duration)),
    labelsAt: (t) => (ctx.quality === 'low' ? rig.labelsAt(t).slice(0, 5) : rig.labelsAt(t)),
    chartAt: (t) => rig.chartAt(Math.min(Math.max(t, 0), rig.duration)),
    dispose: () => {
      rig.dispose();
      root.removeFromParent();
    },
  };
}
