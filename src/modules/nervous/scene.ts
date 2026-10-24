import { Group } from 'three';
import type { ModuleContext, ModuleScene } from '../../scene';
import { createKit, type Kit, type TrackRig } from './kit';
import { createAxon } from './action/axon';
import { overviewFor } from './overviews';
import { withOverview } from './overview';
import { createReflex } from './reflex/reflex';
import { createSynapse } from './synapse/synapse';

type Factory = (kit: Kit) => TrackRig | Promise<TrackRig>;
const FACTORIES: Record<string, Factory> = {
  'refleks-yayi': createReflex,
  'aksiyon-potansiyeli': createAxon,
  sinaps: createSynapse,
};

/** Builds the scene of one track. Everything moves only through `seek(t)`, a pure function of time. */
export async function createNervousScene(ctx: ModuleContext): Promise<ModuleScene> {
  const make = FACTORIES[ctx.trackId];
  if (!make) throw new Error(`Unknown nervous track: ${ctx.trackId}`);
  const root = new Group();
  root.name = `nervous-${ctx.trackId}`;
  const kit = createKit(ctx, root);
  const base = await make(kit);
  const spec = overviewFor(ctx.trackId, ctx.level);
  const rig = spec ? await withOverview(kit, base, spec) : base;
  rig.seek(0);
  return {
    root,
    duration: rig.duration,
    seek: (t) => rig.seek(Math.min(Math.max(t, 0), rig.duration)),
    cameraAt: (t) => rig.cameraAt(t),
    labelsAt: (t) => (ctx.quality === 'low' ? [] : rig.labelsAt(t).slice(0, 6)),
    chartAt: (t) => rig.chartAt(t),
    dispose: () => {
      rig.dispose();
      kit.dispose();
    },
  };
}
