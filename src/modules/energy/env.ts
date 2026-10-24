import type { Group } from 'three';
import type { LevelId } from '../../data/types';
import type { ModuleContext, ModuleLabel, Vec3 } from '../../scene';
import type { Trip } from './flock';
import type { Shot } from './math';

/** What a station builder gets: the context, its group (static props go here) and a list to dispose. */
export interface Env {
  ctx: ModuleContext;
  group: Group;
  own: Array<{ dispose(): void }>;
  level: LevelId;
}

/** A station may animate its own props (spinning rotors, rays) as a pure function of t. */
export interface StationRt {
  animate?(t: number, plan?: Plan): void;
}
export type StationBuilder = (env: Env) => Promise<StationRt | void>;

export interface LabelRule {
  id: string;
  t0: number;
  t1: number;
  text: string | { temel?: string; ileri?: string };
  at: Vec3;
}

/** One track = stations (scenery) + trips (molecules) + camera + labels + chart, as pure data/functions. */
export interface Plan {
  duration: number;
  /** The station shown from `t0` on (sorted by t0). */
  windows: readonly { station: number; t0: number }[];
  /** Times of the fade-through-cream cuts between stations. */
  swaps: readonly number[];
  trips: readonly Trip[];
  shots: readonly Shot[];
  labels: readonly LabelRule[];
  chart(t: number): Record<string, number>;
  /** Molecules shown in the colour key (a small fixed sprite); none = no key. */
  legend?: readonly import('./legend').LegendId[];
  /** Stations drawn upside down (y mirrored): lets a membrane be authored one way and shown the other (camera and labels stay in world space). */
  mirrored?: readonly number[];
  /** Option-dependent numbers the stations read (lamp distance, bubble counts). */
  extras?: Record<string, number>;
}

export type { ModuleLabel };
