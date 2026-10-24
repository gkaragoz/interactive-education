import { Group } from 'three';
import type { ModuleContext, ModuleScene } from '../../scene';
import { createKit, type Kit, type TrackRig } from './kit';
import { createActive } from './tracks/active';
import { createDiffusion } from './tracks/diffusion';
import { createEndo } from './tracks/endo';
import { createFacilitated } from './tracks/facilitated';
import { createOsmosis } from './tracks/osmosis';

type Factory = (kit: Kit) => TrackRig | Promise<TrackRig>;
const FACTORIES: Record<string, Factory> = {
  difuzyon: createDiffusion,
  'kolaylastirilmis-difuzyon': createFacilitated,
  ozmoz: createOsmosis,
  'aktif-tasima': createActive,
  'endositoz-ekzositoz': createEndo,
};

/** Builds the scene of one track. Everything moves only through `seek(t)`, a pure function of time. */
export async function createMembraneScene(ctx: ModuleContext): Promise<ModuleScene> {
  const make = FACTORIES[ctx.trackId];
  if (!make) throw new Error(`Unknown membrane-transport track: ${ctx.trackId}`);
  const root = new Group();
  root.name = `membrane-transport-${ctx.trackId}`;
  ctx.assets.moduleTextures = true;
  const kit = createKit(ctx, root);
  const rig = await make(kit);
  rig.seek(0);
  return {
    root,
    duration: rig.duration,
    seek: (t) => {
      const c = Math.min(Math.max(t, 0), rig.duration);
      kit.tick(c);
      rig.seek(c);
    },
    cameraAt: (t) => rig.cameraAt(t),
    labelsAt: (t) => {
      if (ctx.quality === 'low') return [];
      // keep every anchor in the free band between the toolbar and the bottom panels (proportional to the camera distance)
      const cam = rig.cameraAt(t);
      const d = Math.hypot(cam.position[0] - cam.target[0], cam.position[1] - cam.target[1], cam.position[2] - cam.target[2]);
      const top = cam.target[1] + 0.11 * d;
      const bottom = cam.target[1] - 0.145 * d;
      return rig.labelsAt(t).slice(0, 6).map((l) => ({ ...l, world: [l.world[0], Math.min(top, Math.max(bottom, l.world[1])), l.world[2]] as [number, number, number] }));
    },
    chartAt: (t) => rig.chartAt(t),
    setOptions: (o) => rig.setOptions(o),
    dispose: () => {
      rig.dispose();
      kit.dispose();
    },
  };
}
