import { KeyTrack } from './keys';
import type { Vec3 } from '../../scene';

export const CELL_CH = ['on', 'x', 'y', 'rot', 'ext', 'a', 'neck', 'gap'] as const;
export const CHR_CH = ['on', 'cell', 'side', 'x', 'y', 'z', 'rx', 'rz', 'ry', 'len', 'thick', 'bq', 'bp', 'seg', 'kin', 'att'] as const;
export const NUC_CH = ['on', 'cell', 'x', 'y', 'z', 'r', 'integ', 'scat', 'nucl'] as const;
export const POLE_CH = ['size', 'cell', 'ang', 'rad', 'z', 'aster'] as const;
export const SPN_CH = ['ip', 'ovl'] as const;
export const CAM_CH = ['px', 'py', 'pz', 'tx', 'ty', 'tz'] as const;

export interface ChromMeta {
  pair: number;
  /** 0 maternal, 1 paternal. */
  h: number;
  /** Sister chromatid index 0/1. */
  s: number;
  tint: string;
  alt: string;
  /** Segment that was exchanged in crossing over: hi bound is animated through the `seg` channel. */
  phase: number;
}

export interface LabelCtx {
  level: 'temel' | 'ileri';
  t: number;
  /** Cell-local to world transform for track `cell`. */
  chromPos(i: number, out: Vec3): Vec3;
  kineto(i: number, out: Vec3): Vec3;
  polePos(i: number, out: Vec3): Vec3;
  nucPos(i: number, out: Vec3): Vec3;
  cellPos(i: number, lx: number, ly: number, out: Vec3): Vec3;
  chromVals(i: number): Float32Array;
  cellVals(i: number): Float32Array;
  poleVals(i: number): Float32Array;
  nucVals(i: number): Float32Array;
  looseVal: number;
}

export type LabelFn = (c: LabelCtx) => { text: string; world: Vec3; anchorId: string }[];

/** Everything a track animates, as keyframe tables, plus its chart, labels and camera. */
export class Plan {
  duration = 0;
  cells: KeyTrack[] = [];
  chr: KeyTrack[] = [];
  meta: ChromMeta[] = [];
  nuc: KeyTrack[] = [];
  poles: KeyTrack[] = [];
  spn: KeyTrack[] = [];
  loose!: KeyTrack;
  cam!: KeyTrack;
  chart: (t: number) => Record<string, number> = () => ({});
  labels: LabelFn = () => [];
  /** Times at which sister chromatids of chromosome `[pair,h]` are separate centromeres (for counting). */
  splitAt = new Map<string, number>();
  /** Crossing-over contacts to mark: pair index, time window and chromatid ids. */
  chiasmata: { pair: number; t0: number; t1: number; ids: [number, number] }[] = [];
  /** Cell rings (furrow): which cells show the contractile ring and when. */
  furrow: { cell: number; t0: number; t1: number }[] = [];
  np = 2;
  /** Window (track time) in which the alternative metaphase I orientation is shown as a small inset. */
  ghostWin: [number, number] | null = null;
}
