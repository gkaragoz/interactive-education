import { win } from '../kit/math';

// Timing of the translation track (seconds). Codon k = 0 is the start codon (initiator tRNA at the P site); every later
// codon k gets an elongation cycle of CYCLE seconds: tRNA arrives at the A site, pairs, peptide bond, translocation.
// The stop codon (index = number of amino acids) gets the termination cycle.

export const T_SMALL = [1.0, 5.0] as const; // small subunit flies in
export const T_SCAN = [6.0, 10.5] as const; // mRNA slides until the start codon is at the P site
export const T_LARGE = [8.2, 10.8] as const; // large subunit joins
export const T_INIT = [11.0, 14.2] as const; // initiator tRNA arrives at the P site
export const CYCLE = 8;
export const CYCLE0 = 16;
export const CODON_PITCH = 1.5;

export const cycleStart = (k: number): number => CYCLE0 + CYCLE * (k - 1);
export const dockTime = (k: number): number => cycleStart(k) + 2.4;
export const bondTime = (k: number): number => cycleStart(k) + 4.2;
export const moveTime = (k: number): number => cycleStart(k) + 5.2;
export const MOVE_LEN = 1.8;
/** Translocation progress of cycle k (0..1). */
export const moveProgress = (t: number, k: number): number => win(t, moveTime(k), moveTime(k) + MOVE_LEN);

/** Total slide of the mRNA through the ribosome (in codon pitches) after the first `n` translocations. */
export function slide(t: number, aminoAcids: number): number {
  let s = 0;
  for (let k = 1; k < aminoAcids; k++) s += moveProgress(t, k);
  return s * CODON_PITCH;
}

export interface Times {
  stopStart: number;
  release: number;
  leave: number;
  separate: number;
}

/** Termination times for a peptide with `n` amino acids. */
export function stopTimes(n: number): Times {
  const stopStart = cycleStart(n);
  return { stopStart, release: stopStart + 3.6, leave: stopStart + 4.2, separate: stopStart + 6.4 };
}

/** Time tRNA k leaves the ribosome (after it passed the E site), for `n` amino acids. */
export function exitTime(k: number, n: number): number {
  if (k + 1 <= n - 1) return moveTime(k + 1) + MOVE_LEN + 0.9;
  return stopTimes(n).release + 0.6;
}

/** Number of amino acids joined to the chain at time t (smooth). */
export function chainLength(t: number, n: number): number {
  let c = win(t, 13.4, 14.4);
  for (let k = 1; k < n; k++) c += win(t, bondTime(k) - 0.3, bondTime(k) + 0.3);
  return c;
}
