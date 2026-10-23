import type { Trip } from '../flock';
import { go } from '../paths';

/** Station indices of the respiration track. */
export const R_CELL = 0;
export const R_MITO = 1;
export const R_MATRIX = 2;
export const R_MEMB = 3;

/** Positions inside the cut-open mitochondrion station (R1). */
export const G = [-5.5, 0.8, 0.3] as const;
export const PYR_A = [-6.6, 2.1, 0.3] as const;
export const PYR_B = [-6.6, -0.5, 0.3] as const;
export const POOL = [-8.6, 4.6, 0.6] as const;
/** Mitochondrion entrance in R1 (where the pyruvates cross). */
export const TIP = [-1.3, 0.2, 0.3] as const;

/** Matrix close-up (R2). */
export const KREBS = [2.4, 0.0, 0.4] as const;
export const KREBS_R = 1.5;
export const MAT_A = [-3.8, 1.5, 0.3] as const;
export const MAT_B = [-3.8, -1.3, 0.3] as const;
export const POOL2 = [-7.8, 4.8, 0.6] as const;

/** Positions along the inner membrane station (R3), y = 0 is the membrane, intermembrane space above, matrix below. */
export const MX = { c1: -7.8, c2: -4.4, c3: -0.9, c4: 2.7, synth: 7.6 } as const;

/** Offsets of the three carbons of a pyruvate chain. */
export const CHAIN: readonly (readonly [number, number, number])[] = [
  [-0.45, 0, 0],
  [0, 0.22, 0],
  [0.45, 0, 0],
];

export const SLATE = '#6a645f';

export const add = (p: readonly number[], o: readonly number[]): [number, number, number] => [p[0]! + o[0]!, p[1]! + o[1]!, p[2]! + o[2]!];

/** A carbon bead trip (tinted slate) with the given waypoints. */
export const bead = (station: number, keys: Parameters<typeof go>[3], o: Partial<Trip> = {}): Trip => go('carbon', station, 0.3, keys, { tint: SLATE, fade: 0.3, wobble: 0.03, ...o });
