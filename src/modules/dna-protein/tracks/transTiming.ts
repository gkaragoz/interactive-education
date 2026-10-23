import { lerp } from '../kit/math';

// Timing of the transcription track. The polymerase position p (in base pairs, continuous) moves along the gene;
// nucleotide j of the mRNA is added when p reaches j + 0.5. Initiation (first three) is slower than elongation.

export const TRANS_N = 15;
export const FLY_T = 1.8;

export const addTime = (j: number): number => (j < 3 ? 10.8 + 1.2 * j : 14.5 + 1.23 * (j - 3));

const KNOTS: [number, number][] = [
  [0, 0.5],
  ...Array.from({ length: TRANS_N }, (_, j) => [addTime(j), j + 0.5] as [number, number]),
  [32.5, TRANS_N + 3],
];

/** Polymerase position (base pair index, fractional). */
export function polPos(t: number): number {
  const first = KNOTS[0] as [number, number];
  if (t <= first[0]) return first[1];
  for (let i = 1; i < KNOTS.length; i++) {
    const b = KNOTS[i] as [number, number];
    if (t <= b[0]) {
      const a = KNOTS[i - 1] as [number, number];
      return lerp(a[1], b[1], (t - a[0]) / (b[0] - a[0]));
    }
  }
  return (KNOTS[KNOTS.length - 1] as [number, number])[1];
}

/** Time at which the polymerase is at position `v`. */
export function timeAtPos(v: number): number {
  for (let i = 1; i < KNOTS.length; i++) {
    const a = KNOTS[i - 1] as [number, number];
    const b = KNOTS[i] as [number, number];
    if (v <= b[1]) return lerp(a[0], b[0], (v - a[1]) / (b[1] - a[1] || 1));
  }
  return (KNOTS[KNOTS.length - 1] as [number, number])[0];
}

/** Number of mRNA nucleotides added at time t (smooth). */
export function addedCount(t: number): number {
  let n = 0;
  for (let j = 0; j < TRANS_N; j++) {
    const k = (t - (addTime(j) - 0.25)) / 0.5;
    n += k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
  }
  return n;
}

export const transChart = (t: number): Record<string, number> => ({ 'mrna-uzunlugu': addedCount(t) });
