import type { ModuleContext, ModuleScene } from '../../scene';
import { photoPlan, PHOTO_STATIONS, PHOTO_VARIANTS } from './photo/plan';
import { respPlan, RESP_STATIONS, RESP_VARIANTS } from './resp/plan';
import { fermPlan, FERM_STATIONS, FERM_VARIANTS } from './ferm/plan';
import { chemoPlan, CHEMO_STATIONS, CHEMO_VARIANTS } from './chemo/plan';
import { buildRig, type RigSpec } from './rig';

function specFor(ctx: ModuleContext): RigSpec {
  switch (ctx.trackId) {
    case 'fotosentez':
      return { stations: PHOTO_STATIONS, variants: PHOTO_VARIANTS, plan: (o) => photoPlan(ctx.level, o) };
    case 'hucresel-solunum':
      return { stations: RESP_STATIONS, variants: RESP_VARIANTS, plan: () => respPlan(ctx.level) };
    case 'fermantasyon':
      return { stations: FERM_STATIONS, variants: FERM_VARIANTS, plan: () => fermPlan() };
    case 'kemosentez':
      return { stations: CHEMO_STATIONS, variants: CHEMO_VARIANTS, plan: () => chemoPlan() };
    default:
      throw new Error(`Unknown energy track: ${ctx.trackId}`);
  }
}

/** Builds the scene of one energy track; everything moves only through `seek(t)`. */
export async function createEnergyScene(ctx: ModuleContext): Promise<ModuleScene> {
  const scene = await buildRig(ctx, specFor(ctx));
  scene.seek(0);
  return scene;
}
