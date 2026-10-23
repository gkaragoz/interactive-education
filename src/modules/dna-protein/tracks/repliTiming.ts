import { win } from '../kit/math';

// Timing of the replication track (seconds). One fork moves along N base pairs; the leading strand is made
// continuously, the lagging strand in Okazaki fragments of FRAG nucleotides. Every pose and the chart derive from here.

export const REPLI_N = 16;
export const FRAG = 4;
export const FRAGS = REPLI_N / FRAG;

/** Time the fork reaches (starts opening) base pair i. */
export const forkTime = (i: number): number => 7 + 1.3 * i;
/** Arrival (snap) time of the leading-strand nucleotide for base pair i. */
export const leadTime = (i: number): number => 15 + 1.4 * i;
/** Time Okazaki fragment f starts being made. */
export const fragStart = (f: number): number => 17 + 5.9 * f;
/** Arrival time of the lagging-strand nucleotide for base pair i (fragments are made from their high end down). */
export function lagTime(i: number): number {
  const f = Math.floor(i / FRAG);
  const k = f * FRAG + (FRAG - 1) - i; // 0 for the first nucleotide of the fragment
  return fragStart(f) + k * 1.0;
}
/** Time the gap between fragment f and f-1 is sealed. */
export const sealTime = (f: number): number => fragStart(f) + (FRAG - 1) + 1.4;
/** Flight time of a nucleotide before it snaps on. */
export const FLY = 2.2;

export const arrival = (strand: 'lead' | 'lag', i: number): number => (strand === 'lead' ? leadTime(i) : lagTime(i));

/** How far strand pair i has opened (0 closed .. 1 open). */
export const openness = (t: number, i: number): number => win(t, forkTime(i), forkTime(i) + 1.6);

/** Number of new nucleotides attached at time t (smooth, 0..2N). */
export function attached(t: number): number {
  let n = 0;
  for (let i = 0; i < REPLI_N; i++) n += win(t, leadTime(i) - 0.2, leadTime(i) + 0.2) + win(t, lagTime(i) - 0.2, lagTime(i) + 0.2);
  return n;
}

export function repliChart(t: number): Record<string, number> {
  const k = attached(t) / (2 * REPLI_N);
  return { 'sentezlenen-dna': 100 * k, 'dna-miktari': 1 + k };
}

/** Continuous base-pair index the leading polymerase works at. */
export const leadIndex = (t: number): number => (t - leadTime(0)) / 1.4;
/** Continuous base-pair index lagging polymerase f works at. */
export const lagIndex = (t: number, f: number): number => f * FRAG + (FRAG - 1) - (t - fragStart(f));
