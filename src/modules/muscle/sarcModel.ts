import { evalKeys, hash01, lerp, smooth, type Keys } from './math';

// Sarcomere model values (model micrometres, as in the data): rest 2.4, fully contracted 2.0.
// A band = thick filament length (constant), I = L - A, H = L - 2 * thin length (0 at full contraction).
export const REST_L = 2.4;
export const FULL_L = 2.0;
export const A_LEN = 1.6;
export const THIN_LEN = 1.0;
/** Distance between myosin-binding sites along the thin filament, and the fraction of a cycle spent pulling. */
export const SITE = 0.12;
export const PULL = 0.55;

/** Contraction 0..1 of the `kasilma` track: rest until 10 s, shortening to 24 s, held to 28 s, relaxing to 38 s. */
export const CONTRACTION: Keys = [[0, 0], [10, 0], [24, 1], [28, 1], [38, 0], [40, 0]];
/** Share of heads that are working (they engage when the shortening starts and let go as the muscle relaxes). */
export const ENGAGE: Keys = [[0, 0], [10, 0], [10.9, 1], [27.5, 1], [29, 0], [40, 0]];

export interface SarcState {
  /** 0 rest, 1 fully contracted. */
  c: number;
  L: number;
  A: number;
  I: number;
  H: number;
  /** How far each thin filament has slid toward the centre. */
  slide: number;
  engage: number;
}

export function sarcFromContraction(c: number, engage: number): SarcState {
  const L = lerp(REST_L, FULL_L, c);
  return { c, L, A: A_LEN, I: L - A_LEN, H: Math.max(0, L - 2 * THIN_LEN), slide: (REST_L - L) / 2, engage };
}

export const sarcAt = (t: number): SarcState => sarcFromContraction(evalKeys(CONTRACTION, t), evalKeys(ENGAGE, t));

/** Fractions of the I zone (from the Z line to the A band) are `I / 2` on each side of a sarcomere. */
export const halfI = (s: SarcState): number => s.I / 2;

export interface HeadPose {
  /** Axial offset of the head tip from its base, positive toward the Z line. */
  delta: number;
  /** How far the head is lifted off the thin filament (0 = touching). */
  lift: number;
  attached: boolean;
}

const REST_POSE: HeadPose = { delta: 0.05, lift: 0.045, attached: false };

/**
 * Pose of one myosin head. The cycle phase advances with the thin filament's travel (u = slide / SITE), so while a head
 * is attached its tip stays on the same actin site: attached heads pull, detached heads swing back to the next site.
 */
export function headPose(slide: number, offset: number, engage: number): HeadPose {
  const x = slide / SITE + offset;
  const f = x - Math.floor(x);
  let cycle: HeadPose;
  if (f < PULL) cycle = { delta: SITE * (PULL / 2 - f), lift: 0, attached: true };
  else {
    const s = (f - PULL) / (1 - PULL);
    const e = smooth(s);
    cycle = { delta: SITE * PULL * (-0.5 + e), lift: Math.sin(Math.PI * s) * 0.05, attached: false };
  }
  if (engage >= 0.999) return cycle;
  return { delta: lerp(REST_POSE.delta, cycle.delta, engage), lift: lerp(REST_POSE.lift, cycle.lift, engage), attached: cycle.attached && engage > 0.5 };
}

/** Deterministic phase offset of head `i` (spread over the whole cycle so the heads are never in step). */
export const headOffset = (i: number): number => hash01(i * 7 + 3);
