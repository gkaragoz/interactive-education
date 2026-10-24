import type { Group } from 'three';
import type { LabSim } from '../chemlab';
import type { ModuleInfo, SimInfo } from '../data/moduleTypes';
import type { LevelId } from '../data/types';
import type { ModuleAssets } from './moduleAssets';
import type { ModuleLabel, ModuleScene, QualityPreset, Vec3 } from './moduleScene';
import type { StageFraming } from './stageFraming';

/** Typed parameter shown as a slider (docs/SIMS.md). */
export interface SimParam {
  id: string;
  labelTr: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  default: number;
  lockedInChallenge?: boolean;
}

export interface SimMeasurement {
  id: string;
  labelTr: string;
  value: number | string;
  unit?: string;
}

/** What the pointer is on: the nearest object (or ancestor) whose `userData.simId` is a string. */
export interface SimHit {
  id: string;
  /** World position of the ray hit. */
  point: Vec3;
  /** The object that carries `userData.simId`. */
  distance: number;
}

/**
 * Pointer input from the host. The host raycasts against `pickRoots` (default `[root]`), so the scene only tags objects
 * with `userData.simId`. A `down` on a hit starts a drag: the host captures the pointer, disables the orbit camera and
 * sends `move` events with `world` on a horizontal plane through the grab point (raised by `dragLift`, so a held vessel
 * floats above the bench) until `up` or `cancel`. Without a drag, the host sends `hover` when the hit changes.
 */
export interface SimPointerEvent {
  type: 'down' | 'move' | 'up' | 'cancel' | 'hover';
  pointerId: number;
  /** The object under the pointer now (for `move` during a drag: still the dragged object under the ray, or null). */
  hit: SimHit | null;
  /** Id grabbed by the `down` of the current drag (set on move, up and cancel), else null. */
  dragId: string | null;
  /** Pointer position on the drag plane (during a drag) or on the bench plane y = `benchY` (otherwise). */
  world: Vec3;
  ray: { origin: Vec3; direction: Vec3 };
  button: number;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
}

/** Keyboard and menu alternative to drag and drop (WCAG 2.1.1): pick an item, pick a command, pick a target, confirm. */
export interface SimItem {
  id: string;
  labelTr: string;
  /** Group heading in lists, e.g. 'Kaplar', 'Reaktifler'. */
  group: string;
  hintTr?: string;
}
export interface SimCommand {
  id: string;
  labelTr: string;
  /** Needs a target item from `targets` (empty = no target). */
  targets?: SimItem[];
  /** Needs a number (mL, g, drops, volts, seconds). */
  amount?: { min: number; max: number; step: number; default: number; unit: string };
  /** Needs a choice from a short list (closure kind, heat source, gas test). */
  choices?: { id: string; labelTr: string }[];
}
export interface SimActionResult {
  ok: boolean;
  messageTr?: string;
  /** Present when the engine refused a dangerous action: shown as a safety card. */
  blockedTitleTr?: string;
}
export interface SimInteractions {
  items(): SimItem[];
  commands(itemId: string): SimCommand[];
  run(itemId: string, commandId: string, args: { targetId?: string; amount?: number; choice?: string }): SimActionResult;
}

/**
 * An interactive sandbox with fixed-step state (docs/SIMS.md). The logic is pure and deterministic; the scene draws it.
 * The host steps it with `SimClock` (1/60 s, or stretched at time-lapse), calls `sync` once per drawn frame and never
 * touches the clock inside the scene. Rendering must not change simulation state.
 */
export interface SimScene {
  readonly root: Group;
  /** Framing box and orbit limits (read when the sim is shown and after `loadExperiment`); default: the bounding sphere of `root`. */
  camera?: StageFraming;
  /** Objects the host raycasts for pointer input; default `[root]`. */
  pickRoots?: () => Group[];
  /** Height of the bench top (world y) for the pointer plane when nothing is grabbed. Default 0. */
  benchY?: number;
  /** How far a held object floats above the grab point (world units). Default 0. */
  dragLift?: number;
  params: SimParam[];
  /** One fixed step of `dt` simulated seconds (deterministic: seeded RNG only, no wall clock). */
  step(dt: number): void;
  /** Once per drawn frame after the steps, with the real frame time: update meshes, decorative motion (skip when reduced motion). */
  sync?(frameSeconds: number): void;
  setParam(id: string, value: number): void;
  reset(values?: Record<string, number>): void;
  measurements(): SimMeasurement[];
  snapshot(): unknown;
  restore(s: unknown): void;
  pointer?(ev: SimPointerEvent): void;
  /** The object under the pointer changed (or null): draw the highlight. */
  setHover?(id: string | null): void;
  /** Keyboard focus moved to this item (or null): draw the same highlight. */
  setFocus?(id: string | null): void;
  labels?(): ModuleLabel[];
  interactions?: SimInteractions;
  dispose(): void;
}

/** The chemistry lab's scene: a SimScene around a `LabSim` engine; the lab UI shell reads and drives the engine through it. */
export interface LabSimScene extends SimScene {
  readonly lab: LabSim;
  /** Loads an experiment's bench (null = the free bench): rebuilds the vessels. The engine state restarts at t = 0. */
  loadExperiment(id: string | null): void;
  /** Soft flash filter ("yumuşak parlama"): the render layer rate-limits flashes either way. */
  setSoftFlash?(on: boolean): void;
}

export interface SimContext {
  assets: ModuleAssets;
  quality: QualityPreset;
  level: LevelId;
  reducedMotion: boolean;
  rng(seed: number): () => number;
  /** Experiment to open first (guided mode) or null for the free bench. */
  experimentId: string | null;
  /** "Yumuşak parlama" setting at creation time. */
  softFlash: boolean;
}

export interface SimDefinition {
  id: string;
  /** Lazy chunk: info and scene code are fetched when the module is opened. */
  load(): Promise<{
    info: SimInfo;
    /** Timeline content for "Nedenini göster": tracks whose ids are experiment ids (phase texts per level, charts, checks, predicts). */
    timeline?: ModuleInfo;
    createSim(ctx: SimContext): Promise<SimScene>;
    /** Optional 3D particle explainer for "Nedenini göster": a timeline scene built from a `ParticleScript` id. */
    createExplainer?(ctx: SimContext, scriptId: string): Promise<ModuleScene>;
  }>;
}
