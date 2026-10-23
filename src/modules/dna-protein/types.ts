import type { Group } from 'three';
import type { LevelId } from '../../data/types';
import type { ModuleAssets, ModuleContext, ModuleLabel, Vec3 } from '../../scene';

export interface TrackEnv {
  ctx: ModuleContext;
  root: Group;
  lib: ModuleAssets['materials'];
  level: LevelId;
  /** The ileri level shows extra detail and technical words. */
  ileri: boolean;
  options: Record<string, string>;
}

/** What a track gives the scene wrapper: all functions are pure in `t`. */
export interface TrackRuntime {
  duration: number;
  seek(t: number): void;
  cameraAt(t: number): { position: Vec3; target: Vec3 };
  labelsAt(t: number): ModuleLabel[];
  chartAt(t: number): Record<string, number>;
  setOptions?(options: Record<string, string>): void;
  dispose(): void;
}
