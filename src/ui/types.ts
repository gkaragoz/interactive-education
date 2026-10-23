import type { AppState, Catalog, QualityMode, Route } from '../core';
import type { CellTypeId, LevelId } from '../data/types';
import type { ViewMode } from '../core';

/** Everything the UI can ask the app to do. The UI never touches the stage or the store directly. */
export interface UiActions {
  selectCell(id: CellTypeId): void;
  setLevel(level: LevelId): void;
  selectOrganelle(id: string | null): void;
  toggleHidden(id: string): void;
  setViewMode(mode: ViewMode): void;
  setCut(position: number): void;
  toggleHideOthers(): void;
  toggleAutoRotate(): void;
  toggleLabels(): void;
  resetView(): void;
  screenshot(): void;
  setCompare(on: boolean): void;
  setCompareCell(id: CellTypeId): void;
  navigate(route: Route): void;
  /** Opens an animated module (or the cell explorer for `cell`). */
  openModule(id: string): void;
  openInfo(): void;
  closeInfo(): void;
  setQualityMode(mode: QualityMode): void;
}

/** A module card on the home page. */
export interface ModuleCard {
  id: string;
  nameTr: string;
  tagline: string;
  levels: LevelId[];
  /** Registered but not released: only offered with `?demo`. */
  preview: boolean;
}

export interface UpcomingCard {
  id: string;
  nameTr: string;
  tagline: string;
  version: string;
}

export interface UiContext {
  catalog: Catalog;
  actions: UiActions;
  /** Prefix for files under public/ (the Vite base). */
  baseUrl: string;
  /** The URL pins `?quality=`: the menu shows it but cannot change it. */
  qualityLocked: boolean;
  /** Modules the learner can open now (released ones, plus previews with `?demo`). */
  modules: ModuleCard[];
  /** Announced modules: shown as disabled "Yakında" cards without routes. */
  upcoming: UpcomingCard[];
  /** prefers-reduced-motion: no tip fades. */
  reducedMotion: boolean;
}

export interface Component {
  el: HTMLElement;
  update(state: AppState): void;
}

/** Micrograph files live in public/micrographs/ and `Micrograph.file` is relative to that folder. */
export function micrographSrc(baseUrl: string, file: string): string {
  return `${baseUrl}micrographs/${file.replace(/^micrographs\//, '')}`;
}

/** Display text for a license string; the data keeps the raw value ("PD", "CC0") and only the UI spells it out. */
export function licenseLabel(license: string): string {
  if (/^PD$/i.test(license.trim())) return 'Kamu malı (PD)';
  if (/^CC0(\s[\d.]+)?$/i.test(license.trim())) return `${license} (kamu malı)`;
  return license;
}
