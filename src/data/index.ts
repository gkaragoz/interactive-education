import type { CellInfo, CellTypeId, Kazanim, OrganelleInfo, Source } from './types';
import { sources } from './sources';
import { kazanimlar } from './kazanimlar';
import { organelles } from './organelles';
import { cells } from './cells';
import { micrographs } from './micrographs';

export type * from './types';
export { sources, kazanimlar, organelles, cells, micrographs };

const byId = <T extends { id: string }>(list: T[]): Map<string, T> => new Map(list.map((item) => [item.id, item]));

const sourceMap = byId(sources);
const kazanimMap = byId(kazanimlar);
const organelleMap = byId(organelles);
const cellMap = byId(cells);

export const getSource = (id: string): Source | undefined => sourceMap.get(id);
export const getKazanim = (id: string): Kazanim | undefined => kazanimMap.get(id);
export const getOrganelle = (id: string): OrganelleInfo | undefined => organelleMap.get(id);
export const getCell = (id: CellTypeId | string): CellInfo | undefined => cellMap.get(id);

/** Organelles placed in a cell scene (placement order, de-duplicated), excluding shell parts. */
export function organellesForCell(cellId: CellTypeId | string): OrganelleInfo[] {
  const cell = cellMap.get(cellId);
  if (!cell) return [];
  const seen = new Set<string>();
  const result: OrganelleInfo[] = [];
  for (const rule of cell.placements) {
    const info = organelleMap.get(rule.organelleId);
    if (info && !seen.has(info.id)) {
      seen.add(info.id);
      result.push(info);
    }
  }
  return result;
}
