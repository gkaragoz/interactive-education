import type { CellInfo, CellTypeId, Kazanim, LevelId, Micrograph, OrganelleInfo, Source } from '../data/types';

export interface DataBundle {
  sources: readonly Source[];
  kazanimlar: readonly Kazanim[];
  organelles: readonly OrganelleInfo[];
  cells: readonly CellInfo[];
  micrographs: readonly Micrograph[];
}

/** Display name without the trailing parenthetical alias, e.g. "Plazmit (plazmid)" -> "Plazmit". */
export function shortName(nameTr: string): string {
  return nameTr.replace(/\s*\([^)]*\)\s*$/, '') || nameTr;
}

export interface CellComparison {
  shared: string[];
  onlyA: string[];
  onlyB: string[];
}

/** Indexed, read-only view of the content data with the cross-reference checks the tests rely on. */
export class Catalog {
  readonly sourceById: ReadonlyMap<string, Source>;
  readonly kazanimById: ReadonlyMap<string, Kazanim>;
  readonly organelleById: ReadonlyMap<string, OrganelleInfo>;
  readonly cellById: ReadonlyMap<string, CellInfo>;
  readonly micrographById: ReadonlyMap<string, Micrograph>;

  constructor(readonly data: DataBundle) {
    this.sourceById = new Map(data.sources.map((s) => [s.id, s]));
    this.kazanimById = new Map(data.kazanimlar.map((k) => [k.id, k]));
    this.organelleById = new Map(data.organelles.map((o) => [o.id, o]));
    this.cellById = new Map(data.cells.map((c) => [c.id, c]));
    this.micrographById = new Map(data.micrographs.map((m) => [m.id, m]));
  }

  cell(id: CellTypeId): CellInfo {
    const cell = this.cellById.get(id);
    if (!cell) throw new Error(`Unknown cell type: ${id}`);
    return cell;
  }

  /** Every organelle id that appears in a cell scene: shell parts first, then placements in rule order. */
  organelleIdsOf(cell: CellInfo): string[] {
    return [...new Set([...cell.shellOrganelleIds, ...cell.placements.map((p) => p.organelleId)])];
  }

  /** An organelle is shown at a level only when it lists the level and has the text for it. */
  availableAt(info: OrganelleInfo, level: LevelId): boolean {
    return info.levels.includes(level) && info.text[level] !== undefined;
  }

  organellesOf(cell: CellInfo, level?: LevelId): OrganelleInfo[] {
    return this.organelleIdsOf(cell).flatMap((id) => {
      const info = this.organelleById.get(id);
      return info && (!level || this.availableAt(info, level)) ? [info] : [];
    });
  }

  micrographsOf(cell: CellInfo): Micrograph[] {
    return cell.micrographIds.flatMap((id) => {
      const m = this.micrographById.get(id);
      return m ? [m] : [];
    });
  }

  /** Organelles both cells have, and those only one has (by id, shell parts excluded). */
  compare(a: CellInfo, b: CellInfo): CellComparison {
    const own = (c: CellInfo): string[] => c.placements.map((p) => p.organelleId).filter((id, i, all) => all.indexOf(id) === i);
    const ids = { a: own(a), b: own(b) };
    return {
      shared: ids.a.filter((id) => ids.b.includes(id)),
      onlyA: ids.a.filter((id) => !ids.b.includes(id)),
      onlyB: ids.b.filter((id) => !ids.a.includes(id)),
    };
  }

  /** Sources actually cited by something (organelle, cell, kazanım, micrograph). Used to list the bibliography. */
  citedSourceIds(): Set<string> {
    const ids = new Set<string>();
    for (const o of this.data.organelles) o.sourceIds.forEach((id) => ids.add(id));
    for (const c of this.data.cells) c.sourceIds.forEach((id) => ids.add(id));
    for (const k of this.data.kazanimlar) ids.add(k.sourceId);
    for (const m of this.data.micrographs) ids.add(m.sourceId);
    return ids;
  }

  /** Cross-reference problems; an empty list means the data is consistent. */
  validate(): string[] {
    const issues: string[] = [];
    for (const o of this.data.organelles) {
      if (o.sourceIds.length === 0) issues.push(`organelle ${o.id} has no source`);
      if (o.kazanimIds.length === 0) issues.push(`organelle ${o.id} has no kazanım`);
      for (const id of o.sourceIds) if (!this.sourceById.has(id)) issues.push(`organelle ${o.id}: unknown source ${id}`);
      for (const id of o.kazanimIds) if (!this.kazanimById.has(id)) issues.push(`organelle ${o.id}: unknown kazanım ${id}`);
    }
    for (const c of this.data.cells) {
      for (const p of c.placements) if (!this.organelleById.has(p.organelleId)) issues.push(`cell ${c.id}: no data for placed organelle ${p.organelleId}`);
      for (const id of c.shellOrganelleIds) if (!this.organelleById.has(id)) issues.push(`cell ${c.id}: no data for shell part ${id}`);
      for (const id of c.micrographIds) if (!this.micrographById.has(id)) issues.push(`cell ${c.id}: unknown micrograph ${id}`);
      for (const id of c.sourceIds) if (!this.sourceById.has(id)) issues.push(`cell ${c.id}: unknown source ${id}`);
      for (const id of c.kazanimIds) if (!this.kazanimById.has(id)) issues.push(`cell ${c.id}: unknown kazanım ${id}`);
    }
    for (const k of this.data.kazanimlar) if (!this.sourceById.has(k.sourceId)) issues.push(`kazanım ${k.id}: unknown source ${k.sourceId}`);
    for (const m of this.data.micrographs) if (!this.sourceById.has(m.sourceId)) issues.push(`micrograph ${m.id}: unknown source ${m.sourceId}`);
    return issues;
  }
}
