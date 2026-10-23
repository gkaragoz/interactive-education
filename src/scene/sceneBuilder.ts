import { shortName } from '../core';
import type { OrganelleInfo } from '../data/types';
import type { CellScene } from './cellScene';
import type { LabelSpec } from './labels';

/** One leader label per shell part and organelle of the cell. */
export function labelSpecs(scene: CellScene, organelles: ReadonlyMap<string, OrganelleInfo>): LabelSpec[] {
  const ids = [...new Set([...scene.cell.shellOrganelleIds, ...scene.cell.placements.map((p) => p.organelleId)])];
  return ids.flatMap((id) => {
    const info = organelles.get(id);
    return info ? [{ id, text: shortName(info.nameTr), color: info.color }] : [];
  });
}
