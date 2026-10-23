import type { CellInfo, CellTypeId, OrganelleInfo } from '../data/types';
import type { QualityName } from '../core';

export interface StageData {
  cell(id: CellTypeId): CellInfo;
  organelles: ReadonlyMap<string, OrganelleInfo>;
}

export interface StageOptions {
  container: HTMLElement;
  baseUrl: string;
  quality: QualityName;
  data: StageData;
  reducedMotion: boolean;
  /** Let the adaptive governor step the quality preset down and up (off when the URL fixes `?quality=`). */
  autoQuality: boolean;
}

export interface ViewState {
  selectedId: string | null;
  hidden: ReadonlySet<string>;
  viewMode: 'full' | 'cutaway' | 'isolate';
  hideOthers: boolean;
  cutPosition: number;
  labels: boolean;
  autoRotate: boolean;
}

export interface StageStats {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  /** Preset in force (the governor may change it). */
  quality: QualityName;
}

export interface StageEvents {
  /** The user clicked an organelle (id) or empty space / the selected one again (null). */
  select(id: string | null): void;
  hover(id: string | null): void;
  /** Loading progress 0..1, or null when done. */
  loading(fraction: number | null): void;
  stats(stats: StageStats): void;
  /** A model file was missing or broken and a simple shape is shown instead. */
  fallback(id: string): void;
  /** The graphics connection was lost (true) or came back (false). */
  connection(lost: boolean): void;
  /** The adaptive governor changed the quality preset. */
  quality(level: QualityName): void;
}
