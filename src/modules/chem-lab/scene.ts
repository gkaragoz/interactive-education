import type { SimContext, SimScene } from '../../scene';
import { LabAssets } from './labAssets';
import { ALL_ASSETS, ChemLabScene } from './labScene';

/** Builds the 3D bench for the lab host (`LabSimScene`, see scene/simScene.ts). All GLBs are loaded up front. */
export async function createChemLabSim(ctx: SimContext): Promise<SimScene> {
  const assets = new LabAssets(ctx);
  await assets.preload(ALL_ASSETS);
  const scene = new ChemLabScene(ctx, assets);
  scene.loadExperiment(ctx.experimentId);
  return scene;
}
