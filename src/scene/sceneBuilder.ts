import { shortName, type QualitySettings } from '../core';
import type { CellTypeId, OrganelleInfo } from '../data/types';
import type { AssetLibrary, AssetRequest } from './assets';
import { CellScene } from './cellScene';
import type { LabelSpec } from './labels';
import type { StageData } from './stageTypes';
import type { Texture } from 'three';

interface BuildContext {
  data: StageData;
  assets: AssetLibrary;
  normalMap: Texture;
  quality: QualitySettings;
}

/** Loads every asset a cell needs (placeholders where a GLB is missing) and assembles the scene. */
export async function buildCellScene(cellId: CellTypeId, ctx: BuildContext, report: (fraction: number) => void): Promise<CellScene> {
  const cell = ctx.data.cell(cellId);
  const ids = [...new Set([...cell.placements.map((p) => p.organelleId), ...cell.shellOrganelleIds])];
  const requests: AssetRequest[] = ids.map((id) => ({
    id,
    color: ctx.data.organelles.get(id)?.color ?? '#c9b48a',
    shellShape: cell.shell.shape,
  }));
  const loaded = await ctx.assets.loadAll(requests, report);
  const assets = new Map(loaded.map((a) => [a.id, a]));
  return new CellScene({ cell, organelles: ctx.data.organelles, assets, normalMap: ctx.normalMap, quality: ctx.quality });
}

/** One leader label per shell part and organelle of the cell. */
export function labelSpecs(scene: CellScene, organelles: ReadonlyMap<string, OrganelleInfo>): LabelSpec[] {
  const ids = [...new Set([...scene.cell.shellOrganelleIds, ...scene.cell.placements.map((p) => p.organelleId)])];
  return ids.flatMap((id) => {
    const info = organelles.get(id);
    return info ? [{ id, text: shortName(info.nameTr), color: info.color }] : [];
  });
}
