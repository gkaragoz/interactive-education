import type { Group } from 'three';
import type { QualityName } from '../core';
import type { ModuleId, ModuleInfo } from '../data/moduleTypes';
import type { LevelId } from '../data/types';
import type { ModuleAssets } from './moduleAssets';

export type Vec3 = [number, number, number];

/** Quality preset a module scene builds for (it may use fewer instances or lighter meshes at `low`). */
export type QualityPreset = QualityName;

export interface ModuleContext {
  /** Loads the module's GLBs (`public/models/modules/<id>.glb`) with the shared painted materials and builds instanced sets. */
  assets: ModuleAssets;
  quality: QualityPreset;
  level: LevelId;
  reducedMotion: boolean;
  trackId: string;
  /** Chosen ModuleOption values, e.g. `{ 'chromosome-set': '2n4' }`. */
  options: Record<string, string>;
  /** Seeded random numbers: the same seed always gives the same sequence (a scene must be deterministic). */
  rng(seed: number): () => number;
}

export interface ModuleLabel {
  text: string;
  world: Vec3;
  /** Stable id for labels that follow one object (keeps the label element between frames). */
  anchorId?: string;
}

/**
 * A module scene is a pure function of time: `seek(t)` poses everything for t seconds (at speed 1), cheap and
 * deterministic, so scrubbing, stepping and reverse play all work. No wall clock, no accumulated state.
 */
export interface ModuleScene {
  readonly root: Group;
  /** Equals `TrackInfo.duration`. */
  readonly duration: number;
  seek(t: number): void;
  /** Optional cinematic camera path; the learner can override it by orbiting (it then stays manual until a preset or reset). */
  cameraAt?(t: number): { position: Vec3; target: Vec3 };
  labelsAt?(t: number): ModuleLabel[];
  /** Replaces the interpolated chart values (series id -> value). */
  chartAt?(t: number): Record<string, number>;
  setOptions?(options: Record<string, string>): void;
  dispose(): void;
}

export interface ModuleDefinition {
  id: ModuleId | string;
  /** Lazy chunk: the module's data and scene code are only fetched when the module is opened. */
  load(): Promise<{ info: ModuleInfo; createScene(ctx: ModuleContext): Promise<ModuleScene> }>;
}

/** Deterministic random numbers (Mulberry32) for `ModuleContext.rng`. */
export { mulberry32 as seededRng } from '../core';
